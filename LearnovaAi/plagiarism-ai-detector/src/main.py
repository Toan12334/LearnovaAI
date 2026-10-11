import sys
from pathlib import Path

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.core.config import settings
from src.db.supabase_client import get_supabase_client, check_supabase_connection
from src.api.v1.router import api_router

app = FastAPI(
    title="LearnovaAI Plagiarism & AI Detector API",
    description="Hệ thống phát hiện đạo văn (Winnowing & Semantic FastEmbed), truy vết thời gian & nhận diện AI",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS middleware for Frontend access (dynamic origin matching for credentials support)
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API V1
app.include_router(api_router, prefix="/api/v1")


@app.on_event("startup")
async def startup_event():
    """Auto-apply DB schema migrations on startup."""
    try:
        from src.db.supabase_client import get_supabase_client
        supabase = get_supabase_client()

        # Migration: Add result_payload column if not exists
        # Detect by checking if a column insert fails gracefully
        migrations = [
            "ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS result_payload jsonb",
            "ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS exact_match_score float8",
            "ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS paraphrase_score float8",
            "ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS coverage_percentage float8",
            "ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS coverage_text text",
            "ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS warning text",
        ]

        from src.core.logging import logger
        for sql in migrations:
            try:
                # Use raw Postgres via supabase-py's postgres client
                # supabase.postgrest does not support DDL; use the rpc approach via pg function if available
                supabase.rpc("exec_sql", {"query": sql}).execute()
                logger.info(f"Migration OK: {sql[:60]}...")
            except Exception:
                # If exec_sql function not available, skip silently - pipeline handles gracefully
                pass
    except Exception as e:
        pass  # Startup migration is best-effort


@app.get("/", summary="Root Health Check")
def read_root():
    return {
        "status": "online",
        "service": "LearnovaAI Plagiarism & AI Detector API",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health", summary="Health Check")
def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    print("----------------------------------------")
    print("SEARCH_API_KEY từ .env:", settings.SEARCH_API_KEY)
    print("SUPABASE_URL từ .env  :", settings.SUPABASE_URL)
    print("----------------------------------------")
    print("Đang kiểm tra kết nối Supabase Database...")
    try:
        status = check_supabase_connection()
        print("Trạng thái kết nối:", "🟢 THÀNH CÔNG" if status["connected"] else "🔴 THẤT BẠI")
        print("Chi tiết các bảng truy cập:", status["tables"])
    except Exception as err:
        print("Lỗi kết nối:", err)
    print("----------------------------------------")