from pathlib import Path
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

    # Redis Cache
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_PASSWORD: str | None = None

    # Search APIs
    SEARCH_API_KEY: str | None = None
    SEARCH_ENGINE_ID: str | None = None
    SERPER_SEARCH_URL: str = "https://google.serper.dev/search"

    # Embedding & Vector Database
    EMBEDDING_MODEL: str = "BAAI/bge-m3"
    VECTOR_SIZE: int = 1024
    PLAGIARISM_SIMILARITY_THRESHOLD: float = 0.75

    # AI Detection Models
    HUGGINGFACE_API_KEY: str | None = None

    # Chỉ định đường dẫn tuyệt đối tới file .env
    model_config = SettingsConfigDict(
        env_file=ENV_PATH, env_file_encoding="utf-8", extra="ignore"
    )


settings = Settings()