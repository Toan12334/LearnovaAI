from pydantic import BaseModel, Field, HttpUrl
from typing import Optional, List


class PlagiarismCheckRequest(BaseModel):
    user_id: Optional[str] = Field(default=None, description="ID của người dùng sở hữu bài viết")
    title: Optional[str] = Field(default="Untitled Document", description="Tiêu đề bài viết")
    text: Optional[str] = Field(default=None, description="Văn bản cần kiểm tra đạo văn")
    content: Optional[str] = Field(default=None, description="Văn bản cần kiểm tra đạo văn (alias của text)")
    enable_web_search: bool = Field(default=True, description="Bật tìm kiếm nguồn trực tuyến qua Serper")
    similarity_threshold: Optional[float] = Field(default=0.75, ge=0.0, le=1.0, description="Ngưỡng tương đồng")

    def get_content(self) -> str:
        res = self.content or self.text or ""
        if len(res.strip()) < 15:
            raise ValueError("Nội dung bài viết quá ngắn để kiểm tra (tối thiểu 15 ký tự).")
        return res


class InternetPlagiarismRequest(BaseModel):
    """Request for asynchronous Internet plagiarism scanning."""

    text: str = Field(..., min_length=50, max_length=1_500_000,
                      description="Văn bản cần kiểm tra Internet, hỗ trợ tài liệu 70+ trang.")


class TimestampVerificationRequest(BaseModel):
    url: HttpUrl = Field(..., description="Đường dẫn nguồn nghi vấn cần xác minh ngày xuất bản")


class AIDetectionRequest(BaseModel):
    text: str = Field(
        ..., min_length=50, max_length=300_000,
        description="Văn bản cần phát hiện nội dung do AI sinh ra (tối đa khoảng 70+ trang).",
    )
    language: str = Field(default="auto", pattern="^(auto|vi|en)$", description="Ngôn ngữ văn bản")
