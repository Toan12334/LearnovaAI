from io import BytesIO
import pypdf
import docx


class DocumentParser:
    """Trích xuất văn bản thô từ PDF, DOCX, TXT."""

    @staticmethod
    def parse_txt(content: bytes) -> str:
        return content.decode("utf-8", errors="ignore")

    @staticmethod
    def parse_pdf(content: bytes) -> str:
        reader = pypdf.PdfReader(BytesIO(content))
        text_pages = [page.extract_text() or "" for page in reader.pages]
        return "\n".join(text_pages)

    @staticmethod
    def parse_docx(content: bytes) -> str:
        doc = docx.Document(BytesIO(content))
        return "\n".join([p.text for p in doc.paragraphs if p.text])

    @classmethod
    def extract_text(cls, filename: str, content: bytes) -> str:
        filename_lower = filename.lower()
        if filename_lower.endswith(".pdf"):
            return cls.parse_pdf(content)
        elif filename_lower.endswith(".docx"):
            return cls.parse_docx(content)
        elif filename_lower.endswith(".txt"):
            return cls.parse_txt(content)
        else:
            raise ValueError(f"Định dạng file không được hỗ trợ: {filename}")
