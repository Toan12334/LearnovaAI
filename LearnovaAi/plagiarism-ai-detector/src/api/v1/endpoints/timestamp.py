from fastapi import APIRouter, HTTPException
from src.models.request import TimestampVerificationRequest
from src.models.response import TimestampVerificationResponse

router = APIRouter()


@router.post("/verify", response_model=TimestampVerificationResponse, summary="[GD1] Truy vết thời gian xuất bản nguồn")
async def verify_timestamp(payload: TimestampVerificationRequest):
    """
    Truy vết và xác minh mốc thời gian xuất bản:
    1. Trích xuất metadata, OpenGraph, Schema.org từ URL nguồn.
    2. Fallback kiểm tra Wayback Machine (Internet Archive API).
    """
    return TimestampVerificationResponse(
        url=str(payload.url),
        published_date=None,
        verification_source="unknown",
        confidence=0.0
    )
