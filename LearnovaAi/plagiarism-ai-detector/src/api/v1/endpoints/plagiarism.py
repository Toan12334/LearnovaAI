from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException, UploadFile, File, Depends
from src.models.request import PlagiarismCheckRequest
from src.models.response import PlagiarismCheckResponse, MatchDetail
from src.services.plagiarism.pipeline import plagiarism_pipeline
from src.services.parsers.doc_parser import DocumentParser
from src.core.security import get_optional_current_user

router = APIRouter()


@router.post("/check", response_model=PlagiarismCheckResponse, summary="[GD1] Kiểm tra đạo văn văn bản theo pipeline 6 bước")
async def check_plagiarism(
    payload: PlagiarismCheckRequest,
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user),
):
    """
    Quy trình đối soát đạo văn 6 bước:
    1. Lưu bài gốc vào Supabase documents (pending).
    2. Tách câu (TextCleaner).
    3. Lưu các câu vào Supabase document_chunks.
    4. Tạo Vector (EmbeddingService FastEmbed).
    5. Lưu Vector vào Qdrant.
    6. Đối soát Qdrant & Serper, lưu plagiarism_matches, cập nhật documents completed.
    """
    try:
        content = payload.get_content()
        effective_user_id = payload.user_id or (current_user["id"] if current_user else None)
        result = plagiarism_pipeline.run(
            content=content,
            title=payload.title,
            user_id=effective_user_id,
            enable_web_search=payload.enable_web_search,
            similarity_threshold=payload.similarity_threshold,
        )

        matches_models = [
            MatchDetail(
                chunk_id=str(m.get("chunk_id")),
                source_type=m.get("source_type", "web"),
                matched_url=m.get("matched_url"),
                matched_document_id=str(m.get("matched_document_id")) if m.get("matched_document_id") else None,
                matched_text=m.get("matched_text", ""),
                similarity_score=float(m.get("similarity_score", 0.0)),
            )
            for m in result.get("matches", [])
        ]

        score = result.get("plagiarism_score", 0.0)
        return PlagiarismCheckResponse(
            document_id=str(result["document_id"]),
            title=result.get("title", "Untitled Document"),
            word_count=result.get("word_count", 0),
            total_chunks=result.get("total_chunks", 0),
            matched_chunks_count=result.get("matched_chunks_count", 0),
            plagiarism_score=score,
            is_plagiarized=score > 15.0,
            matches=matches_models,
            status=result.get("status", "completed"),
            message="Kiểm tra đối soát thành công."
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/check-file", response_model=PlagiarismCheckResponse, summary="[GD1] Kiểm tra đạo văn qua File (PDF, DOCX, TXT)")
async def check_plagiarism_file(
    file: UploadFile = File(...),
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user),
):
    """
    Trích xuất văn bản từ tài liệu tải lên và chạy qua pipeline 6 bước.
    """
    try:
        file_bytes = await file.read()
        extracted_text = DocumentParser.extract_text(file.filename, file_bytes)
        if len(extracted_text.strip()) < 15:
            raise HTTPException(status_code=400, detail="Nội dung file quá ngắn hoặc không đọc được văn bản.")

        effective_user_id = current_user["id"] if current_user else None
        result = plagiarism_pipeline.run(
            content=extracted_text,
            title=file.filename,
            user_id=effective_user_id,
            enable_web_search=True,
        )

        matches_models = [
            MatchDetail(
                chunk_id=str(m.get("chunk_id")),
                source_type=m.get("source_type", "web"),
                matched_url=m.get("matched_url"),
                matched_document_id=str(m.get("matched_document_id")) if m.get("matched_document_id") else None,
                matched_text=m.get("matched_text", ""),
                similarity_score=float(m.get("similarity_score", 0.0)),
            )
            for m in result.get("matches", [])
        ]

        score = result.get("plagiarism_score", 0.0)
        return PlagiarismCheckResponse(
            document_id=str(result["document_id"]),
            title=file.filename,
            word_count=result.get("word_count", 0),
            total_chunks=result.get("total_chunks", 0),
            matched_chunks_count=result.get("matched_chunks_count", 0),
            plagiarism_score=score,
            is_plagiarized=score > 15.0,
            matches=matches_models,
            status=result.get("status", "completed"),
            message="Xử lý file và đối soát đạo văn thành công."
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
