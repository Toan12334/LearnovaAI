from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

# Lùi 3 cấp thư mục để tìm về gốc dự án:
# config.py -> core/ -> src/ -> plagiarism-ai-detector/ (.env ở đây)
BASE_DIR = Path(__file__).resolve().parent.parent.parent
ENV_PATH = BASE_DIR / ".env"


class Settings(BaseSettings):
    APP_ENV: str = "development"
    APP_HOST: str = "0.0.0.0"
    APP_PORT: int = 8000
    DEBUG: bool = True

    # Database
    DATABASE_URL: str = (
        "postgresql+asyncpg://postgres:postgres@localhost:5432/plagiarism_db"
    )

    # Qdrant Vector Database
    QDRANT_HOST: str = "localhost"
    QDRANT_PORT: int = 6333
    QDRANT_API_KEY: str | None = None
    QDRANT_COLLECTION: str = "documents_embedding"

    # Redis Cache
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_PASSWORD: str | None = None

    # Search APIs
    SEARCH_API_KEY: str | None = None
    SEARCH_ENGINE_ID: str | None = None

    # AI Detection Models
    HUGGINGFACE_API_KEY: str | None = None

    # Chỉ định đường dẫn tuyệt đối tới file .env
    model_config = SettingsConfigDict(
        env_file=ENV_PATH, env_file_encoding="utf-8", extra="ignore"
    )


settings = Settings()