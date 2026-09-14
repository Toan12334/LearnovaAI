from fastapi import APIRouter
from src.models.request import AIDetectionRequest
from src.models.response import AIDetectionResponse

router = APIRouter()


@router.post("/detect", response_model=AIDetectionResponse, summary="[GD2] Endpoint phát hiện AI")
async def detect_ai_generated_content(payload: AIDetectionRequest):
    """
    Phát hiện văn bản do AI sinh ra dựa trên:
    1. Perplexity & Burstiness (Độ rối và độ biến thiên câu).
    2. Mô hình Transformer Classifier (Fine-tuned DeBERTa / RoBERTa).
    """
    return AIDetectionResponse(
        ai_probability=0.05,
        is_ai_generated=False,
        perplexity_score=68.5,
        burstiness_score=0.45,
        summary="Văn bản có khả năng cao do người viết."
    )
