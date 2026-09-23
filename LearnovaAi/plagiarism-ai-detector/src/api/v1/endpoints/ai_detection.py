from functools import lru_cache
from collections import defaultdict, deque
from threading import Lock
from time import monotonic, perf_counter
from typing import Deque, DefaultDict

from fastapi import APIRouter, HTTPException, Request
from src.models.request import AIDetectionRequest
from src.models.response import AIDetectionResponse, SentenceDetail
from src.services.ai_detector import AIDetectorService

router = APIRouter()
_RATE_LIMIT = 10
_RATE_WINDOW_SECONDS = 60.0
_request_history: DefaultDict[str, Deque[float]] = defaultdict(deque)
_rate_limit_lock = Lock()


@lru_cache(maxsize=1)
def get_ai_detector_service() -> AIDetectorService:
    """Return the process-wide detector so model weights are loaded once."""
    return AIDetectorService()


def generate_summary(overall_ai_score: float, is_reliable: bool) -> str:
    """Generate a summary for the combined statistical signal."""
    if not is_reliable:
        return "Không thể kết luận: không có đủ câu để tạo tín hiệu thống kê AI đáng tin cậy."
    if overall_ai_score >= 80:
        return f"Rất cao ({overall_ai_score:.2f}%): văn bản có dấu hiệu mạnh do AI tạo ra."
    if overall_ai_score >= 50:
        return f"Trung bình ({overall_ai_score:.2f}%): một phần văn bản có thể do AI viết."
    if overall_ai_score >= 20:
        return f"Thấp ({overall_ai_score:.2f}%): phần lớn văn bản có dấu hiệu do con người viết."
    return f"Rất thấp ({overall_ai_score:.2f}%): văn bản có ít dấu hiệu do AI tạo ra."


def enforce_rate_limit(client_key: str) -> None:
    """Apply a lightweight per-process limit to expensive model inferences."""
    now = monotonic()
    with _rate_limit_lock:
        history = _request_history[client_key]
        while history and now - history[0] >= _RATE_WINDOW_SECONDS:
            history.popleft()
        if len(history) >= _RATE_LIMIT:
            raise HTTPException(
                status_code=429,
                detail="Too many AI detection requests. Please retry in one minute.",
            )
        history.append(now)


@router.post("/detect", response_model=AIDetectionResponse, summary="[GD2] Endpoint phát hiện AI")
async def detect_ai_generated_content(payload: AIDetectionRequest, request: Request):
    """Run the Perplexity + Burstiness detector and return heatmap details."""
    enforce_rate_limit(request.client.host if request.client else "unknown")
    started_at = perf_counter()
    try:
        result = await get_ai_detector_service().analyze_large_document(payload.text)
        heatmap = [
            SentenceDetail(
                sentence_index=item["sentence_index"], text=item["text"],
                ai_score=item["ai_score"], human_score=item["human_score"],
                is_ai=item["is_ai"],
                perplexity_score=item.get("perplexity_score"),
                burstiness_score=item.get("burstiness_score"),
            )
            for item in result["sentence_heatmap"]
        ]
        overall_score = float(result["overall_ai_score"])
        model_health = result["model_health"]
        is_reliable = bool(model_health["is_reliable"])
        return AIDetectionResponse(
            ai_probability=round(overall_score / 100, 4) if is_reliable else None,
            statistical_score_percentage=overall_score,
            ai_generated_percentage=result["ai_generated_percentage"],
            human_written_percentage=result["human_written_percentage"],
            ai_sentence_percentage=result["ai_sentence_percentage"],
            human_sentence_percentage=result["human_sentence_percentage"],
            is_ai_generated=overall_score >= 50.0 if is_reliable else None,
            summary=generate_summary(overall_score, is_reliable),
            sentence_heatmap=heatmap,
            flagged_sentence_ratio=result["flagged_sentence_ratio"],
            model_health=model_health,
            total_chunks=result["total_chunks"],
            processing_time_ms=round((perf_counter() - started_at) * 1000, 2),
        )
    except (RuntimeError, ValueError) as exc:
        raise HTTPException(status_code=503, detail="AI detector is temporarily unavailable.") from exc
