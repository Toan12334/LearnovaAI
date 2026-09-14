from pydantic import BaseModel, HttpUrl
from typing import List, Optional
from datetime import datetime


class MatchDetail(BaseModel):
    source_url: Optional[str] = None
    similarity_score: float
    matched_text: str
    match_type: str  # 'exact' (Winnowing) | 'semantic' (Vector DB)
    published_date: Optional[datetime] = None


class PlagiarismCheckResponse(BaseModel):
    total_similarity: float
    is_plagiarized: bool
    matches: List[MatchDetail] = []
    message: str = "Success"


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
