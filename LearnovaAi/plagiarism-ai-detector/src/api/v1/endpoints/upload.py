from fastapi import APIRouter, File, HTTPException, UploadFile
from src.services.parsers.doc_parser import DocumentParser

router = APIRouter()

MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt"}


@router.post("/parse", summary="Tải lên và trích xuất nội dung file Word / PDF / TXT")
async def parse_uploaded_file(file: UploadFile = File(...)):
    """
    Nhận file PDF, DOCX hoặc TXT từ người dùng, validate kích thước & định dạng,
    sau đó trích xuất văn bản thô kèm các thông số đếm từ, trang, ký tự.
    """
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="Vui lòng chọn một file để tải lên.")

    filename = file.filename
    filename_lower = filename.lower()
    
    # Kiểm tra đuôi file
    if not any(filename_lower.endswith(ext) for ext in ALLOWED_EXTENSIONS):
        raise HTTPException(
            status_code=400,
            detail=f"Định dạng file '{filename}' không được hỗ trợ. Hệ thống chỉ nhận file .pdf, .docx, .txt"
        )

    # Đọc nội dung file
    try:
        content = await file.read()
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Không thể đọc file đã tải lên: {str(exc)}") from exc

    # Kiểm tra kích thước file
    if len(content) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"Kích thước file vượt quá giới hạn cho phép (tối đa 10MB). File của bạn: {round(len(content) / (1024*1024), 2)}MB"
        )

    if len(content) == 0:
        raise HTTPException(status_code=400, detail="File tải lên bị rỗng (0 bytes).")

    # Trích xuất văn bản
    try:
        parsed_result = DocumentParser.parse_file(filename, content)
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err)) from val_err
    except Exception as err:
        raise HTTPException(
            status_code=500,
            detail=f"Lỗi hệ thống khi phân tích file '{filename}': {str(err)}"
        ) from err

    warning = None
    if not parsed_result.text or not parsed_result.text.strip():
        warning = (
            "Không thể trích xuất văn bản từ file (có thể file PDF của bạn là tài liệu quét dạng ảnh scan). "
            "Vui lòng sử dụng file PDF dạng text hoặc file Word."
        )

    return {
        "success": True,
        "filename": parsed_result.filename,
        "file_format": parsed_result.file_format,
        "size_bytes": parsed_result.size_bytes,
        "page_count": parsed_result.page_count,
        "word_count": parsed_result.word_count,
        "char_count": parsed_result.char_count,
        "extracted_text": parsed_result.text,
        "warning": warning,
    }
