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
from typing import Any, Dict, List, Optional
import numpy as np
from qdrant_client.http.models import PointStruct

from src.core.config import settings
from src.core.logging import logger
from src.db.supabase_client import get_supabase_client
from src.db.qdrant_client import qdrant_service
from src.utils.text_cleaner import TextCleaner
from src.services.embedding import embedding_service
from src.services.search.web_search import web_search_service


class PlagiarismPipeline:
    def __init__(self):
        self.supabase = get_supabase_client()
        self.cleaner = TextCleaner()
        self.embedder = embedding_service
        self.qdrant = qdrant_service
        self.searcher = web_search_service

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

        # -------------------------------------------------------------
        # BƯỚC 2: Tách câu (TextCleaner)
        # -------------------------------------------------------------
        logger.info("Bước 2: Chuẩn hóa và tách câu văn bản (TextCleaner)...")
        sentences = self.cleaner.clean_and_split(content, min_length=12)
        total_sentences = len(sentences)
        logger.info(f"-> Đã tách thành {total_sentences} câu hoàn chỉnh.")

        if total_sentences == 0:
            # Nếu không có câu hợp lệ, cập nhật trạng thái và hoàn tất
            self.supabase.table("documents").update(
                {"status": "completed", "plagiarism_score": 0.0}
            ).eq("id", document_id).execute()
            return {
                "document_id": document_id,
                "title": title,
                "total_chunks": 0,
                "plagiarism_score": 0.0,
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

        # -------------------------------------------------------------
        # BƯỚC 4: Tạo Vector (EmbeddingService)
        # -------------------------------------------------------------
        logger.info("Bước 4: Sinh dãy số vector qua FastEmbed (EmbeddingService)...")
        chunk_texts = [c["content"] for c in saved_chunks]
        vectors = self.embedder.embed_texts(chunk_texts)
        logger.info(f"-> Đã sinh {len(vectors)} vectors (dim={len(vectors[0]) if vectors else 0}).")

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

        # -------------------------------------------------------------
        # BƯỚC 6: Đối soát (Qdrant & Serper) và lưu vào plagiarism_matches
        # -------------------------------------------------------------
        logger.info("Bước 6: Đối soát quét trùng lặp qua Qdrant (nội bộ) & Serper (web)...")
        all_matches: List[Dict[str, Any]] = []
        matched_chunk_indices = set()

        for idx, (chunk, vector) in enumerate(zip(saved_chunks, vectors)):
            chunk_id = chunk["id"]
            chunk_text = chunk["content"]
            chunk_clean = re.sub(r"[^\w\s]", "", chunk_text.lower()).strip()

            # 6.1: Quét trong Qdrant (Đối soát nội bộ với các bài viết khác, loại trừ chính bài này và các bài cũ của user_id)
            qdrant_results = self.qdrant.search_similar_chunks(
                query_vector=vector,
                top_k=3,
                score_threshold=threshold,
                exclude_document_id=document_id,
                exclude_user_id=user_id,
            )

            for qr in qdrant_results:
                matched_chunk_indices.add(idx)
                qr_content = qr.get("content") or ""
                qr_clean = re.sub(r"[^\w\s]", "", qr_content.lower()).strip()

                # Nếu giống hệt nội dung chữ (bỏ qua dấu câu), cho điểm tuyệt đối 1.0 (100%)
                if chunk_clean == qr_clean or (chunk_clean and chunk_clean in qr_clean):
                    q_sim = 1.0
                else:
                    q_sim = round(float(qr["similarity_score"]), 4)

                match_record = {
                    "chunk_id": chunk_id,
                    "source_type": "internal_db",
                    "matched_document_id": qr["document_id"],
                    "matched_url": None,
                    "matched_text": qr_content,
                    "similarity_score": q_sim,
                }
                all_matches.append(match_record)

            # 6.2: Quét qua Serper (Đối soát trực tuyến với các trang web)
            clean_for_search = chunk_text.strip(".,;:!?…'\"-—()[] \t\n")
            if enable_web_search and len(clean_for_search) >= 8:
                try:
                    # Trích xuất đoạn truy vấn tiêu biểu từ câu (lọc sạch dấu câu ở đuôi để Google không bị lệch)
                    if len(clean_for_search) >= 12:
                        query_term = f'"{clean_for_search[:80]}"'
                    else:
                        query_term = clean_for_search

                    web_results = self.searcher.search_query_sync(query=query_term, top_k=3)

                    # Nếu tìm kiếm ngoặc kép không có kết quả và câu dài, thử tìm không ngoặc kép
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

                            # 1. Kiểm tra Exact Match (nguyên văn không dấu câu)
                            is_exact_match = (
                                chunk_clean in source_clean
                                or (len(chunk_clean) >= 15 and source_clean in chunk_clean)
                            )

                            # 2. Word overlap (đo tỷ lệ trùng từ thực tế)
                            c_words = chunk_clean.split()
                            s_words = set(source_clean.split())
                            word_overlap = (
                                sum(1 for w in c_words if w in s_words) / len(c_words)
                                if c_words
                                else 0.0
                            )

                            # 3. Vector semantic similarity
                            snippet_vec = self.embedder.embed_text(snippet or title)
                            sim_score = self._compute_cosine(vector, snippet_vec)

                            # Quyết định điểm tương đồng chính xác:
                            if is_exact_match:
                                score = 1.0  # Trùng khớp 100% nguyên văn trên web!
                            elif word_overlap >= 0.85:
                                score = round(min(1.0, 0.90 + (word_overlap - 0.85) * 0.6), 4)
                            elif word_overlap >= 0.70:
                                score = round(max(sim_score, 0.80 + (word_overlap - 0.70) * 0.5), 4)
                            elif sim_score >= threshold or word_overlap >= 0.50:
                                score = round(max(sim_score, 0.70 + word_overlap * 0.2), 4)
                            else:
                                score = 0.0

                            # Ghi nhận match nếu là trùng khớp rõ ràng hoặc vượt ngưỡng
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
                                    }

                        if best_match:
                            matched_chunk_indices.add(idx)
                            all_matches.append(best_match)
                except Exception as e:
                    logger.warning(f"Lỗi khi quét web cho câu #{idx}: {e}")

        # Ghi các kết quả trùng lặp vào bảng plagiarism_matches (nếu có)
        if all_matches:
            logger.info(f"-> Phát hiện {len(all_matches)} đoạn trùng khớp! Xác thực trước khi lưu...")
            # Kiểm tra foreign key matched_document_id xem có thực sự tồn tại trong Supabase documents không
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
                            # Tài liệu trên Qdrant đã bị xóa khỏi Supabase -> Đặt matched_document_id = None để không vi phạm FK
                            m["matched_document_id"] = None
                except Exception as check_err:
                    logger.warning(f"Lỗi kiểm tra matched_document_id tồn tại: {check_err}")

            try:
                self.supabase.table("plagiarism_matches").insert(all_matches).execute()
            except Exception as insert_err:
                # Fallback an toàn nếu vẫn dính lỗi Foreign Key
                if "23503" in str(insert_err) or "foreign key" in str(insert_err).lower():
                    logger.warning("Vi phạm FK matched_document_id, đặt toàn bộ về None và lưu lại...")
                    for m in all_matches:
                        m["matched_document_id"] = None
                    self.supabase.table("plagiarism_matches").insert(all_matches).execute()
                else:
                    raise insert_err
        else:
            logger.info("-> Không phát hiện đoạn nào trùng vượt ngưỡng tương đồng.")

        # Tính tổng điểm phần trăm đạo văn
        plagiarism_percentage = round((len(matched_chunk_indices) / total_sentences) * 100, 2)

        # Cập nhật trạng thái 'completed' và điểm vào Supabase documents
        logger.info(f"-> Cập nhật tài liệu: status='completed', plagiarism_score={plagiarism_percentage}%")
        self.supabase.table("documents").update(
            {
                "status": "completed",
                "plagiarism_score": plagiarism_percentage,
            }
        ).eq("id", document_id).execute()

        logger.info("=== HOÀN TẤT PIPELINE ĐỐI SOÁT ĐẠO VĂN ===")

        return {
            "document_id": document_id,
            "title": title,
            "word_count": word_count,
            "total_chunks": total_sentences,
            "matched_chunks_count": len(matched_chunk_indices),
            "plagiarism_score": plagiarism_percentage,
            "matches_count": len(all_matches),
            "matches": all_matches,
            "status": "completed",
        }


plagiarism_pipeline = PlagiarismPipeline()
