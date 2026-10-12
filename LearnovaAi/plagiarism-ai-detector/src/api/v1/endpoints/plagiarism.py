import asyncio
from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends, BackgroundTasks, status
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
from src.core.security import get_current_user, get_optional_current_user

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
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Quy trình đối soát đạo văn chuẩn học thuật 6 bước tích hợp:
    Yêu cầu người dùng đăng nhập tài khoản hợp lệ.
    """
    try:
        content = payload.get_content()
        effective_user_id = current_user["id"]

        cleaner = plagiarism_pipeline.cleaner
        word_count = cleaner.count_words(content)

        # Kiểm tra hạn mức từ khả dụng
        words_balance = current_user.get("words_balance", 5000)
        if words_balance is not None and words_balance < word_count:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail=f"Số dư tài khoản không đủ ({words_balance:,} từ khả dụng, tài liệu cần {word_count:,} từ). Vui lòng nạp thêm gói cước.",
            )

        result = await asyncio.to_thread(
            plagiarism_pipeline.run,
            content=content,
            title=payload.title,
            user_id=effective_user_id,
            enable_web_search=payload.enable_web_search,
            similarity_threshold=payload.similarity_threshold,
        )

        # Trừ số từ vào tài khoản sau khi hoàn tất
        if words_balance is not None and effective_user_id:
            try:
                from src.db.supabase_client import get_supabase_client
                new_bal = max(0, words_balance - word_count)
                get_supabase_client().table("profiles").update({"words_balance": new_bal}).eq("id", effective_user_id).execute()
            except Exception:
                pass

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
            coverage_percentage=result.get("coverage_percentage"),
            coverage_text=result.get("coverage_text"),
            warning=result.get("warning"),
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
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Khởi tạo tác vụ ngầm kiểm tra đạo văn cho các văn bản dài.
    Yêu cầu người dùng đăng nhập tài khoản hợp lệ.
    """
    try:
        content = payload.get_content()
        effective_user_id = current_user["id"]

        cleaner = plagiarism_pipeline.cleaner
        word_count = cleaner.count_words(content)

        # Kiểm tra hạn mức từ khả dụng
        words_balance = current_user.get("words_balance", 5000)
        if words_balance is not None and words_balance < word_count:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail=f"Số dư tài khoản không đủ ({words_balance:,} từ khả dụng, bài viết có {word_count:,} từ). Vui lòng nạp thêm gói cước.",
            )

        # Lưu tài liệu sơ bộ vào Supabase
        from src.db.supabase_client import get_supabase_client
        supabase = get_supabase_client()

        doc_payload = {
            "title": payload.title or "Văn bản kiểm tra ngầm",
            "content": content,
            "word_count": word_count,
            "plagiarism_score": 0.0,
            "ai_score": 0.0,
            "status": "processing",
            "user_id": str(effective_user_id),
        }

        try:
            doc_res = supabase.table("documents").insert(doc_payload).execute()
        except Exception:
            doc_payload.pop("user_id", None)
            doc_res = supabase.table("documents").insert(doc_payload).execute()

        # Trừ số từ vào tài khoản
        if words_balance is not None and effective_user_id:
            try:
                new_bal = max(0, words_balance - word_count)
                supabase.table("profiles").update({"words_balance": new_bal}).eq("id", effective_user_id).execute()
            except Exception:
                pass

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
            try:
                plagiarism_pipeline.run(
                    content=content,
                    title=payload.title,
                    user_id=effective_user_id,
                    enable_web_search=payload.enable_web_search,
                    similarity_threshold=payload.similarity_threshold,
                    document_id=document_id,
                )
            except Exception as bg_err:
                from src.core.logging import logger
                logger.error(f"Lỗi khi thực thi background task cho doc {document_id}: {bg_err}", exc_info=True)
                plagiarism_pipeline.update_job_progress(
                    document_id,
                    0,
                    f"Thất bại: {str(bg_err)}",
                    status="failed",
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
        coverage_percentage=job_info.get("coverage_percentage"),
        coverage_text=job_info.get("coverage_text"),
        warning=job_info.get("warning"),
        matches=matches_data,
        message="Tra cứu trạng thái thành công.",
    )


