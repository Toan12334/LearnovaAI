"""
Authentication Endpoints
Cung cấp các API: Đăng ký (/signup), Đăng nhập (/signin), Lấy thông tin tài khoản (/me),
Gia hạn token (/refresh), và Đăng xuất (/signout).
"""

from typing import Dict, Any
from fastapi import APIRouter, HTTPException, Depends, status
from src.models.auth import (
    SignUpRequest,
    SignUpResponse,
    SignInRequest,
    TokenResponse,
    RefreshTokenRequest,
    UserProfileResponse,
    SignOutResponse,
)
from src.services.auth_service import auth_service
from src.core.security import get_current_user

router = APIRouter()


@router.post(
    "/signup",
    response_model=SignUpResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Đăng ký tài khoản người dùng mới vào auth.users",
)
def sign_up(payload: SignUpRequest):
    """
    Tạo tài khoản người dùng mới dựa trên thông tin email, password.
    Hệ thống sẽ ghi nhận vào bảng `auth.users` của Supabase và khởi tạo bảng `profiles`.
    """
    try:
        return auth_service.sign_up(payload)
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi hệ thống khi đăng ký: {str(e)}",
        )


@router.post(
    "/signin",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="Đăng nhập tài khoản bằng email & password, nhận JWT token",
)
def sign_in(payload: SignInRequest):
    """
    Xác thực thông tin đăng nhập với `auth.users`.
    Trả về JWT Bearer access token để truy cập các dịch vụ được bảo vệ.
    """
    try:
        return auth_service.sign_in(payload)
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi hệ thống khi đăng nhập: {str(e)}",
        )


@router.get(
    "/me",
    response_model=UserProfileResponse,
    status_code=status.HTTP_200_OK,
    summary="Lấy thông tin tài khoản hiện tại (yêu cầu JWT token)",
)
def get_my_profile(current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    Truy xuất thông tin profile của người dùng đang đăng nhập thông qua JWT Bearer token.
    """
    return UserProfileResponse(
        id=current_user["id"],
        email=current_user["email"],
        full_name=current_user.get("full_name"),
        avatar_url=current_user.get("avatar_url"),
        created_at=current_user.get("created_at"),
    )


@router.post(
    "/refresh",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="Làm mới JWT token bằng refresh_token",
)
def refresh_token(payload: RefreshTokenRequest):
    """
    Cấp phát cặp access_token và refresh_token mới khi token cũ hết hạn.
    """
    try:
        return auth_service.refresh_session(payload.refresh_token)
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi hệ thống khi làm mới token: {str(e)}",
        )


@router.post(
    "/signout",
    response_model=SignOutResponse,
    status_code=status.HTTP_200_OK,
    summary="Đăng xuất khỏi hệ thống",
)
def sign_out(current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    Đăng xuất và vô hiệu hóa phiên làm việc của người dùng.
    """
    auth_service.sign_out()
    return SignOutResponse()
