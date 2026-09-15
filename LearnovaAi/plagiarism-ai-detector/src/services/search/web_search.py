from typing import Dict, List
import httpx
from src.core.config import settings
from src.core.logging import logger


class WebSearchService:
    """[GD1] Tìm kiếm các nguồn nghi vấn qua Serper.dev API."""

    def __init__(self):
        self.api_key = settings.SEARCH_API_KEY
        self.api_url = "https://google.serper.dev/search"

    async def search_query(
        self, query: str, top_k: int = 5
    ) -> List[Dict[str, str]]:
        """Gửi truy vấn tìm kiếm các website có nội dung tương đồng.

        Trả về danh sách: [{'url': ..., 'title': ..., 'snippet': ...}]
        """
        if not self.api_key:
            logger.error("SEARCH_API_KEY chưa được cấu hình trong file .env!")
            return []

        headers = {
            "X-API-KEY": self.api_key,
            "Content-Type": "application/json",
        }

        payload = {
            "q": query,
            "gl": "vn",  # Giới hạn địa lý: Việt Nam
            "hl": "vi",  # Ngôn ngữ hiển thị: Tiếng Việt
            "num": top_k,  # Số lượng kết quả trả về
        }

        logger.info(f"Đang tìm kiếm web cho query: {query[:50]}...")

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    self.api_url, headers=headers, json=payload
                )
                response.raise_for_status()
                data = response.json()
                print(f"Serper API response: {data}")  

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

                logger.info(
                    f"Thành công: Lấy được {len(results)} kết quả cho query."
                )
                return results

        except httpx.HTTPStatusError as e:
            logger.error(
                f"Lỗi HTTP status từ Serper API: {e.response.status_code} - {e.response.text}"
            )
        except httpx.RequestError as e:
            logger.error(f"Lỗi kết nối tới Serper API: {e}")
        except Exception as e:
            logger.error(f"Lỗi không xác định trong WebSearchService: {e}")

        return []