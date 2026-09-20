"""
Embedding Service
Chuyển đổi các câu văn bản thành dãy vector embeddings.
Hỗ trợ:
- BAAI/bge-m3 (1024 dimensions, hỗ trợ đa ngôn ngữ và tiếng Việt xuất sắc) qua SentenceTransformers.
- FastEmbed (bge-small, paraphrase-multilingual) qua ONNX runtime.
"""

from typing import List, Optional, Any
from src.core.config import settings
from src.core.logging import logger


class EmbeddingService:
    def __init__(self, model_name: Optional[str] = None):
        self.model_name = model_name or settings.EMBEDDING_MODEL
        self._model: Optional[Any] = None
        self._is_sentence_transformer: bool = "bge-m3" in self.model_name.lower()

    @property
    def model(self) -> Any:
        if self._model is None:
            if self._is_sentence_transformer:
                from sentence_transformers import SentenceTransformer
                logger.info(f"Đang tải mô hình SentenceTransformer: {self.model_name}...")
                self._model = SentenceTransformer(self.model_name)
                logger.info(f"Đã tải thành công mô hình: {self.model_name}")
            else:
                from fastembed import TextEmbedding
                logger.info(f"Đang tải mô hình FastEmbed: {self.model_name}...")
                self._model = TextEmbedding(model_name=self.model_name)
                logger.info(f"Đã tải thành công mô hình FastEmbed: {self.model_name}")
        return self._model

    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """
        Chuyển đổi danh sách N câu văn bản thành N vector số thực.
        Với BAAI/bge-m3, vector có 1024 chiều và được chuẩn hóa L2 (Cosine Similarity).
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