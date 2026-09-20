from pydantic import BaseModel, HttpUrl
from typing import List, Optional, Any, Dict
from datetime import datetime


class MatchDetail(BaseModel):
    chunk_id: Optional[str] = None
    source_type: str = "web"  # 'web' | 'internal_db'
    matched_url: Optional[str] = None
    matched_document_id: Optional[str] = None
    matched_text: str
    similarity_score: float


class PlagiarismCheckResponse(BaseModel):
    document_id: str
    title: str
    word_count: int
    total_chunks: int
    matched_chunks_count: int
    plagiarism_score: float
    is_plagiarized: bool
    matches: List[MatchDetail] = []
    status: str = "completed"
    message: str = "Kiểm tra hoàn tất."


class TimestampVerificationResponse(BaseModel):
    url: str
    published_date: Optional[datetime] = None
    verification_source: str  # 'meta_tags' | 'schema_org' | 'wayback_archive' | 'unknown'
    confidence: float


class AIDetectionResponse(BaseModel):
    ai_probability: float
    is_ai_generated: bool
    perplexity_score: float
    burstiness_score: float
    summary: str
