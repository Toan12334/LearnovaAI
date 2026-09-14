from typing import List, Dict
import httpx
from src.core.config import settings
from src.core.logging import logger


class WebSearchService:
    """[GD1] Tìm kiếm các nguồn nghi vấn qua Google/Bing/Custom Search API."""

    def __init__(self):
        self.api_key = settings.SEARCH_API_KEY
        self.engine_id = settings.SEARCH_ENGINE_ID

    async def search_query(self, query: str, top_k: int = 5) -> List[Dict[str, str]]:
        """
        Gửi truy vấn tìm kiếm các website có nội dung tương đồng.
        Trả về danh sách: [{'url': ..., 'title': ..., 'snippet': ...}]
        """
        # Placeholder cho Google Custom Search / Serper / Bing API
        logger.info(f"Đang tìm kiếm web cho query: {query[:50]}...")
        return []
