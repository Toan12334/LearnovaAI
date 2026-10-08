"""
Plagiarism Pipeline Orchestrator (Core Business Logic)
Thực hiện trọn vẹn quy trình đối soát đạo văn 6 bước:
1. Lưu bài viết gốc vào Supabase documents (status='pending').
2. Tách câu qua TextCleaner thành N câu.
3. Lưu N câu vào Supabase document_chunks để lấy danh sách chunk_id.
4. Tạo N vector qua EmbeddingService (FastEmbed).
5. Lưu N vectors + chunk_id + content vào Vector DB Qdrant.
6. Quét đối soát qua Qdrant (nội bộ) & Serper (web), lưu kết quả vào plagiarism_matches và hoàn tất document.
"""

import uuid
import re
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any, Dict, List, Optional, Tuple
import numpy as np
from qdrant_client.http.models import PointStruct

from src.core.config import settings
from src.core.logging import logger
from src.db.supabase_client import get_supabase_client
from src.db.qdrant_client import qdrant_service
from src.utils.text_cleaner import TextCleaner
from src.services.embedding import embedding_service
from src.services.search.web_search import web_search_service
from src.services.plagiarism.winnowing import WinnowingDetector


class PlagiarismPipeline:
    def __init__(self):
        self._supabase = None
        self.cleaner = TextCleaner()
        self.embedder = embedding_service
        self.qdrant = qdrant_service
        self.searcher = web_search_service
        self.winnowing = WinnowingDetector()
        self._snippet_cache: Dict[str, List[float]] = {}
        self._cache_lock = threading.Lock()
        self._jobs: Dict[str, Dict[str, Any]] = {}
        self._jobs_lock = threading.Lock()

    def update_job_progress(
        self,
        document_id: str,
        progress: int,
        step_desc: str,
        status: str = "processing",
        extra: Optional[Dict[str, Any]] = None,
    ):
        """Cập nhật tiến trình thời gian thực cho task đối soát."""
        with self._jobs_lock:
            job = self._jobs.setdefault(document_id, {})
            job["document_id"] = document_id
            job["progress_percentage"] = progress
            job["current_step"] = step_desc
            job["status"] = status
            if extra:
                job.update(extra)

    def get_job_status(self, document_id: str) -> Optional[Dict[str, Any]]:
        """Lấy trạng thái tiến trình thời gian thực hoặc tra cứu từ Supabase."""
        with self._jobs_lock:
            if document_id in self._jobs:
                return dict(self._jobs[document_id])

        # Tra cứu từ Supabase nếu không có trong memory
        try:
            doc_res = (
                self.supabase.table("documents")
                .select("*")
                .eq("id", document_id)
                .execute()
            )
            if doc_res.data:
                d = doc_res.data[0]
                status = d.get("status", "completed")
                return {
                    "document_id": document_id,
                    "title": d.get("title"),
                    "status": status,
                    "progress_percentage": 100 if status == "completed" else 50,
                    "current_step": "Hoàn tất" if status == "completed" else "Đang xử lý",
                    "word_count": d.get("word_count", 0),
                    "plagiarism_score": d.get("plagiarism_score", 0.0),
                    "created_at": d.get("created_at"),
                }
        except Exception as exc:
            logger.warning(f"Lỗi truy vấn job status từ Supabase cho {document_id}: {exc}")

        return None

    @property
    def supabase(self):
        if self._supabase is None:
            self._supabase = get_supabase_client()
        return self._supabase

    @staticmethod
    def _compute_cosine(v1: List[float], v2: List[float]) -> float:
        """Tính Cosine Similarity giữa 2 vector."""
        a = np.array(v1, dtype=np.float32)
        b = np.array(v2, dtype=np.float32)
        norm_a = np.linalg.norm(a)
        norm_b = np.linalg.norm(b)
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return float(np.dot(a, b) / (norm_a * norm_b))

    def _get_snippet_embedding(self, text: str) -> List[float]:
        """Lấy embedding cho snippet web có bộ nhớ đệm cache thread-safe."""
        clean = text.strip()
        if not clean:
            return []
        with self._cache_lock:
            if clean in self._snippet_cache:
                return self._snippet_cache[clean]

        vec = self.embedder.embed_text(clean)
        with self._cache_lock:
            if len(self._snippet_cache) > 2000:
                self._snippet_cache.clear()
            self._snippet_cache[clean] = vec
        return vec

    def _match_single_chunk(
        self,
        idx: int,
        chunk: Dict[str, Any],
        vector: List[float],
        document_id: str,
        user_id: Optional[str],
        threshold: float,
        enable_web_search: bool,
    ) -> Tuple[int, List[Dict[str, Any]]]:
        """Xử lý quét Qdrant và Serper cho 1 chunk độc lập (Hỗ trợ đa luồng)."""
        chunk_id = chunk["id"]
        chunk_text = chunk["content"]
        chunk_clean = re.sub(r"[^\w\s]", "", chunk_text.lower()).strip()
        chunk_matches: List[Dict[str, Any]] = []

        # 1. Quét trong Qdrant
        try:
            qdrant_results = self.qdrant.search_similar_chunks(
                query_vector=vector,
                top_k=3,
                score_threshold=threshold,
                exclude_document_id=document_id,
                exclude_user_id=user_id,
            )
            for qr in qdrant_results:
                qr_content = qr.get("content") or ""
                qr_clean = re.sub(r"[^\w\s]", "", qr_content.lower()).strip()
                w_sim = self.winnowing.calculate_similarity(chunk_text, qr_content)

                if (
                    chunk_clean == qr_clean
                    or (chunk_clean and chunk_clean in qr_clean)
                    or w_sim >= 0.70
                ):
                    q_sim = 1.0
                    match_type = "EXACT"
                else:
                    q_sim = round(float(qr["similarity_score"]), 4)
                    match_type = (
                        "EXACT"
                        if q_sim >= getattr(settings, "INTERNET_EXACT_THRESHOLD", 0.90)
                        else "PARAPHRASED"
                    )

                chunk_matches.append({
                    "chunk_id": chunk_id,
                    "source_type": "internal_db",
                    "matched_document_id": qr["document_id"],
                    "matched_url": None,
                    "matched_text": qr_content,
                    "similarity_score": q_sim,
                    "match_type": match_type,
                })
        except Exception as e:
            logger.warning(f"Lỗi khi quét Qdrant cho câu #{idx}: {e}")

        # 2. Quét qua Serper (Web search)
        clean_for_search = chunk_text.strip(".,;:!?…'\"-—()[] \t\n")
        if enable_web_search and len(clean_for_search) >= 8:
            try:
                if len(clean_for_search) >= 12:
                    query_term = f'"{clean_for_search[:80]}"'
                else:
                    query_term = clean_for_search

                web_results = self.searcher.search_query_sync(query=query_term, top_k=3)

                if not web_results and len(clean_for_search) > 30:
                    web_results = self.searcher.search_query_sync(query=clean_for_search[:90], top_k=3)

                if web_results:
                    best_match = None
                    best_score = 0.0

                    for web_item in web_results:
                        title = web_item.get("title", "")
                        snippet = web_item.get("snippet", "")
                        if not snippet and not title:
                            continue

                        combined_source = f"{title} {snippet}"
                        source_clean = re.sub(r"[^\w\s]", "", combined_source.lower()).strip()
                        win_sim = self.winnowing.calculate_similarity(chunk_text, combined_source)

                        is_exact_match = (
                            chunk_clean in source_clean
                            or (len(chunk_clean) >= 15 and source_clean in chunk_clean)
                            or win_sim >= 0.75
                        )

                        c_words = chunk_clean.split()
                        s_words = set(source_clean.split())
                        word_overlap = (
                            sum(1 for w in c_words if w in s_words) / len(c_words)
                            if c_words
                            else 0.0
                        )

                        # Tối ưu hóa tính điểm tương đồng và phân loại loại hình đạo văn:
                        if is_exact_match:
                            score = 1.0
                            m_type = "EXACT"
                        elif word_overlap >= 0.85:
                            score = round(min(1.0, 0.90 + (word_overlap - 0.85) * 0.6), 4)
                            m_type = "EXACT" if score >= 0.90 else "PARAPHRASED"
                        elif word_overlap < 0.20:
                            score = 0.0
                            m_type = "PARAPHRASED"
                        else:
                            snippet_vec = self._get_snippet_embedding(snippet or title)
                            sim_score = self._compute_cosine(vector, snippet_vec) if snippet_vec else 0.0

                            if word_overlap >= 0.70:
                                score = round(max(sim_score, 0.80 + (word_overlap - 0.70) * 0.5), 4)
                            elif sim_score >= threshold or word_overlap >= 0.50:
                                score = round(max(sim_score, 0.70 + word_overlap * 0.2), 4)
                            else:
                                score = 0.0
                            m_type = "EXACT" if score >= 0.90 else "PARAPHRASED"

                        if is_exact_match or word_overlap >= 0.65 or score >= threshold:
                            if score > best_score:
                                best_score = score
                                best_match = {
                                    "chunk_id": chunk_id,
                                    "source_type": "web",
                                    "matched_document_id": None,
                                    "matched_url": web_item.get("url"),
                                    "matched_text": snippet or title,
                                    "similarity_score": round(best_score, 4),
                                    "match_type": m_type,
                                }

                    if best_match:
                        chunk_matches.append(best_match)
            except Exception as e:
                logger.warning(f"Lỗi khi quét web cho câu #{idx}: {e}")

        return idx, chunk_matches

    def run(
        self,
        content: str,
        title: Optional[str] = "Untitled Document",
        user_id: Optional[str] = None,
        enable_web_search: bool = True,
        similarity_threshold: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        Thực thi tuần tự toàn bộ 6 bước đối soát đạo văn.
        Hỗ trợ loại trừ tự đạo văn (Self-Plagiarism) qua user_id và document_id.
        """
        threshold = (
            similarity_threshold
            if similarity_threshold is not None
            else settings.PLAGIARISM_SIMILARITY_THRESHOLD
        )

        logger.info(f"=== BẮT ĐẦU PIPELINE ĐỐI SOÁT ĐẠO VĂN (user_id={user_id}) ===")

        # -------------------------------------------------------------
        # BƯỚC 1: Lưu bài viết gốc vào Supabase documents (pending)
        # -------------------------------------------------------------
        logger.info("Bước 1: Lưu bài viết gốc vào bảng 'documents' (Supabase)...")
        word_count = self.cleaner.count_words(content)
        doc_payload = {
            "title": title or "Untitled Document",
            "content": content,
            "word_count": word_count,
            "plagiarism_score": 0.0,
            "ai_score": 0.0,
            "status": "pending",
        }
        is_valid_uuid = False
        if user_id:
            try:
                uuid.UUID(str(user_id))
                is_valid_uuid = True
            except ValueError:
                is_valid_uuid = False

        if user_id and is_valid_uuid:
            doc_payload["user_id"] = str(user_id)

        try:
            doc_res = self.supabase.table("documents").insert(doc_payload).execute()
        except Exception as e:
            # Nếu user_id chưa có trong auth.users (FK constraint 23503) hoặc lỗi kiểu dữ liệu
            if "user_id" in doc_payload:
                logger.warning(f"user_id '{user_id}' không hợp lệ hoặc chưa có trong auth.users, lưu document với user_id=None")
                doc_payload.pop("user_id", None)
                doc_res = self.supabase.table("documents").insert(doc_payload).execute()
            else:
                raise e

        if not doc_res.data:
            raise RuntimeError("Không thể tạo record trong bảng 'documents'")

        document_record = doc_res.data[0]
        document_id = document_record["id"]
        logger.info(f"-> Tạo thành công Document ID: {document_id}")
        self.update_job_progress(document_id, 15, "Đã lưu bài viết gốc vào cơ sở dữ liệu")

        # -------------------------------------------------------------
        # BƯỚC 2: Tách câu (TextCleaner)
        # -------------------------------------------------------------
        logger.info("Bước 2: Chuẩn hóa và tách câu văn bản (TextCleaner)...")
        sentences = self.cleaner.clean_and_split(content, min_length=12)
        total_sentences = len(sentences)
        logger.info(f"-> Đã tách thành {total_sentences} câu hoàn chỉnh.")
        self.update_job_progress(document_id, 30, f"Đã chuẩn hóa và tách thành {total_sentences} câu")

        if total_sentences == 0:
            # Nếu không có câu hợp lệ, cập nhật trạng thái và hoàn tất
            self.supabase.table("documents").update(
                {"status": "completed", "plagiarism_score": 0.0}
            ).eq("id", document_id).execute()
            self.update_job_progress(
                document_id, 100, "Văn bản không có câu hợp lệ", status="completed",
                extra={"plagiarism_score": 0.0, "exact_match_score": 0.0, "paraphrase_score": 0.0}
            )
            return {
                "document_id": document_id,
                "title": title,
                "word_count": word_count,
                "total_chunks": 0,
                "matched_chunks_count": 0,
                "plagiarism_score": 0.0,
                "exact_match_score": 0.0,
                "paraphrase_score": 0.0,
                "matches": [],
                "status": "completed",
            }

        # -------------------------------------------------------------
        # BƯỚC 3: Lưu các câu vào DB (document_chunks)
        # -------------------------------------------------------------
        logger.info("Bước 3: Lưu các chunks vào bảng 'document_chunks' (Supabase)...")
        chunk_payloads = [
            {
                "document_id": document_id,
                "chunk_index": idx,
                "content": sentence,
                "ai_probability": 0.0,
            }
            for idx, sentence in enumerate(sentences)
        ]
        chunk_res = (
            self.supabase.table("document_chunks").insert(chunk_payloads).execute()
        )
        saved_chunks = chunk_res.data or []
        logger.info(f"-> Đã lưu {len(saved_chunks)} chunks vào database thành công.")
        self.update_job_progress(document_id, 45, f"Đã lưu {len(saved_chunks)} đoạn vào CSDL")

        # -------------------------------------------------------------
        # BƯỚC 4: Tạo Vector (EmbeddingService)
        # -------------------------------------------------------------
        logger.info("Bước 4: Sinh dãy số vector qua FastEmbed (EmbeddingService)...")
        chunk_texts = [c["content"] for c in saved_chunks]
        vectors = self.embedder.embed_texts(chunk_texts)
        logger.info(f"-> Đã sinh {len(vectors)} vectors (dim={len(vectors[0]) if vectors else 0}).")
        self.update_job_progress(document_id, 60, f"Đã sinh {len(vectors)} vector ngữ nghĩa")

        # -------------------------------------------------------------
        # BƯỚC 5: Lưu kho Qdrant
        # -------------------------------------------------------------
        logger.info("Bước 5: Đẩy vectors kèm chunk_id và metadata vào Qdrant...")
        points = [
            PointStruct(
                id=chunk["id"],
                vector=vector,
                payload={
                    "chunk_id": chunk["id"],
                    "document_id": document_id,
                    "user_id": str(user_id) if user_id else None,
                    "content": chunk["content"],
                    "chunk_index": chunk["chunk_index"],
                },
            )
            for chunk, vector in zip(saved_chunks, vectors)
        ]
        upsert_ok = self.qdrant.upsert_chunks(points)
        logger.info(f"-> Lưu kho Qdrant: {'Thành công' if upsert_ok else 'Gặp lỗi/Fallback'}")
        self.update_job_progress(document_id, 75, "Đã lập chỉ mục vào Vector Database")

        # -------------------------------------------------------------
        # BƯỚC 6: Đối soát (Qdrant & Serper) và lưu vào plagiarism_matches [ĐA LUỒNG]
        # -------------------------------------------------------------
        logger.info("Bước 6: Đối soát quét trùng lặp qua Qdrant (nội bộ) & Serper (web) [ĐA LUỒNG]...")
        self.update_job_progress(document_id, 85, "Đang đối soát quét trùng lặp đa luồng...")
        all_matches: List[Dict[str, Any]] = []
        matched_chunk_indices = set()
        exact_chunk_indices = set()
        paraphrase_chunk_indices = set()

        max_workers = min(10, max(1, len(saved_chunks)))
        logger.info(f"-> Kích hoạt ThreadPoolExecutor với {max_workers} luồng xử lý song song.")

        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            future_to_chunk = {
                executor.submit(
                    self._match_single_chunk,
                    idx,
                    chunk,
                    vector,
                    document_id,
                    user_id,
                    threshold,
                    enable_web_search,
                ): idx
                for idx, (chunk, vector) in enumerate(zip(saved_chunks, vectors))
            }

            for future in as_completed(future_to_chunk):
                try:
                    c_idx, c_matches = future.result()
                    if c_matches:
                        matched_chunk_indices.add(c_idx)
                        all_matches.extend(c_matches)
                        for m in c_matches:
                            if m.get("match_type") == "EXACT":
                                exact_chunk_indices.add(c_idx)
                            else:
                                paraphrase_chunk_indices.add(c_idx)
                except Exception as exc:
                    logger.error(f"Lỗi worker thread đối soát câu: {exc}")

        # Chunk nào đã có exact match thì ưu tiên xếp vào EXACT
        paraphrase_chunk_indices -= exact_chunk_indices

        # Ghi các kết quả trùng lặp vào bảng plagiarism_matches (nếu có)
        if all_matches:
            logger.info(f"-> Phát hiện {len(all_matches)} đoạn trùng khớp! Xác thực trước khi lưu...")
            internal_doc_ids = {
                str(m["matched_document_id"])
                for m in all_matches
                if m.get("matched_document_id")
            }
            if internal_doc_ids:
                try:
                    existing_docs = (
                        self.supabase.table("documents")
                        .select("id")
                        .in_("id", list(internal_doc_ids))
                        .execute()
                    )
                    valid_doc_ids = {d["id"] for d in (existing_docs.data or [])}
                    for m in all_matches:
                        if (
                            m.get("matched_document_id")
                            and m["matched_document_id"] not in valid_doc_ids
                        ):
                            m["matched_document_id"] = None
                except Exception as check_err:
                    logger.warning(f"Lỗi kiểm tra matched_document_id tồn tại: {check_err}")

            # Lọc đúng các cột tương thích với schema Supabase plagiarism_matches
            db_matches = [
                {
                    "chunk_id": m["chunk_id"],
                    "source_type": m.get("source_type", "web"),
                    "matched_document_id": m.get("matched_document_id"),
                    "matched_url": m.get("matched_url"),
                    "matched_text": m.get("matched_text", ""),
                    "similarity_score": float(m.get("similarity_score", 0.0)),
                }
                for m in all_matches
            ]

            try:
                self.supabase.table("plagiarism_matches").insert(db_matches).execute()
            except Exception as insert_err:
                if "23503" in str(insert_err) or "foreign key" in str(insert_err).lower():
                    logger.warning("Vi phạm FK matched_document_id, đặt toàn bộ về None và lưu lại...")
                    for m in db_matches:
                        m["matched_document_id"] = None
                    self.supabase.table("plagiarism_matches").insert(db_matches).execute()
                else:
                    raise insert_err
        else:
            logger.info("-> Không phát hiện đoạn nào trùng vượt ngưỡng tương đồng.")

        # Tính điểm học thuật chuẩn có trọng số:
        exact_percentage = round((len(exact_chunk_indices) / total_sentences) * 100, 2)
        paraphrased_percentage = round((len(paraphrase_chunk_indices) / total_sentences) * 100, 2)
        # Trọng số: Trùng nguyên văn x 1.0 + Diễn đạt lại x 0.75
        weighted_plagiarism_score = round(
            min(100.0, exact_percentage * 1.0 + paraphrased_percentage * 0.75), 2
        )

        # Cập nhật trạng thái 'completed' và điểm vào Supabase documents
        logger.info(
            f"-> Cập nhật tài liệu: status='completed', plagiarism_score={weighted_plagiarism_score}% "
            f"(exact={exact_percentage}%, paraphrase={paraphrased_percentage}%)"
        )
        self.supabase.table("documents").update(
            {
                "status": "completed",
                "plagiarism_score": weighted_plagiarism_score,
            }
        ).eq("id", document_id).execute()

        result_payload = {
            "document_id": document_id,
            "title": title,
            "word_count": word_count,
            "total_chunks": total_sentences,
            "matched_chunks_count": len(matched_chunk_indices),
            "plagiarism_score": weighted_plagiarism_score,
            "exact_match_score": exact_percentage,
            "paraphrase_score": paraphrased_percentage,
            "matches_count": len(all_matches),
            "matches": all_matches,
            "status": "completed",
        }

        self.update_job_progress(
            document_id,
            100,
            "Hoàn tất đối soát thành công",
            status="completed",
            extra=result_payload,
        )

        logger.info("=== HOÀN TẤT PIPELINE ĐỐI SOÁT ĐẠO VĂN ===")
        return result_payload


plagiarism_pipeline = PlagiarismPipeline()
