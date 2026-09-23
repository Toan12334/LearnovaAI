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


internet_qdrant_cache = InternetQdrantCache()
