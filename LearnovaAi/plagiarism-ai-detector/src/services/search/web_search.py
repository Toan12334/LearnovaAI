from typing import Dict, List, Optional
import httpx
from src.core.config import settings
from src.core.logging import logger


class WebSearchService:
    """[GD1] Tìm kiếm các nguồn nghi vấn qua Serper.dev API."""

    def __init__(self):
        self.api_key = settings.SEARCH_API_KEY
        self.api_url = settings.SERPER_SEARCH_URL

    async def search_query(
        self, query: str, top_k: int = 5
    ) -> List[Dict[str, str]]:
        """Gửi truy vấn tìm kiếm các website có nội dung tương đồng (Async).

        Trả về danh sách: [{'url': ..., 'title': ..., 'snippet': ...}]
        """
        if not self.api_key:
            logger.warning("SEARCH_API_KEY chưa được cấu hình trong file .env!")
            return []

        headers = {
            "X-API-KEY": self.api_key,
            "Content-Type": "application/json",
        }

        payload = {
            "q": query,
            "gl": "vn",
            "hl": "vi",
            "num": top_k,
        }

        logger.info(f"Đang tìm kiếm web cho query: {query[:60]}...")

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    self.api_url, headers=headers, json=payload
                )
                response.raise_for_status()
                data = response.json()

                results = []
                organic_results = data.get("organic", [])

                for item in organic_results[:top_k]:
                    results.append(
                        {
                            "url": item.get("link", ""),
                            "title": item.get("title", ""),
                            "snippet": item.get("snippet", ""),
                        }
                    )

                logger.info(f"Serper API: Nhận {len(results)} kết quả cho query.")
                return results

        except httpx.HTTPStatusError as e:
            logger.error(f"Lỗi HTTP từ Serper API: {e.response.status_code} - {e.response.text}")
        except httpx.RequestError as e:
            logger.error(f"Lỗi kết nối tới Serper API: {e}")
        except Exception as e:
            logger.error(f"Lỗi không xác định trong WebSearchService: {e}")

        return []

    def search_query_sync(
        self, query: str, top_k: int = 5
    ) -> List[Dict[str, str]]:
        """Gửi truy vấn tìm kiếm đồng bộ (Sync)."""
        if not self.api_key:
            return []

        headers = {
            "X-API-KEY": self.api_key,
            "Content-Type": "application/json",
        }

        payload = {
            "q": query,
            "gl": "vn",
            "hl": "vi",
            "num": top_k,
        }

        try:
            with httpx.Client(timeout=10.0) as client:
                response = client.post(self.api_url, headers=headers, json=payload)
                if response.status_code == 200:
                    data = response.json()
                    results = []
                    for item in data.get("organic", [])[:top_k]:
                        results.append(
                            {
                                "url": item.get("link", ""),
                                "title": item.get("title", ""),
                                "snippet": item.get("snippet", ""),
                            }
                        )
                    return results
        except Exception as e:
            logger.error(f"Lỗi truy vấn Serper sync: {e}")
        return []


web_search_service = WebSearchService()