"""
Supabase Database Client
Sử dụng Supabase Python SDK để kết nối và thao tác với cơ sở dữ liệu Supabase.
"""

from typing import Any, Dict, Optional
from supabase import Client, create_client
from src.core.config import settings
from src.core.logging import logger

_supabase_client: Optional[Client] = None
_supabase_admin_client: Optional[Client] = None


def get_supabase_client() -> Client:
    """Khởi tạo hoặc trả về singleton Supabase Client."""
    global _supabase_client
    if _supabase_client is not None:
        return _supabase_client

    if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
        raise ValueError(
            "SUPABASE_URL và SUPABASE_KEY chưa được cấu hình trong file .env"
        )

    try:
        _supabase_client = create_client(
            supabase_url=settings.SUPABASE_URL,
            supabase_key=settings.SUPABASE_KEY,
        )
        logger.info(
            f"Đã kết nối thành công tới Supabase: {settings.SUPABASE_URL}"
        )
        return _supabase_client
    except Exception as e:
        logger.error(f"Lỗi khi kết nối Supabase: {e}")
        raise e


def get_supabase_admin_client() -> Optional[Client]:
    """Khởi tạo Supabase Admin Client với SUPABASE_SERVICE_ROLE_KEY nếu có."""
    global _supabase_admin_client
    if _supabase_admin_client is not None:
        return _supabase_admin_client

    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        return None

    try:
        _supabase_admin_client = create_client(
            supabase_url=settings.SUPABASE_URL,
            supabase_key=settings.SUPABASE_SERVICE_ROLE_KEY,
        )
        return _supabase_admin_client
    except Exception as e:
        logger.warning(f"Lỗi khi khởi tạo Admin Client: {e}")
        return None


def check_supabase_connection() -> Dict[str, Any]:
    """Kiểm tra trạng thái kết nối và khả năng truy cập 5 bảng trong hệ thống."""
    client = get_supabase_client()
    status: Dict[str, Any] = {
        "url": settings.SUPABASE_URL,
        "connected": False,
        "tables": {},
        "storage": "unknown",
        "error": None,
    }

    try:
        # Kiểm tra Supabase Storage Bucket
        buckets = client.storage.list_buckets()
        status["storage"] = f"OK ({len(buckets)} buckets)"
    except Exception as e:
        status["storage"] = f"Error: {str(e)}"

    # Danh sách 5 bảng chuẩn theo Schema đã thiết lập
    known_tables = [
        "profiles",
        "documents",
        "document_chunks",
        "plagiarism_matches",
        "search_cache",
    ]

    for table_name in known_tables:
        try:
            res = client.table(table_name).select("*").limit(1).execute()
            status["tables"][table_name] = {
                "accessible": True,
                "rows_sample": len(res.data),
            }
        except Exception as e:
            err_msg = str(e)
            if (
                "PGRST204" in err_msg
                or "PGRST205" in err_msg
                or "does not exist" in err_msg
            ):
                status["tables"][table_name] = {
                    "accessible": False,
                    "reason": "Table does not exist",
                }
            else:
                status["tables"][table_name] = {
                    "accessible": False,
                    "reason": err_msg[:100],
                }

    # Xác định trạng thái kết nối chung
    if status["storage"].startswith("OK") or any(
        t.get("accessible") for t in status["tables"].values()
    ):
        status["connected"] = True

    return status


# Proxy client khởi tạo sẵn
try:
    if settings.SUPABASE_URL and settings.SUPABASE_KEY:
        supabase = get_supabase_client()
    else:
        supabase = None
except Exception:
    supabase = None