import asyncio
from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException, UploadFile, File, Depends, BackgroundTasks
from src.models.request import InternetPlagiarismRequest, PlagiarismCheckRequest
from src.models.response import (
    InternetPlagiarismResponse,
    PlagiarismCheckResponse,
    PlagiarismStatusResponse,
    MatchDetail,
)
from src.services.plagiarism.pipeline import plagiarism_pipeline
from src.services.plagiarism.internet_pipeline import internet_plagiarism_service
from src.services.parsers.doc_parser import DocumentParser
from src.core.security import get_optional_current_user

router = APIRouter()


@router.post("/check-internet", response_model=InternetPlagiarismResponse,
             summary="Kiểm tra đạo văn Internet: nguyên văn và diễn đạt lại")
async def check_internet_plagiarism(payload: InternetPlagiarismRequest):
    """Search Serper, scrape Web evidence and semantically re-rank results."""
    try:
        result = await internet_plagiarism_service.check(payload.text)
        return InternetPlagiarismResponse(**result)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Lỗi kiểm tra đạo văn Internet: {str(exc)}") from exc


@router.post("/check", response_model=PlagiarismCheckResponse, summary="[GD1] Kiểm tra đạo văn văn bản theo pipeline chuẩn học thuật")
async def check_plagiarism(
    payload: PlagiarismCheckRequest,
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user),
):
    """
    Quy trình đối soát đạo văn chuẩn học thuật 6 bước tích hợp:
    1. Lưu bài gốc vào Supabase documents (pending).
    2. Tách câu thông minh (TextCleaner).
    3. Lưu các câu vào Supabase document_chunks.
    4. Tạo Vector (EmbeddingService MiniLM 384 dims).
    5. Lưu Vector vào Qdrant.
    6. Đối soát Qdrant & Serper, Winnowing, phân loại EXACT / PARAPHRASED, cập nhật documents.
    """
    try:
        content = payload.get_content()
        effective_user_id = payload.user_id or (current_user["id"] if current_user else None)
        result = await asyncio.to_thread(
            plagiarism_pipeline.run,
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
                match_type=m.get("match_type", "EXACT"),
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
            exact_match_score=result.get("exact_match_score", 0.0),
            paraphrase_score=result.get("paraphrase_score", 0.0),
            is_plagiarized=score > 15.0,
            matches=matches_models,
            status=result.get("status", "completed"),
            message="Kiểm tra đối soát thành công."
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/check-async", response_model=PlagiarismStatusResponse, summary="[GD1] Kiểm tra đạo văn bất đồng bộ (Tránh Timeout cho tài liệu dài)")
async def check_plagiarism_async(
    payload: PlagiarismCheckRequest,
    background_tasks: BackgroundTasks,
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user),
):
    """
    Khởi tạo tác vụ ngầm kiểm tra đạo văn cho các văn bản dài.
    Trả về ngay document_id và tiến trình ban đầu để client polling.
    """
    try:
        content = payload.get_content()
        effective_user_id = payload.user_id or (current_user["id"] if current_user else None)

        # Lưu tài liệu sơ bộ vào Supabase
        from src.db.supabase_client import get_supabase_client
        supabase = get_supabase_client()
        cleaner = plagiarism_pipeline.cleaner
        word_count = cleaner.count_words(content)

        doc_payload = {
            "title": payload.title or "Văn bản kiểm tra ngầm",
            "content": content,
            "word_count": word_count,
            "plagiarism_score": 0.0,
            "ai_score": 0.0,
            "status": "processing",
        }
        if effective_user_id:
            doc_payload["user_id"] = str(effective_user_id)

        try:
            doc_res = supabase.table("documents").insert(doc_payload).execute()
        except Exception:
            doc_payload.pop("user_id", None)
            doc_res = supabase.table("documents").insert(doc_payload).execute()

        document_id = doc_res.data[0]["id"]
        plagiarism_pipeline.update_job_progress(
            document_id,
            10,
            "Đã khởi tạo tác vụ kiểm tra ngầm",
            status="processing",
            extra={"title": doc_payload["title"], "word_count": word_count},
        )

        # Gửi tác vụ chạy ngầm
        def _execute_bg_pipeline():
            plagiarism_pipeline.run(
                content=content,
                title=payload.title,
                user_id=effective_user_id,
                enable_web_search=payload.enable_web_search,
                similarity_threshold=payload.similarity_threshold,
            )

        background_tasks.add_task(_execute_bg_pipeline)

        return PlagiarismStatusResponse(
            document_id=str(document_id),
            status="processing",
            progress_percentage=10,
            current_step="Đã khởi tạo tác vụ kiểm tra ngầm",
            title=doc_payload["title"],
            word_count=word_count,
            message="Tác vụ đang được thực thi ở chế độ nền. Vui lòng polling trạng thái qua /status/{document_id}",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status/{document_id}", response_model=PlagiarismStatusResponse, summary="[GD1] Tra cứu tiến trình và trạng thái theo Document ID")
async def get_check_status(document_id: str):
    """
    Lấy tiến trình thời gian thực (0% - 100%) và trạng thái của tác vụ đối soát.
    """
    job_info = plagiarism_pipeline.get_job_status(document_id)
    if not job_info:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu hoặc tác vụ tương ứng.")

    matches_data = None
    if job_info.get("matches"):
        matches_data = [
            MatchDetail(
                chunk_id=str(m.get("chunk_id")),
                source_type=m.get("source_type", "web"),
                matched_url=m.get("matched_url"),
                matched_document_id=str(m.get("matched_document_id")) if m.get("matched_document_id") else None,
                matched_text=m.get("matched_text", ""),
                similarity_score=float(m.get("similarity_score", 0.0)),
                match_type=m.get("match_type", "EXACT"),
            )
            for m in job_info.get("matches", [])
        ]

    score = job_info.get("plagiarism_score")
    return PlagiarismStatusResponse(
        document_id=str(job_info.get("document_id", document_id)),
        status=job_info.get("status", "processing"),
        progress_percentage=int(job_info.get("progress_percentage", 0)),
        current_step=job_info.get("current_step"),
        title=job_info.get("title"),
        word_count=job_info.get("word_count", 0),
        total_chunks=job_info.get("total_chunks", 0),
        matched_chunks_count=job_info.get("matched_chunks_count", 0),
        plagiarism_score=score,
        exact_match_score=job_info.get("exact_match_score"),
        paraphrase_score=job_info.get("paraphrase_score"),
        is_plagiarized=bool(score and score > 15.0),
        matches=matches_data,
        message="Tra cứu trạng thái thành công.",
    )


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
        result = await asyncio.to_thread(
            plagiarism_pipeline.run,
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
                match_type=m.get("match_type", "EXACT"),
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
            exact_match_score=result.get("exact_match_score", 0.0),
            paraphrase_score=result.get("paraphrase_score", 0.0),
            is_plagiarized=score > 15.0,
            matches=matches_models,
            status=result.get("status", "completed"),
            message="Xử lý file và đối soát đạo văn thành công."
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/reports/{document_id}", summary="[GD1] Lấy báo cáo chi tiết theo Document ID")
async def get_document_report(document_id: str):
    """
    Truy xuất báo cáo chi tiết đã lưu trong Supabase bao gồm thông tin tài liệu và các đoạn trùng khớp.
    """
    try:
        from src.db.supabase_client import get_supabase_client
        supabase = get_supabase_client()
        doc_res = supabase.table("documents").select("*").eq("id", document_id).execute()
        if not doc_res.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu tương ứng.")

        doc_data = doc_res.data[0]

        # Lấy các chunks và matches
        chunks_res = supabase.table("document_chunks").select("id").eq("document_id", document_id).execute()
        chunk_ids = [c["id"] for c in (chunks_res.data or [])]

        matches_list = []
        if chunk_ids:
            matches_res = (
                supabase.table("plagiarism_matches")
                .select("*")
                .in_("chunk_id", chunk_ids)
                .execute()
            )
            matches_list = matches_res.data or []

        return {
            "document": doc_data,
            "total_chunks": len(chunk_ids),
            "matches": matches_list,
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Lỗi truy xuất báo cáo: {str(exc)}")


@router.get("/history", summary="[GD1] Lấy lịch sử tra cứu của user hiện tại")
async def get_user_history(
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user),
):
    """Lấy danh sách lịch sử kiểm tra của user hiện tại từ DB Supabase."""
    if not current_user:
        return {"documents": []}

    user_id = current_user.get("id")
    try:
        from src.db.supabase_client import get_supabase_client
        supabase = get_supabase_client()
        if supabase:
            res = supabase.table("documents").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
            return {"documents": res.data or []}
        return {"documents": []}
    except Exception:
        return {"documents": []}

