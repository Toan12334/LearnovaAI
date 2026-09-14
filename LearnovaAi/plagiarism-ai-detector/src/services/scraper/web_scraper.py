from typing import Dict, Any
import httpx
from bs4 import BeautifulSoup
from src.core.logging import logger


class WebScraperService:
    """[GD1] Cào nội dung & metadata từ URL nghi vấn."""

    async def scrape_url(self, url: str) -> Dict[str, Any]:
        """
        Tải nội dung trang web và phân tích văn bản cùng metadata HTML.
        """
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
        try:
            async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
                response = await client.get(url, headers=headers)
                if response.status_code != 200:
                    return {"url": url, "text": "", "meta": {}, "status": response.status_code}

                soup = BeautifulSoup(response.text, "html.parser")

                # Loại bỏ scripts & styles
                for element in soup(["script", "style", "nav", "footer", "header"]):
                    element.extract()

                text = soup.get_text(separator=" ", strip=True)
                return {
                    "url": url,
                    "text": text,
                    "html": response.text,
                    "status": 200
                }
        except Exception as e:
            logger.error(f"Lỗi cào URL {url}: {e}")
            return {"url": url, "text": "", "meta": {}, "status": 500}
