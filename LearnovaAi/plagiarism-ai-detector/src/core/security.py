"""
Security & JWT Helper Module
Cung cấp các hàm tạo/giải mã JWT token và FastAPI dependencies xác thực người dùng.
"""

from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from src.core.config import settings
from src.core.logging import logger
from src.db.supabase_client import get_supabase_client

# Sử dụng HTTPBearer để tự động parse header Authorization: Bearer <token>
bearer_scheme = HTTPBearer(auto_error=False)


def create_access_token(
    data: Dict[str, Any],
    expires_delta: Optional[timedelta] = None
) -> str:
    """
    Tạo JSON Web Token (JWT) cho phiên làm việc của người dùng.
    """
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({
        "iat": now,
        "exp": expire,
        "iss": "learnova-ai-auth"
    })
    encoded_jwt = jwt.encode(
        to_encode,
        settings.JWT_SECRET,
        algorithm=settings.JWT_ALGORITHM
    )
    return encoded_jwt


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Giải mã và xác minh tính hợp lệ của JWT token nội bộ.
    """
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM]
        )
        return payload
    except jwt.ExpiredSignatureError:
        logger.warning("Token đã hết hạn.")
        return None
    except jwt.InvalidTokenError as e:
        logger.warning(f"Token không hợp lệ: {e}")
        return None


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme)
) -> Dict[str, Any]:
    """
    FastAPI Dependency: Bắt buộc xác thực người dùng qua JWT Bearer token.
    Hỗ trợ cả token do Supabase sinh ra và token JWT của hệ thống.
    """
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Yêu cầu cung cấp Authorization Bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    user_info = None

    # 1. Thử xác thực trực tiếp qua Supabase Auth API
    try:
        supabase = get_supabase_client()
        user_response = supabase.auth.get_user(token)
        if user_response and user_response.user:
            sb_user = user_response.user
            user_info = {
                "id": str(sb_user.id),
                "email": sb_user.email,
                "user_metadata": sb_user.user_metadata or {},
            }
    except Exception:
        # Nếu không phải Supabase GoTrue token, tiếp tục thử decode JWT nội bộ
        pass

    # 2. Nếu Supabase Auth API không nhận diện, thử giải mã bằng JWT_SECRET của ứng dụng
    if not user_info:
        payload = decode_access_token(token)
        if payload and "sub" in payload:
            user_info = {
                "id": str(payload["sub"]),
                "email": payload.get("email"),
                "user_metadata": payload.get("user_metadata", {}),
            }

    if not user_info:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token không hợp lệ hoặc phiên đăng nhập đã hết hạn.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 3. Lấy thông tin bổ sung từ bảng 'profiles'
    try:
        supabase = get_supabase_client()
        profile_res = (
            supabase.table("profiles")
            .select("full_name, avatar_url, created_at, updated_at")
            .eq("id", user_info["id"])
            .limit(1)
            .execute()
        )
        if profile_res.data:
            prof = profile_res.data[0]
            user_info["full_name"] = prof.get("full_name")
            user_info["avatar_url"] = prof.get("avatar_url")
            user_info["created_at"] = prof.get("created_at")
        else:
            user_info["full_name"] = user_info["user_metadata"].get("full_name")
            user_info["avatar_url"] = user_info["user_metadata"].get("avatar_url")
    except Exception as e:
        logger.warning(f"Không thể truy vấn bảng profiles cho user {user_info['id']}: {e}")

    return user_info


async def get_optional_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme)
) -> Optional[Dict[str, Any]]:
    """
    FastAPI Dependency: Tùy chọn xác thực người dùng. Trả về None nếu không có token.
    """
    if not credentials or not credentials.credentials:
        return None
    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None
