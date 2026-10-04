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
    # - Local: BAAI/bge-m3 (1024 dims)
    # - Deploy (Railway / Cloud): sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2 (384 dims)
    EMBEDDING_MODEL: str | None = None
    VECTOR_SIZE: int | None = None
    PLAGIARISM_SIMILARITY_THRESHOLD: float = 0.75
    INTERNET_CACHE_COLLECTION: str = "internet_web_cache"
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
        # Nhận diện môi trường Deploy đám mây (Railway, Render, HuggingFace, Docker production, v.v.)
        is_deployed = bool(
            os.getenv("RAILWAY_ENVIRONMENT")
            or os.getenv("RAILWAY_PROJECT_ID")
            or os.getenv("RENDER")
            or os.getenv("SPACE_ID")
            or os.getenv("DYNO")
            or self.APP_ENV.lower() in ("production", "prod", "staging")
        )

        # 1. Tự động chọn mô hình Embedding nếu chưa chỉ định rõ trong .env / biến môi trường:
        #    - Chạy Local: BAAI/bge-m3 (chất lượng cao nhất, đa ngôn ngữ & tiếng Việt)
        #    - Chạy Deploy Cloud: paraphrase-multilingual-MiniLM-L12-v2 (nhẹ 118MB, tránh OOM / Timeout 60s)
        if not self.EMBEDDING_MODEL:
            if is_deployed:
                self.EMBEDDING_MODEL = (
                    "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
                )
            else:
                self.EMBEDDING_MODEL = "BAAI/bge-m3"

        # 2. Tự động đồng bộ số chiều VECTOR_SIZE theo EMBEDDING_MODEL nếu chưa set
        if not self.VECTOR_SIZE:
            model_lower = self.EMBEDDING_MODEL.lower()
            if "bge-m3" in model_lower:
                self.VECTOR_SIZE = 1024
            elif "minilm" in model_lower or "paraphrase" in model_lower:
                self.VECTOR_SIZE = 384
            else:
                self.VECTOR_SIZE = 1024 if not is_deployed else 384

        # 3. Phân tách Qdrant collection theo vector size để tránh lỗi 400 Bad Request
        #    (Collection internet_web_cache trên Qdrant Cloud được khởi tạo với 1024 chiều)
        if self.VECTOR_SIZE != 1024:
            if self.INTERNET_CACHE_COLLECTION == "internet_web_cache":
                self.INTERNET_CACHE_COLLECTION = f"internet_web_cache_{self.VECTOR_SIZE}"
            if self.QDRANT_COLLECTION == "plagiarism_docs":
                self.QDRANT_COLLECTION = f"plagiarism_docs_{self.VECTOR_SIZE}"

        return self


settings = Settings()
