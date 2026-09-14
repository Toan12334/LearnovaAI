from typing import Optional
from datetime import datetime
import json
from bs4 import BeautifulSoup
from dateutil import parser as date_parser
from src.core.logging import logger


class DateExtractor:
    """[GD1] Trích xuất ngày xuất bản từ OpenGraph, Meta tags và Schema.org (JSON-LD)."""

    META_DATE_KEYS = [
        "article:published_time",
        "og:published_time",
        "datePublished",
        "publication_date",
        "date",
        "DC.date.issued",
        "pubdate"
    ]

    @classmethod
    def extract_from_html(cls, html: str) -> Optional[datetime]:
        soup = BeautifulSoup(html, "html.parser")

        # 1. Kiểm tra JSON-LD (Schema.org)
        for script in soup.find_all("script", type="application/ld+json"):
            try:
                data = json.loads(script.string or "{}")
                if isinstance(data, dict):
                    date_str = data.get("datePublished") or data.get("dateCreated")
                    if date_str:
                        return date_parser.parse(date_str)
                elif isinstance(data, list):
                    for item in data:
                        date_str = item.get("datePublished") or item.get("dateCreated")
                        if date_str:
                            return date_parser.parse(date_str)
            except Exception:
                continue

        # 2. Kiểm tra Meta Tags
        for meta in soup.find_all("meta"):
            prop = meta.get("property") or meta.get("name")
            if prop in cls.META_DATE_KEYS:
                val = meta.get("content")
                if val:
                    try:
                        return date_parser.parse(val)
                    except Exception:
                        continue

        # 3. Kiểm tra thẻ time tag
        time_tag = soup.find("time")
        if time_tag and time_tag.get("datetime"):
            try:
                return date_parser.parse(time_tag.get("datetime"))
            except Exception:
                pass

        return None
