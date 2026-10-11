"""Self-Growing Qdrant Vector Cache for Previously Scraped Internet Content."""

import asyncio
import hashlib
from typing import Any, Dict, List, Optional

from qdrant_client.http.models import PointStruct

from src.core.config import settings
from src.core.logging import logger
from src.db.qdrant_client import qdrant_service


class InternetQdrantCache:
    """Persist and retrieve scraped web sentences in Qdrant (internet_web_cache collection)."""

    def __init__(self, collection_name: Optional[str] = None) -> None:
        self.collection_name = collection_name or getattr(
            settings, "INTERNET_CACHE_COLLECTION", "internet_web_cache"
        )

    @staticmethod
    def _point_id(url: str, text: str) -> str:
        """Create a deterministic UUID-v4 style ID from URL and sentence text."""
        digest = hashlib.md5(f"{url}\n{text}".encode("utf-8")).hexdigest()
        return f"{digest[:8]}-{digest[8:12]}-{digest[12:16]}-{digest[16:20]}-{digest[20:]}"

    async def search(self, vector: List[float], limit: int = 5) -> List[Dict[str, Any]]:
        """Look up cached internet passages before making external Serper calls."""
        try:
            threshold = getattr(settings, "INTERNET_PARAPHRASE_THRESHOLD", 0.78)
            return await asyncio.to_thread(
                qdrant_service.search_similar_chunks,
                query_vector=vector,
                top_k=limit,
                score_threshold=threshold,
                collection_name=self.collection_name,
            )
        except Exception as exc:
            logger.warning("Error querying Qdrant internet cache: %s", exc)
            return []

    async def store(self, pages: Dict[str, str], matcher: Any) -> None:
        """
        Encode and store unique web sentences into Qdrant collection 'internet_web_cache'
        to accumulate knowledge and speed up future checks.
        """
        if not pages:
            return

        pairs = [
            (url, sentence)
            for url, content in pages.items()
            for sentence in matcher.split_sentences(content)
        ]
        if not pairs:
            return

        try:
            vectors = await matcher.encode([text for _, text in pairs])
            points = [
                PointStruct(
                    id=self._point_id(url, text),
                    vector=vector,
                    payload={
                        "content": text,
                        "source_url": url,
                        "source_type": "internet_web",
                    },
                )
                for (url, text), vector in zip(pairs, vectors)
            ]

            # Upsert points in batches of 64
            batch_size = 64
            for i in range(0, len(points), batch_size):
                batch = points[i : i + batch_size]
                await asyncio.to_thread(
                    qdrant_service.upsert_chunks, batch, self.collection_name
                )
            logger.info(
                "Successfully cached %d internet sentences into Qdrant '%s'",
                len(points),
                self.collection_name,
            )
        except Exception as exc:
            logger.warning("Failed to store internet sentences in Qdrant: %s", exc)

    def get_cached_url_content(self, url: str) -> Optional[str]:
        """
        Tra cứu Qdrant Cache theo URL (Cache Lookup O(1)).
        Nếu URL này đã từng cào và lưu trong Qdrant collection, ghép các chunks lại thành văn bản hoàn chỉnh.
        Nếu chưa có trong Cache, trả về None để tiến hành cào mới.
        """
        if not url:
            return None
        try:
            points = qdrant_service.get_points_by_url(url, collection_name=self.collection_name)
            if points:
                combined = "\n".join(p["content"] for p in points if p.get("content")).strip()
                if len(combined) >= 30:
                    logger.info("⚡ [Qdrant Cache HIT] Tìm thấy URL '%s' trong cache Qdrant (%d chunks)", url, len(points))
                    return combined
        except Exception as exc:
            logger.warning("Lỗi tra cứu cache URL '%s' trong Qdrant: %s", url, exc)
        return None

    def store_url_content_sync(self, url: str, content: str, embedder: Any) -> bool:
        """
        Chia nhỏ văn bản từ URL thành các câu, sinh vector và lưu vào Qdrant cache.
        """
        if not url or not content:
            return False
        from src.utils.text_cleaner import TextCleaner
        sentences = TextCleaner.clean_and_split(content, min_length=15)
        if not sentences:
            return False
        # Giới hạn tối đa 100 câu tiêu biểu của bài viết để tối ưu bộ nhớ
        sentences = sentences[:100]
        try:
            vectors = embedder.embed_texts(sentences)
            points = [
                PointStruct(
                    id=self._point_id(url, sentence),
                    vector=vec,
                    payload={
                        "content": sentence,
                        "source_url": url,
                        "source_type": "internet_web",
                    },
                )
                for sentence, vec in zip(sentences, vectors)
            ]
            ok = qdrant_service.upsert_chunks(points, collection_name=self.collection_name)
            if ok:
                logger.info("⚡ [Qdrant Cache STORE] Đã lưu %d câu của URL '%s' vào Qdrant cache '%s'", len(points), url, self.collection_name)
            return ok
        except Exception as exc:
            logger.warning("Lỗi lưu cache nội dung URL '%s' vào Qdrant: %s", url, exc)
            return False


internet_qdrant_cache = InternetQdrantCache()
