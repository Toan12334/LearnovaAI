import re
from dataclasses import dataclass
from io import BytesIO
from typing import Dict, Any, Optional
import pypdf
import docx

from src.utils.text_cleaner import TextCleaner


@dataclass
class ParseResult:
    text: str
    filename: str
    file_format: str
    size_bytes: int
    page_count: Optional[int] = None
    word_count: int = 0
    char_count: int = 0


def clean_extracted_document_text(raw_text: str) -> str:
    """Wrapper function using TextCleaner.clean_extracted_document_text."""
    return TextCleaner.clean_extracted_document_text(raw_text)


class DocumentParser:
    """Trích xuất văn bản thô và thông tin chi tiết từ PDF, DOCX, TXT."""

    @staticmethod
    def parse_txt(content: bytes) -> tuple[str, int]:
        text = content.decode("utf-8", errors="ignore").strip()
        return clean_extracted_document_text(text), 1

    @staticmethod
    def parse_pdf(content: bytes) -> tuple[str, int]:
        reader = pypdf.PdfReader(BytesIO(content))
        text_pages = [page.extract_text() or "" for page in reader.pages]
        full_text = "\n\n".join(p.strip() for p in text_pages if p.strip()).strip()
        cleaned_text = clean_extracted_document_text(full_text)
        return cleaned_text, len(reader.pages)

    @staticmethod
    def parse_docx(content: bytes) -> tuple[str, int]:
        """
        Trích xuất văn bản thô từ Word (.docx), hỗ trợ bảng lồng nhau (nested tables),
        ô gộp (merged cells), text box và giữ đúng thứ tự xuất hiện trong tài liệu.
        """
        doc = docx.Document(BytesIO(content))
        extracted_lines = []

        def _extract_cell(cell) -> str:
            parts = []
            for p in cell.paragraphs:
                if p.text and p.text.strip():
                    parts.append(p.text.strip())
            # Đệ quy lấy văn bản trong các bảng lồng nhau (Table inside Table)
            for nested_tbl in cell.tables:
                parts.extend(_extract_table(nested_tbl))
            return " ".join(parts)

        def _extract_table(table) -> list[str]:
            table_lines = []
            for row in table.rows:
                row_texts = []
                seen_cell_ids = set()
                for cell in row.cells:
                    # Tránh đọc trùng lặp đối với ô gộp (Merged Cells)
                    cell_id = id(cell._tc)
                    if cell_id in seen_cell_ids:
                        continue
                    seen_cell_ids.add(cell_id)

                    cell_str = _extract_cell(cell)
                    if cell_str.strip():
                        row_texts.append(cell_str.strip())
                if row_texts:
                    # Nối ô bảng bằng khoảng trắng tự nhiên thay vì |
                    table_lines.append(" ".join(row_texts))
            return table_lines

        # Duyệt từng phần tử trong body theo đúng thứ tự xuất hiện
        for element in doc.element.body:
            if element.tag.endswith("p"):
                p = docx.text.paragraph.Paragraph(element, doc)
                if p.text and p.text.strip():
                    extracted_lines.append(p.text.strip())
            elif element.tag.endswith("tbl"):
                tbl = docx.table.Table(element, doc)
                extracted_lines.extend(_extract_table(tbl))

        # Đọc bổ sung các Text Box (Khung chữ) nếu có
        try:
            for txbx in doc.element.body.xpath(".//w:txbxContent"):
                for p in txbx.xpath(".//w:p"):
                    p_text = "".join(t.text for t in p.xpath(".//w:t") if t.text).strip()
                    if p_text and p_text not in extracted_lines:
                        extracted_lines.append(p_text)
        except Exception:
            pass

        full_text = "\n\n".join(extracted_lines).strip()
        cleaned_text = clean_extracted_document_text(full_text)
        return cleaned_text, 1

    @classmethod
    def parse_file(cls, filename: str, content: bytes) -> ParseResult:
        filename_lower = filename.lower()
        size_bytes = len(content)

        if filename_lower.endswith(".pdf"):
            file_format = "pdf"
            text, page_count = cls.parse_pdf(content)
        elif filename_lower.endswith(".docx"):
            file_format = "docx"
            text, page_count = cls.parse_docx(content)
        elif filename_lower.endswith(".txt"):
            file_format = "txt"
            text, page_count = cls.parse_txt(content)
        else:
            raise ValueError(f"Định dạng file không được hỗ trợ: {filename}. Hệ thống hỗ trợ .pdf, .docx, .txt")

        word_count = len(text.split()) if text else 0
        char_count = len(text)

        return ParseResult(
            text=text,
            filename=filename,
            file_format=file_format,
            size_bytes=size_bytes,
            page_count=page_count,
            word_count=word_count,
            char_count=char_count,
        )

    @classmethod
    def extract_text(cls, filename: str, content: bytes) -> str:
        result = cls.parse_file(filename, content)
        return result.text


