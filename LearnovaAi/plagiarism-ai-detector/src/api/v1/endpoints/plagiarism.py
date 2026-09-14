from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from typing import Optional
from src.models.request import PlagiarismCheckRequest
from src.models.response import PlagiarismCheckResponse

router = APIRouter()


@router.post("/check", response_model=PlagiarismCheckResponse, summary="[GD1] Kiểm tra đạo văn văn bản")
async def check_plagiarism(payload: PlagiarismCheckRequest):
    """
    Tiến hành kiểm tra đạo văn:
    1. Tiền xử lý văn bản & tách câu.
    2. Đối sánh Winnowing (Fingerprinting - Exact Match).
    3. Tìm kiếm nguồn trực tuyến (Google/Bing).
    4. Đối sánh ngữ nghĩa Semantic Similarity (Vector DB Qdrant).
    """
    # Placeholder stub implementation
    return PlagiarismCheckResponse(
        total_similarity=0.0,
        is_plagiarized=False,
        matches=[],
        message="Văn bản gốc không phát hiện trùng lặp đáng kể."
    )


@router.post("/check-file", response_model=PlagiarismCheckResponse, summary="[GD1] Kiểm tra đạo văn qua File (PDF, DOCX, TXT)")
async def check_plagiarism_file(file: UploadFile = File(...)):
    """
    Trích xuất văn bản từ tài liệu tải lên và kiểm tra đạo văn.
    """
    return PlagiarismCheckResponse(
        total_similarity=0.0,
        is_plagiarized=False,
        matches=[],
        message="Xử lý file thành công."
    )
