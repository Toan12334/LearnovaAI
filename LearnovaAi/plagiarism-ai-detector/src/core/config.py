import os
from pathlib import Path
from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Lùi 3 cấp thư mục để tìm về gốc dự án:
# config.py -> core/ -> src/ -> plagiarism-ai-detector/ (.env ở đây)
BASE_DIR = Path(__file__).resolve().parent.parent.parent
ENV_PATH = BASE_DIR / ".env"


class Settings(BaseSettings):
    BASE_DIR: Path = BASE_DIR
    APP_ENV: str = "development"
    APP_HOST: str = "0.0.0.0"
    APP_PORT: int = 8000
    DEBUG: bool = True

    # Database
    DATABASE_URL: str = (
        "postgresql+asyncpg://postgres:postgres@localhost:5432/plagiarism_db"
    )

    # Supabase SDK Database
    SUPABASE_URL: str | None = None
    SUPABASE_KEY: str | None = None
    SUPABASE_SERVICE_ROLE_KEY: str | None = None

    # JWT Authentication
    JWT_SECRET: str = "learnova-ai-super-secret-jwt-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15 * 24 * 60  # 15 ngày (21600 phút)

    # Qdrant Vector Database
    QDRANT_URL: str | None = None
    QDRANT_HOST: str = "localhost"
    QDRANT_PORT: int = 6333
    QDRANT_API_KEY: str | None = None
    QDRANT_COLLECTION: str = "plagiarism_docs"
    QDRANT_TIMEOUT: int = 30

    # Redis Cache
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_PASSWORD: str | None = None

    # Search APIs
    SEARCH_API_KEY: str | None = None
    SEARCH_ENGINE_ID: str | None = None
    SERPER_SEARCH_URL: str = "https://google.serper.dev/search"

    # Embedding & Vector Database
    # Sử dụng mô hình: sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2 (384 dims, siêu nhẹ 118MB, nhanh và tối ưu CPU)
    EMBEDDING_MODEL: str = (
        "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
    )
    VECTOR_SIZE: int = 384
    PLAGIARISM_SIMILARITY_THRESHOLD: float = 0.75
    INTERNET_CACHE_COLLECTION: str = "internet_web_cache_384"
    INTERNET_EXACT_THRESHOLD: float = 0.90
    INTERNET_PARAPHRASE_THRESHOLD: float = 0.78
    INTERNET_SEARCH_CONCURRENCY: int = 5
    INTERNET_SCRAPE_CONCURRENCY: int = 8

    # AI Detection Models
    HF_TOKEN: str | None = None
    HUGGINGFACE_API_KEY: str | None = None
    AI_DETECTOR_MODEL: str = "toanoppa10012004/phobert-vietnamese-ai-detector"
    PERPLEXITY_MODEL: str = "distilgpt2"
    AI_DETECTOR_THRESHOLD: float = 0.50

    # Chỉ định đường dẫn tuyệt đối tới file .env
    model_config = SettingsConfigDict(
        env_file=ENV_PATH, env_file_encoding="utf-8", extra="ignore"
    )

    @model_validator(mode="after")
    def resolve_environment_and_models(self) -> "Settings":
        # 1. Luôn ưu tiên mô hình paraphrase-multilingual-MiniLM-L12-v2 (384 dims)
        if not self.EMBEDDING_MODEL or "bge-m3" in self.EMBEDDING_MODEL.lower():
            self.EMBEDDING_MODEL = (
                "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
            )

        # 2. Đồng bộ số chiều VECTOR_SIZE theo mô hình (384 dims)
        if not self.VECTOR_SIZE or "bge-m3" in (self.EMBEDDING_MODEL or "").lower():
            self.VECTOR_SIZE = 384

        # 3. Đồng bộ Qdrant collection tương ứng với vector 384 chiều
        if self.VECTOR_SIZE == 384:
            if self.INTERNET_CACHE_COLLECTION == "internet_web_cache":
                self.INTERNET_CACHE_COLLECTION = "internet_web_cache_384"
            if self.QDRANT_COLLECTION == "plagiarism_docs":
                self.QDRANT_COLLECTION = "plagiarism_docs_384"

        return self


settings = Settings()
