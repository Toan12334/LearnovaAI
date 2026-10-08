"""
Embedding Service
Chuyển đổi các câu văn bản thành dãy vector embeddings.
Sử dụng mô hình:
- sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2 (384 dimensions, siêu nhẹ 118MB, hỗ trợ đa ngôn ngữ và tiếng Việt xuất sắc)
"""

from typing import List, Optional, Any
from src.core.config import settings
from src.core.logging import logger


class EmbeddingService:
    def __init__(self, model_name: Optional[str] = None):
        self.model_name = model_name or settings.EMBEDDING_MODEL
        self._model: Optional[Any] = None
        name_lower = self.model_name.lower()
        self._is_sentence_transformer: bool = (
            "sentence-transformers" in name_lower
            or "minilm" in name_lower
            or "paraphrase" in name_lower
            or "bge" in name_lower
        )

    @property
    def model(self) -> Any:
        if self._model is None:
            if self._is_sentence_transformer:
                from sentence_transformers import SentenceTransformer
                logger.info(f"Đang tải mô hình SentenceTransformer: {self.model_name}...")
                hf_token = getattr(settings, "HF_TOKEN", None)
                valid_token = hf_token if (hf_token and "your_" not in hf_token and len(hf_token) > 10) else False
                try:
                    self._model = SentenceTransformer(self.model_name, local_files_only=True)
                except Exception:
                    self._model = SentenceTransformer(self.model_name, token=valid_token)
                logger.info(f"Đã tải thành công mô hình: {self.model_name}")
            else:
                try:
                    from fastembed import TextEmbedding
                    logger.info(f"Đang tải mô hình FastEmbed: {self.model_name}...")
                    self._model = TextEmbedding(model_name=self.model_name)
                    logger.info(f"Đã tải thành công mô hình FastEmbed: {self.model_name}")
                except Exception as fe:
                    logger.warning(f"FastEmbed không khả dụng ({fe}), dùng SentenceTransformer làm dự phòng...")
                    from sentence_transformers import SentenceTransformer
                    self._model = SentenceTransformer(self.model_name)
                    self._is_sentence_transformer = True
        return self._model

    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """
        Chuyển đổi danh sách N câu văn bản thành N vector số thực (384 chiều).
        Vector được chuẩn hóa L2 để tính Cosine Similarity.
        """
        if not texts:
            return []

        if self._is_sentence_transformer:
            # SentenceTransformer encode
            embeddings = self.model.encode(
                texts,
                batch_size=16,
                normalize_embeddings=True,
                show_progress_bar=False,
            )
            return [vec.tolist() for vec in embeddings]
        else:
            # FastEmbed generator
            embeddings_gen = self.model.embed(texts)
            return [vec.tolist() for vec in embeddings_gen]

    def embed_text(self, text: str) -> List[float]:
        """
        Chuyển đổi 1 câu văn bản thành 1 vector số thực.
        """
        results = self.embed_texts([text])
        return results[0] if results else []


embedding_service = EmbeddingService()