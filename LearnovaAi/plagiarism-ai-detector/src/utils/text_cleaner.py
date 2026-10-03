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
    def clean_extracted_document_text(raw_text: str) -> str:
        """
        Chuẩn hóa văn bản trích xuất từ PDF/DOCX hoặc văn bản thô:
        - Bỏ các ký tự rác hoặc phân cách bảng '|'
        - Nối các dòng ngắt giữa chừng trong câu (PDF line-wraps)
        - Loại bỏ khoảng trắng thừa và dòng trống dồn dập.
        """
        if not raw_text or not raw_text.strip():
            return ""

        # Thay thế các dấu phân cách bảng | bằng khoảng trắng
        text = raw_text.replace(" | ", " ").replace("|", " ")

        # Chuẩn hóa xuống dòng Windows/Mac
        text = text.replace("\r\n", "\n").replace("\r", "\n")

        lines = [line.strip() for line in text.split("\n")]
        cleaned_paragraphs = []
        current_para = []

        for line in lines:
            if not line:
                if current_para:
                    cleaned_paragraphs.append(" ".join(current_para))
                    current_para = []
                continue

            if not current_para:
                current_para.append(line)
            else:
                prev = current_para[-1]
                # Nếu dòng trước không kết thúc bằng dấu câu dừng câu và độ dài bình thường -> Nối dòng
                if prev and prev[-1] not in ".!?:" and len(prev) > 15:
                    current_para.append(line)
                else:
                    cleaned_paragraphs.append(" ".join(current_para))
                    current_para = [line]

        if current_para:
            cleaned_paragraphs.append(" ".join(current_para))

        # Ghép lại thành các đoạn văn ngăn cách bằng 2 dấu xuống dòng
        result = "\n\n".join(p for p in cleaned_paragraphs if p.strip())
        result = re.sub(r"[ \t\f\v]+", " ", result)
        return result.strip()

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