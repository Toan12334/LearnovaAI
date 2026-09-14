from pydantic import BaseModel, Field, HttpUrl
from typing import Optional, List


class PlagiarismCheckRequest(BaseModel):
    text: str = Field(..., min_length=20, description="Văn bản cần kiểm tra đạo văn")
    enable_web_search: bool = Field(default=True, description="Bật tìm kiếm nguồn trực tuyến qua Google/Bing")
    similarity_threshold: float = Field(default=0.75, ge=0.0, le=1.0, description="Ngưỡng tương đồng")


class TimestampVerificationRequest(BaseModel):
    url: HttpUrl = Field(..., description="Đường dẫn nguồn nghi vấn cần xác minh ngày xuất bản")


class AIDetectionRequest(BaseModel):
    text: str = Field(..., min_length=50, description="Văn bản cần phát hiện nội dung do AI sinh ra")
