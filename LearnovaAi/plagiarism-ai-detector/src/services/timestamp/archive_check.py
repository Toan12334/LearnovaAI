from typing import Optional
from datetime import datetime
import httpx
from dateutil import parser as date_parser
from src.core.logging import logger


class ArchiveChecker:
    """[GD1] Fallback kiểm tra mốc thời gian sớm nhất qua Wayback Machine (Internet Archive API)."""

    WAYBACK_CDX_API = "http://web.archive.org/cdx/search/cdx"

    @classmethod
    async def get_earliest_snapshot(cls, url: str) -> Optional[datetime]:
        params = {
            "url": url,
            "output": "json",
            "fl": "timestamp",
            "limit": "1",
            "sort": "timestamp:asc"
        }
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(cls.WAYBACK_CDX_API, params=params)
                if resp.status_code == 200:
                    data = resp.json()
                    if len(data) > 1 and len(data[1]) > 0:
                        raw_ts = data[1][0]  # format: YYYYMMDDhhmmss
                        return datetime.strptime(raw_ts, "%Y%m%d%H%M%S")
        except Exception as e:
            logger.error(f"Lỗi kiểm tra Wayback Archive cho {url}: {e}")
        return None
