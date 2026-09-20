"""
Auth Service
Xử lý toàn bộ nghiệp vụ xác thực người dùng dựa trên Supabase auth.users và bảng profiles.
"""

from datetime import timedelta
from typing import Optional, Dict, Any
from src.core.config import settings
from src.core.logging import logger
from src.core.security import create_access_token
from src.db.supabase_client import get_supabase_client, get_supabase_admin_client
from src.models.auth import (
    SignUpRequest,
    SignUpResponse,
    SignInRequest,
    TokenResponse,
    UserProfileResponse,
)


class AuthService:
    def __init__(self):
        pass

    @property
    def supabase(self):
        return get_supabase_client()

    def sign_up(self, payload: SignUpRequest) -> SignUpResponse:
        """
        Đăng ký người dùng mới:
        1. Tạo tài khoản trong cơ sở dữ liệu Supabase auth.users.
        2. Tự động liên kết bản ghi thông tin vào bảng 'profiles'.
        3. Trả về thông tin tài khoản và JWT token (nếu email confirmation đã tắt).
        """
        email = payload.email.strip().lower()
        full_name = payload.full_name.strip() if payload.full_name else None
        avatar_url = payload.avatar_url.strip() if payload.avatar_url else None

        credentials = {
            "email": email,
            "password": payload.password,
            "options": {
                "data": {
                    "full_name": full_name or "",
                    "avatar_url": avatar_url or "",
                }
            },
        }

        res = None
        user = None

        # 1. Nếu có SUPABASE_SERVICE_ROLE_KEY, ưu tiên tạo trực tiếp bằng admin API (email_confirm=True, không dính rate limit)
        admin_client = get_supabase_admin_client()
        if admin_client:
            try:
                admin_res = admin_client.auth.admin.create_user({
                    "email": email,
                    "password": payload.password,
                    "email_confirm": True,
                    "user_metadata": {
                        "full_name": full_name or "",
                        "avatar_url": avatar_url or "",
                    },
                })
                if admin_res and admin_res.user:
                    user = admin_res.user
                    logger.info(f"Đã tạo user thành công qua Supabase Admin API: {user.id}")
            except Exception as ae:
                ae_msg = str(ae)
                logger.warning(f"Admin create_user không thành công: {ae_msg}")
                if "already registered" in ae_msg.lower() or "user already exists" in ae_msg.lower():
                    raise ValueError("Email này đã được đăng ký trong hệ thống.")
                if "password" in ae_msg.lower():
                    raise ValueError(f"Mật khẩu không đáp ứng yêu cầu: {ae_msg}")

        # 2. Nếu chưa tạo qua admin, đăng ký qua client thông thường
        if not user:
            try:
                res = self.supabase.auth.sign_up(credentials)
                if res and res.user:
                    user = res.user
            except Exception as e:
                err_msg = str(e)
                logger.error(f"Lỗi khi đăng ký tài khoản Supabase: {err_msg}")
                if "already registered" in err_msg.lower() or "user already exists" in err_msg.lower():
                    raise ValueError("Email này đã được đăng ký trong hệ thống.")
                if "rate limit" in err_msg.lower():
                    raise ValueError(
                        "Supabase đã đạt giới hạn gửi email thử nghiệm (email rate limit exceeded). "
                        "Cách khắc phục ngay: Vào Supabase Dashboard (Authentication -> Providers -> Email) "
                        "và TẮT mục 'Confirm email' để đăng ký không giới hạn và tự động kích hoạt tài khoản."
                    )
                if "password" in err_msg.lower():
                    raise ValueError(f"Mật khẩu không đáp ứng yêu cầu: {err_msg}")
                raise ValueError(f"Đăng ký thất bại: {err_msg}")

        if not user:
            raise ValueError("Không thể tạo tài khoản người dùng.")
        user_id = str(user.id)

        # Kiểm tra xem tài khoản đã tồn tại trước đó chưa (Supabase trả về user với identities rỗng khi email đã tồn tại)
        if hasattr(user, "identities") and user.identities is not None and len(user.identities) == 0:
            raise ValueError("Email này đã được đăng ký trong hệ thống.")

        # Tạo hoặc đồng bộ bản ghi vào bảng 'profiles'
        try:
            profile_data = {
                "id": user_id,
                "full_name": full_name,
                "avatar_url": avatar_url,
            }
            self.supabase.table("profiles").upsert(profile_data).execute()
            logger.info(f"Đã cập nhật profile thành công cho user ID: {user_id}")
        except Exception as pe:
            logger.warning(f"Cảnh báo: Không thể tạo profile cho user {user_id}: {pe}")

        # Kiểm tra xem Supabase có cấp session JWT ngay không hay cần xác thực qua email
        access_token = None
        requires_email_confirmation = False

        if res.session:
            expires_seconds = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
            access_token = create_access_token(
                data={
                    "sub": user_id,
                    "email": email,
                    "role": "authenticated",
                    "user_metadata": {
                        "full_name": full_name,
                        "avatar_url": avatar_url,
                    },
                },
                expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
            )
            message = "Đăng ký tài khoản thành công!"
        else:
            requires_email_confirmation = True
            message = "Đăng ký thành công! Vui lòng kiểm tra email để xác nhận tài khoản trước khi đăng nhập."

        user_profile = UserProfileResponse(
            id=user_id,
            email=email,
            full_name=full_name,
            avatar_url=avatar_url,
            created_at=str(user.created_at) if hasattr(user, "created_at") else None,
        )

        return SignUpResponse(
            message=message,
            user_id=user_id,
            email=email,
            requires_email_confirmation=requires_email_confirmation,
            access_token=access_token,
            user=user_profile,
        )

    def sign_in(self, payload: SignInRequest) -> TokenResponse:
        """
        Đăng nhập người dùng bằng email và mật khẩu:
        1. Xác thực qua Supabase auth.users.
        2. Lấy JWT access_token và refresh_token.
        3. Truy vấn bảng 'profiles' để lấy họ tên và avatar của người dùng.
        """
        email = payload.email.strip().lower()

        try:
            res = self.supabase.auth.sign_in_with_password({
                "email": email,
                "password": payload.password,
            })
        except Exception as e:
            err_msg = str(e)
            logger.error(f"Lỗi khi đăng nhập tài khoản: {err_msg}")
            if "invalid login credentials" in err_msg.lower():
                raise ValueError("Email hoặc mật khẩu không chính xác.")
            if "email not confirmed" in err_msg.lower():
                raise ValueError("Tài khoản chưa được xác nhận email. Vui lòng kiểm tra hộp thư email của bạn.")
            raise ValueError(f"Đăng nhập thất bại: {err_msg}")

        if not res or not res.session or not res.user:
            raise ValueError("Đăng nhập thất bại: Không nhận được phiên đăng nhập hợp lệ.")

        session = res.session
        user = res.user
        user_id = str(user.id)

        # Lấy thông tin profile từ bảng 'profiles'
        full_name = None
        avatar_url = None
        created_at = str(user.created_at) if hasattr(user, "created_at") else None

        try:
            profile_res = (
                self.supabase.table("profiles")
                .select("full_name, avatar_url, created_at")
                .eq("id", user_id)
                .limit(1)
                .execute()
            )
            if profile_res.data:
                prof = profile_res.data[0]
                full_name = prof.get("full_name")
                avatar_url = prof.get("avatar_url")
                if prof.get("created_at"):
                    created_at = str(prof["created_at"])
        except Exception as pe:
            logger.warning(f"Lỗi khi truy vấn profile user {user_id}: {pe}")

        if not full_name and hasattr(user, "user_metadata") and user.user_metadata:
            full_name = user.user_metadata.get("full_name")
            avatar_url = user.user_metadata.get("avatar_url")

        user_profile = UserProfileResponse(
            id=user_id,
            email=email,
            full_name=full_name,
            avatar_url=avatar_url,
            created_at=created_at,
        )

        # Cấp phát JWT token thời hạn 15 ngày (settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        expires_seconds = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        access_jwt = create_access_token(
            data={
                "sub": user_id,
                "email": email,
                "role": "authenticated",
                "user_metadata": {
                    "full_name": full_name,
                    "avatar_url": avatar_url,
                },
            },
            expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
        )

        return TokenResponse(
            access_token=access_jwt,
            token_type="bearer",
            expires_in=expires_seconds,
            refresh_token=session.refresh_token,
            user=user_profile,
        )

    def refresh_session(self, refresh_token: str) -> TokenResponse:
        """
        Gia hạn token phiên làm việc bằng refresh_token (15 ngày).
        """
        try:
            res = self.supabase.auth.refresh_session(refresh_token)
        except Exception as e:
            logger.error(f"Lỗi làm mới token: {e}")
            raise ValueError(f"Không thể làm mới token: {str(e)}")

        if not res or not res.session or not res.user:
            raise ValueError("Không thể làm mới token hợp lệ.")

        session = res.session
        user = res.user
        user_id = str(user.id)

        full_name = user.user_metadata.get("full_name") if hasattr(user, "user_metadata") and user.user_metadata else None
        avatar_url = user.user_metadata.get("avatar_url") if hasattr(user, "user_metadata") and user.user_metadata else None

        user_profile = UserProfileResponse(
            id=user_id,
            email=user.email or "",
            full_name=full_name,
            avatar_url=avatar_url,
            created_at=str(user.created_at) if hasattr(user, "created_at") else None,
        )

        expires_seconds = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        access_jwt = create_access_token(
            data={
                "sub": user_id,
                "email": user.email or "",
                "role": "authenticated",
                "user_metadata": {
                    "full_name": full_name,
                    "avatar_url": avatar_url,
                },
            },
            expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
        )

        return TokenResponse(
            access_token=access_jwt,
            token_type="bearer",
            expires_in=expires_seconds,
            refresh_token=session.refresh_token,
            user=user_profile,
        )

    def sign_out(self, access_token: Optional[str] = None) -> bool:
        """
        Đăng xuất và hủy phiên làm việc.
        """
        try:
            self.supabase.auth.sign_out()
            return True
        except Exception as e:
            logger.warning(f"Lỗi khi sign out Supabase: {e}")
            return True


auth_service = AuthService()
