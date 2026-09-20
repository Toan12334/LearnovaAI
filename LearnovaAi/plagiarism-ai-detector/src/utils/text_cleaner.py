import re
import unicodedata
from typing import List


class TextCleaner:
    @staticmethod
    def normalize_vietnamese(text: str) -> str:
        """Chuẩn hóa Unicode tiếng Việt (NFC) và định dạng khoảng trắng."""
        if not text:
            return ""
        text = unicodedata.normalize("NFC", text)
        # Chuẩn hóa xuống dòng Windows/Mac cũ về \n trước
        text = text.replace("\r\n", "\n").replace("\r", "\n")
        # Xóa khoảng trắng thừa trên cùng 1 dòng
        text = re.sub(r"[ \t\f\v]+", " ", text)
        # Xóa dòng trống liên tiếp
        text = re.sub(r"\n+", "\n", text)
        return text.strip()

    @staticmethod
    def split_sentences(text: str) -> List[str]:
        """Tách câu thông minh xử lý các trường hợp viết tắt phổ biến (TP.HCM, ThS., v.v.)."""
        if not text:
            return []
        pattern = r"(?<!\b[A-Za-zĐđ]\.)(?<!\b[A-ZĐ][a-zà-ỹ]\.)(?<=[.!?…])\s+"
        sentences = re.split(pattern, text)
        # Tách tiếp nếu có dấu xuống dòng ngăn cách đoạn văn
        refined = []
        for s in sentences:
            sub = [p.strip() for p in s.split("\n") if p.strip()]
            refined.extend(sub)
        return refined

    @classmethod
    def clean_and_split(cls, text: str, min_length: int = 10) -> List[str]:
        """
        Chuẩn hóa văn bản và cắt thành danh sách N câu hoàn chỉnh.
        Loại bỏ các câu/ký tự vụn vặt có độ dài < min_length.
        """
        normalized = cls.normalize_vietnamese(text)
        sentences = cls.split_sentences(normalized)
        return [s for s in sentences if len(s.strip()) >= min_length]

    @staticmethod
    def count_words(text: str) -> int:
        """Đếm tổng số từ trong văn bản."""
        if not text:
            return 0
        return len(text.strip().split())


if __name__ == "__main__":
    sample_text = """
    Trí tuệ nhân tạo (AI) đang phát triển rất nhanh tại TP.HCM và Hà Nội. 
    ThS. Nguyễn Văn A cho biết mô hình mới đạt độ chính xác đến 95.5%! 
    
    Bạn có muốn thử kiểm tra bài viết này không? Đây là một đoạn văn mẫu.
    """
    sentences = TextCleaner.clean_and_split(sample_text)
    for i, sentence in enumerate(sentences, 1):
        print(f"Câu {i}: {sentence}")
    print(f"Tổng số từ: {TextCleaner.count_words(sample_text)}")