from typing import Any, Dict, List, Optional, Set
from pathlib import Path
import time
from qdrant_client import QdrantClient
from qdrant_client.http.models import (
    Distance,
    VectorParams,
    PointStruct,
    Filter,
    FieldCondition,
    MatchValue,
)
from src.core.config import settings
from src.core.logging import logger


class QdrantService:
    def __init__(self):
        self._client: Optional[QdrantClient] = None
        self._ensured_collections: Set[str] = set()

    @property
    def client(self) -> QdrantClient:
        if self._client is None:
            timeout_sec = getattr(settings, "QDRANT_TIMEOUT", 30.0)
            # Ưu tiên kết nối Server Qdrant (Cloud qua QDRANT_URL hoặc Self-hosted qua HOST:PORT)
            try:
                if settings.QDRANT_URL:
                    remote_client = QdrantClient(
                        url=settings.QDRANT_URL,
                        api_key=settings.QDRANT_API_KEY,
                        timeout=timeout_sec,
                        check_compatibility=False,
                    )
                    collections = remote_client.get_collections().collections
                    for c in collections:
                        self._ensured_collections.add(c.name)
                    self._client = remote_client
                    logger.info(f"Đã kết nối Qdrant Cloud tại {settings.QDRANT_URL} (timeout={timeout_sec}s)")
                else:
                    remote_client = QdrantClient(
                        host=settings.QDRANT_HOST,
                        port=settings.QDRANT_PORT,
                        api_key=settings.QDRANT_API_KEY,
                        timeout=timeout_sec,
                        check_compatibility=False,
                    )
                    collections = remote_client.get_collections().collections
                    for c in collections:
                        self._ensured_collections.add(c.name)
                    self._client = remote_client
                    logger.info(f"Đã kết nối Qdrant Server tại {settings.QDRANT_HOST}:{settings.QDRANT_PORT}")
            except Exception as e:
                logger.warning(
                    f"Không thể kết nối Qdrant Server ({e}). Fallback sang lưu trữ cục bộ: data/qdrant_storage"
                )
                storage_path = Path(settings.BASE_DIR) / "data" / "qdrant_storage"
                storage_path.mkdir(parents=True, exist_ok=True)
                self._client = QdrantClient(path=str(storage_path), check_compatibility=False)
        return self._client

    def ensure_collection(
        self,
        collection_name: Optional[str] = None,
        vector_size: Optional[int] = None,
    ):
        """Đảm bảo Collection đã tồn tại trong Qdrant (có bộ nhớ đệm tránh gọi lại nhiều lần)."""
        c_name = collection_name or settings.QDRANT_COLLECTION
        v_size = vector_size or settings.VECTOR_SIZE

        # Nếu collection đã được xác nhận tồn tại trong phiên chạy này, bỏ qua để tránh round-trip HTTP
        if c_name in self._ensured_collections:
            return

        try:
            collections = self.client.get_collections().collections
            existing_names = [c.name for c in collections]
            if c_name not in existing_names:
                self.client.create_collection(
                    collection_name=c_name,
                    vectors_config=VectorParams(size=v_size, distance=Distance.COSINE),
                    timeout=getattr(settings, "QDRANT_TIMEOUT", 30.0),
                )
                logger.info(f"Đã khởi tạo Qdrant collection: {c_name} (size={v_size})")

            # Đánh chỉ mục Payload Index cho các trường quan trọng
            for field in ["document_id", "user_id", "chunk_id", "source_url"]:
                try:
                    self.client.create_payload_index(
                        collection_name=c_name,
                        field_name=field,
                        field_schema="keyword",
                    )
                except Exception:
                    pass

            self._ensured_collections.add(c_name)
        except Exception as e:
            logger.error(f"Lỗi khi kiểm tra/tạo Qdrant collection '{c_name}': {e}")

    def upsert_chunks(
        self,
        points: List[PointStruct],
        collection_name: Optional[str] = None,
        wait: bool = False,
    ) -> bool:
        """Lưu danh sách points (vector + payload) vào Qdrant có retry."""
        c_name = collection_name or settings.QDRANT_COLLECTION
        if not points:
            return True

        self.ensure_collection(c_name)

        # Retry logic for network / timeout resilience
        max_retries = 2
        for attempt in range(max_retries):
            try:
                self.client.upsert(collection_name=c_name, points=points, wait=wait)
                logger.info(f"Đã lưu {len(points)} vector points vào Qdrant collection '{c_name}'")
                return True
            except Exception as e:
                logger.warning(f"Lần thử {attempt + 1}/{max_retries} thất bại khi upsert vào Qdrant ({e})")
                if attempt == max_retries - 1:
                    logger.error(f"Lỗi khi upsert vào Qdrant sau {max_retries} lần thử: {e}")
                    return False
                time.sleep(1.0)
        return False

    def search_similar_chunks(
        self,
        query_vector: List[float],
        top_k: int = 5,
        score_threshold: Optional[float] = None,
        exclude_document_id: Optional[str] = None,
        exclude_user_id: Optional[str] = None,
        collection_name: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Tìm kiếm các đoạn văn bản tương đồng ngữ nghĩa trong Qdrant.
        Hỗ trợ loại trừ bài viết đang kiểm tra hoặc bài của chính tác giả.
        """
        c_name = collection_name or settings.QDRANT_COLLECTION
        threshold = (
            score_threshold
            if score_threshold is not None
            else settings.PLAGIARISM_SIMILARITY_THRESHOLD
        )

        self.ensure_collection(c_name)

        # Xây dựng Qdrant Filter loại trừ (must_not)
        must_not_conditions = []
        if exclude_document_id:
            must_not_conditions.append(
                FieldCondition(key="document_id", match=MatchValue(value=str(exclude_document_id)))
            )
        if exclude_user_id:
            must_not_conditions.append(
                FieldCondition(key="user_id", match=MatchValue(value=str(exclude_user_id)))
            )
        query_filter = Filter(must_not=must_not_conditions) if must_not_conditions else None

        # Truy vấn Vector trên Qdrant có xử lý fallback an toàn
        hits = []
        try:
            if hasattr(self.client, "query_points"):
                response = self.client.query_points(
                    collection_name=c_name,
                    query=query_vector,
                    query_filter=query_filter,
                    limit=top_k,
                    score_threshold=threshold,
                )
                hits = response.points
            else:
                hits = self.client.search(
                    collection_name=c_name,
                    query_vector=query_vector,
                    query_filter=query_filter,
                    limit=top_k,
                    score_threshold=threshold,
                )
        except Exception as query_err:
            logger.warning(
                f"Lỗi truy vấn với filter Qdrant ({query_err}), thử query không filter + in-memory guard..."
            )
            try:
                if hasattr(self.client, "query_points"):
                    response = self.client.query_points(
                        collection_name=c_name,
                        query=query_vector,
                        limit=top_k * 3,
                        score_threshold=threshold,
                    )
                    hits = response.points
                else:
                    hits = self.client.search(
                        collection_name=c_name,
                        query_vector=query_vector,
                        limit=top_k * 3,
                        score_threshold=threshold,
                    )
            except Exception as e2:
                logger.error(f"Lỗi tìm kiếm tương đồng trên Qdrant: {e2}")
                return []

        matches = []
        for hit in hits:
            payload = hit.payload or {}
            doc_id = payload.get("document_id")
            point_user_id = payload.get("user_id")

            # In-Memory Guard
            if exclude_document_id and str(doc_id) == str(exclude_document_id):
                continue
            if exclude_user_id and point_user_id and str(point_user_id) == str(exclude_user_id):
                continue

            matches.append(
                {
                    "point_id": hit.id,
                    "similarity_score": round(float(hit.score), 4),
                    "chunk_id": payload.get("chunk_id"),
                    "document_id": doc_id,
                    "user_id": point_user_id,
                    "content": payload.get("content", ""),
                    "source_url": payload.get("source_url"),
                    "chunk_index": payload.get("chunk_index"),
                }
            )
        return matches


qdrant_service = QdrantService()
