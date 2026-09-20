"""
Pydantic Schemas for Authentication & User Profiles
"""

import re
from typing import Optional
from pydantic import BaseModel, Field, field_validator

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")


class SignUpRequest(BaseModel):
    email: str = Field(..., description="Email đăng ký tài khoản (ví dụ: user@learnova.ai)")
    password: str = Field(..., min_length=6, description="Mật khẩu tối thiểu 6 ký tự")
    full_name: Optional[str] = Field(default=None, max_length=150, description="Họ và tên hiển thị")
    avatar_url: Optional[str] = Field(default=None, description="URL ảnh đại diện")

    @field_validator("email")
    @classmethod
    def validate_email_format(cls, v: str) -> str:
        clean = v.strip().lower()
        if not EMAIL_REGEX.match(clean):
            raise ValueError("Địa chỉ email không đúng định dạng.")
        return clean


class SignInRequest(BaseModel):
    email: str = Field(..., description="Email đăng nhập")
    password: str = Field(..., description="Mật khẩu tài khoản")

    @field_validator("email")
    @classmethod
    def validate_email_format(cls, v: str) -> str:
        clean = v.strip().lower()
        if not EMAIL_REGEX.match(clean):
            raise ValueError("Địa chỉ email không đúng định dạng.")
        return clean


class UserProfileResponse(BaseModel):
    id: str
    email: str
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    created_at: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str = Field(..., description="JWT Bearer Token")
    token_type: str = Field(default="bearer", description="Loại token")
    expires_in: Optional[int] = Field(default=None, description="Thời gian hết hạn (giây)")
    refresh_token: Optional[str] = Field(default=None, description="Refresh token")
    user: UserProfileResponse


class SignUpResponse(BaseModel):
    message: str
    user_id: Optional[str] = None
    email: str
    requires_email_confirmation: bool = False
    access_token: Optional[str] = None
    user: Optional[UserProfileResponse] = None


class RefreshTokenRequest(BaseModel):
    refresh_token: str = Field(..., description="Refresh token cần gia hạn")


class SignOutResponse(BaseModel):
    message: str = "Đăng xuất thành công."
