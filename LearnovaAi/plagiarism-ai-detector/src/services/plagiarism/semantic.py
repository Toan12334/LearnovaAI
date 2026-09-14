from typing import List, Dict, Any
from src.db.qdrant_client import qdrant_service
from src.core.config import settings
from src.core.logging import logger


class SemanticMatcher:
    """
    [GD1] So khớp ngữ nghĩa (Semantic Match) qua Embedding và Vector Database Qdrant.
    """

    def __init__(self, collection_name: str = settings.QDRANT_COLLECTION):
        self.collection_name = collection_name
        self.client = qdrant_service.client

    async def get_embedding(self, text: str) -> List[float]:
        """
        Sinh vector embedding cho đoạn văn bản (Dùng model paraphrase-multilingual / bge-m3 / sentence-transformers).
        """
        # Placeholder vector (768 dimensions)
        return [0.0] * 768

    async def search_similar(self, query_text: str, top_k: int = 5, score_threshold: float = 0.75) -> List[Dict[str, Any]]:
        """
        Tìm kiếm các đoạn văn bản tương đồng ngữ nghĩa trong Vector DB.
        """
        try:
            vector = await self.get_embedding(query_text)
            results = self.client.search(
                collection_name=self.collection_name,
                query_vector=vector,
                limit=top_k,
                score_threshold=score_threshold
            )
            return [
                {
                    "id": hit.id,
                    "score": hit.score,
                    "payload": hit.payload
                }
                for hit in results
            ]
        except Exception as e:
            logger.error(f"Lỗi tìm kiếm Semantic similarity: {e}")
            return []
