from qdrant_client import QdrantClient
from qdrant_client.http.models import Distance, VectorParams
from src.core.config import settings
from src.core.logging import logger


class QdrantService:
    def __init__(self):
        self.client = QdrantClient(
            host=settings.QDRANT_HOST,
            port=settings.QDRANT_PORT,
            api_key=settings.QDRANT_API_KEY
        )

    def init_collection(self, collection_name: str = settings.QDRANT_COLLECTION, vector_size: int = 768):
        try:
            collections = self.client.get_collections().collections
            collection_names = [c.name for c in collections]
            if collection_name not in collection_names:
                self.client.create_collection(
                    collection_name=collection_name,
                    vectors_config=VectorParams(size=vector_size, distance=Distance.COSINE),
                )
                logger.info(f"Đã khởi tạo Qdrant collection: {collection_name}")
        except Exception as e:
            logger.error(f"Lỗi khởi tạo Qdrant: {e}")


qdrant_service = QdrantService()
