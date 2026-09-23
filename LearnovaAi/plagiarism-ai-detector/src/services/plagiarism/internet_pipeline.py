"""Four-Stage Asynchronous Internet & Internal Plagiarism Detection Pipeline for Long Documents."""

import asyncio
from typing import Any, Dict, List, Optional

from src.core.config import settings
from src.core.logging import logger
from src.services.plagiarism.chunker import InternetPlagiarismChunker
from src.services.plagiarism.qdrant_cache import InternetQdrantCache
from src.services.plagiarism.query_builder import DualQueryBuilder
from src.services.plagiarism.semantic_matcher import SemanticMatcher
from src.services.plagiarism.web_scraper import AsyncWebScraper


class InternetPlagiarismService:
    """
    Unified 4-Step Plagiarism Pipeline:
    1. Pre-processing & Chunking (Noise filter, 60-100 words, Top 20-30% complexity).
    2. Internal Qdrant DB Lookup (bge-m3 encode -> internal/cache Qdrant collection).
       - If Match > 0.85: Flag as Internal Plagiarism and skip Serper for that chunk.
       - If No Match / Low score: Proceed to Step 3.
    3. Internet Search & Fast Scraping (Dual Query -> Serper Top 3-5 URLs -> Trafilatura Scrape -> Cache to Qdrant).
    4. Semantic Re-ranking & Score Aggregation (Cosine >= 0.90: EXACT, 0.78-0.89: PARAPHRASED, < 0.78: CLEAN).
    """

    def __init__(
        self,
        chunker: Optional[InternetPlagiarismChunker] = None,
        query_builder: Optional[DualQueryBuilder] = None,
        scraper: Optional[AsyncWebScraper] = None,
        matcher: Optional[SemanticMatcher] = None,
        cache: Optional[InternetQdrantCache] = None,
    ) -> None:
        self.chunker = chunker or InternetPlagiarismChunker()
        self.query_builder = query_builder or DualQueryBuilder()
        self.scraper = scraper or AsyncWebScraper()
        self.matcher = matcher or SemanticMatcher()
        self.cache = cache or InternetQdrantCache()

    async def check(self, text: str) -> Dict[str, Any]:
        """Execute the 4-step pipeline with Qdrant pre-check branching and Internet scanning."""
        # =========================================================================
        # BƯỚC 1: TIỀN XỬ LÝ & CHUNKING (Tách câu -> Lọc nhiễu -> Gom chunk 60-100 từ)
        # =========================================================================
        chunks = self.chunker.extract_searchable_chunks(text)
        if not chunks:
            return self._result([], 0)

        exact_th = getattr(settings, "INTERNET_EXACT_THRESHOLD", 0.90)
        paraphrase_th = getattr(settings, "INTERNET_PARAPHRASE_THRESHOLD", 0.78)
        internal_match_th = 0.85

        try:
            # =========================================================================
            # BƯỚC 2: TRA CỨU CSDL NỘI BỘ (QDRANT)
            # Encode bge-m3 -> Query Qdrant (Collection: internet_web_cache / internal_docs)
            # =========================================================================
            user_vectors = await self.matcher.encode([chunk["text"] for chunk in chunks])
            cached_search_results = await asyncio.gather(
                *(self.cache.search(vector, limit=3) for vector in user_vectors)
            )

            all_matches: List[Dict[str, Any]] = []
            unmatched_chunks: List[Dict[str, Any]] = []
            cached_pages: Dict[str, str] = {}

            for chunk, hits in zip(chunks, cached_search_results):
                best_hit = None
                for hit in hits:
                    score = float(hit.get("similarity_score", 0.0))
                    content = hit.get("content", "")
                    url = hit.get("source_url") or "qdrant-cache://internal_db"

                    if url and content:
                        cached_pages[url] = f"{cached_pages.get(url, '')}\n{content}".strip()

                    if score >= internal_match_th:
                        if best_hit is None or score > best_hit["similarity_score"]:
                            best_hit = {
                                "user_text": chunk["text"],
                                "matched_text": content,
                                "similarity_score": round(score, 4),
                                "type": "EXACT" if score >= exact_th else "PARAPHRASED",
                                "source_url": url,
                                "chunk_id": chunk.get("chunk_id", 0),
                            }

                if best_hit is not None:
                    # Nhánh Trùng > 0.85: Đã phát hiện trong CSDL Nội bộ/Cache, không cần quét Serper
                    all_matches.append(best_hit)
                else:
                    # Nhánh Không trùng / Điểm thấp: Đưa vào danh sách cần quét Internet (Bước 3)
                    unmatched_chunks.append(chunk)

            # =========================================================================
            # BƯỚC 3: QUÉT INTERNET (SERPER + RE-RANK) Cho các chunks chưa trùng
            # =========================================================================
            scraped_pages: Dict[str, str] = {}
            if unmatched_chunks:
                # 1 & 2. NER Extraction & Tạo Dual Query (Exact + Paraphrase)
                queries: List[str] = []
                for chunk in unmatched_chunks:
                    queries.extend(self.query_builder.build_queries(chunk))

                # 3. Gửi Serper API -> Lấy Top 3-5 URLs
                candidate_urls = await self.scraper.fetch_candidate_urls(queries)

                # 4. Cào Web bất đồng bộ (trafilatura) + RAM cache
                scraped_pages = await self.scraper.scrape_web_content(candidate_urls)

                # 5. Re-rank bằng bge-m3 (Cosine Similarity)
                combined_pages = {**cached_pages, **scraped_pages}
                if combined_pages:
                    web_matches = await self.matcher.find_matches(
                        chunks=unmatched_chunks,
                        pages=combined_pages,
                        exact_threshold=exact_th,
                        paraphrase_threshold=paraphrase_th,
                    )
                    all_matches.extend(web_matches)

                # Lưu các trang mới cào được vào Qdrant Cache để tái sử dụng
                if scraped_pages:
                    try:
                        await self.cache.store(scraped_pages, self.matcher)
                    except Exception as exc:
                        logger.warning("Không thể lưu cache Qdrant: %s", exc)

            # =========================================================================
            # BƯỚC 4: PHÂN LOẠI & TỔNG HỢP ĐIỂM
            # Cosine >= 0.90 -> EXACT_MATCH, 0.78 - 0.89 -> PARAPHRASED, < 0.78 -> Bỏ qua
            # =========================================================================
            return self._result(all_matches, len(chunks))

        except Exception as exc:
            logger.error("Lỗi thực thi Pipeline đối soát đạo văn: %s", exc, exc_info=True)
            raise

    @staticmethod
    def _result(matches: List[Dict[str, Any]], total_chunks: int) -> Dict[str, Any]:
        """Calculate non-overlapping exact and paraphrase percentages and structure response."""
        exact_chunk_ids = {m["chunk_id"] for m in matches if m.get("type") == "EXACT"}
        paraphrased_chunk_ids = {
            m["chunk_id"] for m in matches if m.get("type") == "PARAPHRASED"
        } - exact_chunk_ids

        denominator = total_chunks if total_chunks > 0 else 1
        exact_percentage = round((len(exact_chunk_ids) / denominator) * 100, 2)
        paraphrased_percentage = round((len(paraphrased_chunk_ids) / denominator) * 100, 2)
        total_plagiarism_percentage = round(exact_percentage + paraphrased_percentage, 2)

        # Clean match objects for output schema
        clean_matches = [
            {
                "user_text": m["user_text"],
                "matched_text": m["matched_text"],
                "similarity_score": m["similarity_score"],
                "type": m["type"],
                "source_url": m["source_url"],
            }
            for m in matches
        ]

        return {
            "total_chunks_analyzed": total_chunks,
            "plagiarism_percentage": total_plagiarism_percentage,
            "exact_match_percentage": exact_percentage,
            "paraphrased_percentage": paraphrased_percentage,
            "matches": clean_matches,
        }


internet_plagiarism_service = InternetPlagiarismService()
