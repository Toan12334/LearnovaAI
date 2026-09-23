from pydantic import BaseModel, Field, HttpUrl
from typing import Any, Dict, List, Optional
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


class InternetPlagiarismMatch(BaseModel):
    """One exact or paraphrased Internet evidence item."""

    user_text: str
    matched_text: str
    similarity_score: float
    type: str
    source_url: str


class InternetPlagiarismResponse(BaseModel):
    """Internet plagiarism report, independent from internal DB matching."""

    total_chunks_analyzed: int
    plagiarism_percentage: float
    exact_match_percentage: float
    paraphrased_percentage: float
    matches: List[InternetPlagiarismMatch] = Field(default_factory=list)


class TimestampVerificationResponse(BaseModel):
    url: str
    published_date: Optional[datetime] = None
    verification_source: str  # 'meta_tags' | 'schema_org' | 'wayback_archive' | 'unknown'
    confidence: float


class SentenceDetail(BaseModel):
    """Statistical AI-detection result aligned to one source sentence."""

    sentence_index: int
    text: str
    ai_score: float
    human_score: float
    is_ai: Optional[bool]
    perplexity_score: Optional[float] = None
    burstiness_score: Optional[float] = None


class AIDetectionResponse(BaseModel):
    ai_probability: Optional[float]
    statistical_score_percentage: float
    ai_generated_percentage: Optional[float]
    human_written_percentage: Optional[float]
    ai_sentence_percentage: Optional[float]
    human_sentence_percentage: Optional[float]
    is_ai_generated: Optional[bool]
    summary: str
    sentence_heatmap: List[SentenceDetail] = Field(default_factory=list)
    flagged_sentence_ratio: float = 0.0
    model_health: Dict[str, Any] = Field(default_factory=dict)
    total_chunks: int = 0
    processing_time_ms: float = 0.0
