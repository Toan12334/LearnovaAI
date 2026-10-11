"""Async Serper Search and Fast Web Scraper with Trafilatura and In-Memory RAM Caching."""

import asyncio
from typing import Dict, List, Optional
from urllib.parse import urlparse

import httpx

try:
    import trafilatura
except ImportError:
    trafilatura = None

from src.core.config import settings
from src.core.logging import logger


class AsyncWebScraper:
    """Fetch candidate URLs via Serper and scrape readable main content with in-memory RAM cache."""

    def __init__(self) -> None:
        # In-memory RAM cache (Key: URL, Value: Text content)
        self._content_cache: Dict[str, str] = {}

    @staticmethod
    def _is_safe_url(url: str) -> bool:
        """Filter out non-http(s) or malformed URLs."""
        if not url:
            return False
        parsed = urlparse(url)
        return parsed.scheme in {"http", "https"} and bool(parsed.netloc)

    async def fetch_candidate_urls(self, queries: List[str], top_k: int = 5) -> List[str]:
        """
        Send async requests to Serper API (https://google.serper.dev/search)
        and collect Top 3--5 URLs per query.
        """
        if not queries:
            return []

        if not settings.SEARCH_API_KEY:
            logger.warning("SEARCH_API_KEY is not configured; skipping Serper Internet search.")
            return []

        search_url = settings.SERPER_SEARCH_URL or "https://google.serper.dev/search"
        headers = {
            "X-API-KEY": settings.SEARCH_API_KEY,
            "Content-Type": "application/json",
        }
        concurrency = getattr(settings, "INTERNET_SEARCH_CONCURRENCY", 5)
        semaphore = asyncio.Semaphore(concurrency)

        async def search_single_query(client: httpx.AsyncClient, query: str) -> List[str]:
            async with semaphore:
                try:
                    payload = {
                        "q": query,
                        "gl": "vn",
                        "hl": "vi",
                        "num": top_k,
                    }
                    response = await client.post(search_url, headers=headers, json=payload, timeout=10.0)
                    response.raise_for_status()
                    data = response.json()
                    organic = data.get("organic", [])
                    return [item.get("link", "") for item in organic[:top_k] if item.get("link")]
                except Exception as exc:
                    logger.warning("Serper search failed for query '%s': %s", query, exc)
                    return []

        async with httpx.AsyncClient(timeout=12.0, follow_redirects=True) as client:
            results = await asyncio.gather(*(search_single_query(client, q) for q in queries))

        # Flatten, validate, and de-duplicate while preserving ranking order
        all_urls: List[str] = []
        seen = set()
        for group in results:
            for url in group:
                if self._is_safe_url(url) and url not in seen:
                    seen.add(url)
                    all_urls.append(url)

        return all_urls

    @staticmethod
    def _extract_main_text(html: str) -> str:
        """
        Extract clean article body text using trafilatura (strips ads, menu, footer, nav),
        then post-process and normalize Unicode NFC using TextCleaner.
        """
        if not html:
            return ""
        extracted = ""
        if trafilatura:
            try:
                extracted = (
                    trafilatura.extract(
                        html,
                        include_comments=False,
                        include_tables=False,
                        include_images=False,
                        no_fallback=False,
                        output_format="txt",
                    )
                    or ""
                )
            except Exception as exc:
                logger.debug("Trafilatura extraction error: %s", exc)

        # Fallback to BeautifulSoup if trafilatura extraction is empty or too short
        if not extracted or len(extracted.strip()) < 50:
            try:
                from bs4 import BeautifulSoup

                soup = BeautifulSoup(html, "html.parser")
                for tag in soup(["script", "style", "nav", "footer", "header", "aside", "noscript", "svg"]):
                    tag.decompose()
                extracted = soup.get_text(separator="\n")
            except Exception:
                extracted = html

        # Post-clean with TextCleaner: Unbreak PDF/web line-wraps, remove extra spaces, normalize Vietnamese NFC
        try:
            from src.utils.text_cleaner import TextCleaner

            cleaned = TextCleaner.clean_extracted_document_text(extracted)
            return TextCleaner.normalize_vietnamese(cleaned)
        except Exception:
            return extracted.strip()

    def scrape_single_url_sync(self, url: str) -> str:
        """
        Synchronously scrape and extract clean text from a single URL.
        1. Checks RAM cache
        2. Checks Qdrant Cache (Zero HTTP overhead)
        3. Falls back to fast HTTP GET with trafilatura extraction
        """
        if not url:
            return ""

        # 1. RAM Cache Lookup
        if url in self._content_cache:
            return self._content_cache[url]

        # 2. Qdrant Cache Lookup
        try:
            from src.services.plagiarism.qdrant_cache import internet_qdrant_cache

            qdrant_cached = internet_qdrant_cache.get_cached_url_content(url)
            if qdrant_cached:
                self._content_cache[url] = qdrant_cached
                return qdrant_cached
        except Exception as e:
            logger.debug("Lỗi tra cứu Qdrant cache cho URL '%s': %s", url, e)

        # 3. HTTP GET Fallback
        client_headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 "
                "LearnovaPlagiarismBot/1.0"
            ),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "vi,en-US;q=0.9,en;q=0.8",
        }
        try:
            with httpx.Client(timeout=8.0, follow_redirects=True) as client:
                resp = client.get(url, headers=client_headers)
                resp.raise_for_status()
                content = self._extract_main_text(resp.text)
                if content:
                    self._content_cache[url] = content
                return content
        except Exception as exc:
            logger.info("Không thể cào đồng bộ URL '%s': %s", url, exc)
            return ""

    async def scrape_web_content(self, urls: List[str]) -> Dict[str, str]:
        """
        Scrape main text from candidate URLs concurrently.
        1. Checks in-memory RAM cache
        2. Checks Qdrant Vector Cache (Cache Lookup O(1))
        3. Only performs HTTP GET for previously unseen URLs
        """
        if not urls:
            return {}

        concurrency = getattr(settings, "INTERNET_SCRAPE_CONCURRENCY", 8)
        semaphore = asyncio.Semaphore(concurrency)
        client_headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 "
                "LearnovaPlagiarismBot/1.0"
            ),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "vi,en-US;q=0.9,en;q=0.8",
        }

        async def scrape_single_url(client: httpx.AsyncClient, url: str) -> tuple[str, str]:
            # 1. RAM Cache check
            if url in self._content_cache:
                return url, self._content_cache[url]

            # 2. Qdrant Cache Lookup (Save 2-3s HTTP roundtrip)
            try:
                from src.services.plagiarism.qdrant_cache import internet_qdrant_cache

                qdrant_cached = await asyncio.to_thread(internet_qdrant_cache.get_cached_url_content, url)
                if qdrant_cached:
                    self._content_cache[url] = qdrant_cached
                    return url, qdrant_cached
            except Exception as e:
                logger.debug("Lỗi tra cứu Qdrant cache cho '%s': %s", url, e)

            # 3. HTTP GET Fetch
            async with semaphore:
                try:
                    response = await client.get(url, headers=client_headers)
                    response.raise_for_status()
                    html = response.text
                    content = await asyncio.to_thread(self._extract_main_text, html)
                    if content:
                        self._content_cache[url] = content
                    return url, content
                except Exception as exc:
                    logger.info("Could not scrape URL '%s': %s", url, exc)
                    return url, ""

        async with httpx.AsyncClient(timeout=12.0, follow_redirects=True) as client:
            pairs = await asyncio.gather(*(scrape_single_url(client, u) for u in urls))

        return {url: content for url, content in pairs if content}


web_scraper = AsyncWebScraper()