@router.post("/check-file", response_model=PlagiarismCheckResponse, summary="[GD1] Kiểm tra đạo văn qua File (PDF, DOCX, TXT)")
async def check_plagiarism_file(
    file: UploadFile = File(...),
    similarity_threshold: Optional[float] = Form(None),
    enable_web_search: bool = Form(True),
    title: Optional[str] = Form(None),
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

        cleaner = plagiarism_pipeline.cleaner
        word_count = cleaner.count_words(extracted_text)

        effective_user_id = current_user["id"] if current_user else None
        if current_user:
            words_balance = current_user.get("words_balance", 5000)
            if words_balance is not None and words_balance < word_count:
                raise HTTPException(
                    status_code=status.HTTP_402_PAYMENT_REQUIRED,
                    detail=f"Số dư tài khoản không đủ ({words_balance:,} từ khả dụng, tài liệu cần {word_count:,} từ). Vui lòng nạp thêm gói cước.",
                )

        doc_title = title.strip() if title and title.strip() else file.filename
        result = await asyncio.to_thread(
            plagiarism_pipeline.run,
            content=extracted_text,
            title=doc_title,
            user_id=effective_user_id,
            enable_web_search=enable_web_search,
            similarity_threshold=similarity_threshold,
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
            title=doc_title,
            word_count=result.get("word_count", word_count),
            total_chunks=result.get("total_chunks", 0),
            matched_chunks_count=result.get("matched_chunks_count", 0),
            plagiarism_score=score,
            exact_match_score=result.get("exact_match_score", 0.0),
            paraphrase_score=result.get("paraphrase_score", 0.0),
            is_plagiarized=score > 15.0,
            coverage_percentage=result.get("coverage_percentage"),
            coverage_text=result.get("coverage_text"),
            warning=result.get("warning"),
            matches=matches_models,
            status=result.get("status", "completed"),
            message="Xử lý file và đối soát đạo văn thành công.",
            extracted_text=extracted_text,
        )
    except HTTPException:
        raise
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
        
        # 1. Tra cứu document theo UUID hoặc theo mã PLAG- ngắn
        doc_res = None
        clean_id = document_id.strip()
        if not clean_id.startswith("PLAG-"):
            try:
                doc_res = supabase.table("documents").select("*").eq("id", clean_id).execute()
            except Exception:
                pass

        if not doc_res or not doc_res.data:
            # Fallback nếu truyền short ID (ví dụ PLAG-123456 hoặc đuôi 6 ký tự)
            short_code = clean_id.replace("PLAG-", "").strip().lower()
            try:
                all_recent = supabase.table("documents").select("*").order("created_at", desc=True).limit(50).execute()
                for candidate in (all_recent.data or []):
                    c_id = str(candidate.get("id", "")).lower()
                    if c_id.endswith(short_code) or short_code in c_id:
                        doc_res = type("Res", (), {"data": [candidate]})()
                        clean_id = candidate["id"]
                        break
            except Exception:
                pass

        if not doc_res or not doc_res.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu tương ứng.")

        doc_data = doc_res.data[0]
        actual_doc_id = doc_data["id"]

        # 2. Lấy các chunks và nội dung câu tương ứng
        chunks_res = (
            supabase.table("document_chunks")
            .select("id, chunk_index, content")
            .eq("document_id", actual_doc_id)
            .order("chunk_index", desc=False)
            .execute()
        )
        chunk_map = {c["id"]: c for c in (chunks_res.data or [])}
        chunk_ids = list(chunk_map.keys())

        matches_list = []
        if chunk_ids:
            matches_res = (
                supabase.table("plagiarism_matches")
                .select("*")
                .in_("chunk_id", chunk_ids)
                .execute()
            )
            for m in (matches_res.data or []):
                c_info = chunk_map.get(m.get("chunk_id"), {})
                m["chunk_text"] = c_info.get("content", "")
                m["chunk_index"] = c_info.get("chunk_index", 0)
                matches_list.append(m)

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
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Lấy danh sách lịch sử kiểm tra của user hiện tại từ DB Supabase."""
    user_id = current_user["id"]
    try:
        from src.db.supabase_client import get_supabase_client
        supabase = get_supabase_client()
        if supabase:
            res = supabase.table("documents").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
            return {"documents": res.data or []}
        return {"documents": []}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Lỗi truy vấn lịch sử: {str(exc)}")

