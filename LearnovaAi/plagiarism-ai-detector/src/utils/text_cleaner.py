import re
import unicodedata
from typing import List


class TextCleaner:
    """Tách câu, làm sạch và chuẩn hóa văn bản tiếng Việt."""

    @staticmethod
    def normalize_vietnamese(text: str) -> str:
        """Chuẩn hóa Unicode tiếng Việt (NFC)."""
        text = unicodedata.normalize("NFC", text)
        # Xóa ký tự vô hình, khoảng trắng thừa
        text = re.sub(r"[\r\t\f\v ]+", " ", text)
        text = re.sub(r"\n+", "\n", text)
        return text.strip()

    @staticmethod
    def split_sentences(text: str) -> List[str]:
        """Tách câu dựa theo dấu ngắt câu phổ biến trong văn bản tiếng Việt/tiếng Anh."""
        raw_sentences = re.split(r"(?<=[.!?…])\s+", text)
        return [s.strip() for s in raw_sentences if len(s.strip()) > 3]

    @staticmethod
    def remove_stopwords(text: str, stopwords: set) -> str:
        words = text.split()
        return " ".join([w for w in words if w.lower() not in stopwords])
