"""
Test suite for Authentication (SignUp, SignIn, JWT Verification, Profile /me)
"""

import sys
from pathlib import Path
from unittest.mock import MagicMock, patch
from datetime import timedelta
import pytest
from pydantic import ValidationError
from fastapi.testclient import TestClient

# Đảm bảo thư mục gốc plagiarism-ai-detector nằm trong sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from src.main import app
from src.models.auth import SignUpRequest, SignInRequest
from src.core.security import create_access_token, decode_access_token
from src.services.auth_service import AuthService

client = TestClient(app)


# ============================================================================
# 1. Pydantic Model Validation Tests
# ============================================================================

def test_signup_validation_valid():
    """Kiểm tra tạo SignUpRequest với dữ liệu hợp lệ."""
    req = SignUpRequest(
        email="User_Test@Learnova.AI",
        password="Password123!",
        full_name="Nguyễn Văn A",
    )
    # Tự động chuẩn hóa email về lowercase
    assert req.email == "user_test@learnova.ai"
    assert req.password == "Password123!"
    assert req.full_name == "Nguyễn Văn A"


def test_signup_validation_invalid_email():
    """Kiểm tra lỗi khi email không đúng định dạng."""
    with pytest.raises(ValidationError):
        SignUpRequest(email="invalid-email-format", password="Password123!")


def test_signup_validation_short_password():
    """Kiểm tra lỗi khi mật khẩu ngắn hơn 6 ký tự."""
    with pytest.raises(ValidationError):
        SignUpRequest(email="user@example.com", password="123")


def test_signin_validation():
    """Kiểm tra SignInRequest với email và password."""
    req = SignInRequest(email="Student@University.edu.vn", password="SecretPassword")
    assert req.email == "student@university.edu.vn"
    assert req.password == "SecretPassword"

    with pytest.raises(ValidationError):
        SignInRequest(email="notanemail", password="pass")


# ============================================================================
# 2. JWT Generation & Verification Tests
# ============================================================================

def test_jwt_create_and_decode():
    """Kiểm tra tạo JWT token và giải mã thành công."""
    payload = {
        "sub": "user-uuid-123456",
        "email": "tester@learnova.ai",
        "role": "student",
    }
    token = create_access_token(payload, expires_delta=timedelta(minutes=30))
    assert isinstance(token, str)
    assert len(token) > 20

    decoded = decode_access_token(token)
    assert decoded is not None
    assert decoded["sub"] == "user-uuid-123456"
    assert decoded["email"] == "tester@learnova.ai"
    assert decoded["iss"] == "learnova-ai-auth"
    assert "exp" in decoded


def test_jwt_expired_token():
    """Kiểm tra giải mã token đã hết hạn sẽ trả về None."""
    payload = {"sub": "expired-user"}
    # Thời gian hết hạn trong quá khứ (-1 phút)
    token = create_access_token(payload, expires_delta=timedelta(minutes=-1))
    decoded = decode_access_token(token)
    assert decoded is None


def test_jwt_tampered_token():
    """Kiểm tra token bị chỉnh sửa sẽ không thể giải mã."""
    payload = {"sub": "user-123"}
    token = create_access_token(payload)
    tampered_token = token[:-5] + "XXXXX"
    decoded = decode_access_token(tampered_token)
    assert decoded is None


# ============================================================================
# 3. API Endpoints Tests (/signup, /signin, /me, /signout, /refresh)
# ============================================================================

@patch("src.services.auth_service.get_supabase_client")
def test_signup_endpoint_success(mock_get_supabase):
    """Kiểm tra API POST /api/v1/auth/signup thành công."""
    mock_supabase = MagicMock()
    mock_get_supabase.return_value = mock_supabase

    # Giả lập phản hồi từ Supabase Auth sign_up
    mock_user = MagicMock()
    mock_user.id = "98765432-abcd-ef01-2345-6789abcdef01"
    mock_user.email = "newuser@gmail.com"
    mock_user.created_at = "2026-09-20T08:00:00Z"
    mock_user.identities = [MagicMock()]

    mock_res = MagicMock()
    mock_res.user = mock_user
    mock_res.session = None  # Cần xác nhận email

    mock_supabase.auth.sign_up.return_value = mock_res
    mock_supabase.table.return_value.upsert.return_value.execute.return_value = MagicMock(data=[{}])

    response = client.post(
        "/api/v1/auth/signup",
        json={
            "email": "newuser@gmail.com",
            "password": "SecurePassword123!",
            "full_name": "Nguyễn Văn Mới",
        },
    )

    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "newuser@gmail.com"
    assert data["user_id"] == "98765432-abcd-ef01-2345-6789abcdef01"
    assert data["requires_email_confirmation"] is True
    assert "Đăng ký thành công" in data["message"]


@patch("src.services.auth_service.get_supabase_client")
def test_signup_endpoint_already_registered(mock_get_supabase):
    """Kiểm tra API POST /api/v1/auth/signup khi email đã tồn tại."""
    mock_supabase = MagicMock()
    mock_get_supabase.return_value = mock_supabase
    mock_supabase.auth.sign_up.side_effect = Exception("User already registered")

    response = client.post(
        "/api/v1/auth/signup",
        json={
            "email": "existing@gmail.com",
            "password": "SecurePassword123!",
        },
    )

    assert response.status_code == 400
    data = response.json()
    assert "đã được đăng ký" in data["detail"]


@patch("src.services.auth_service.get_supabase_client")
def test_signin_endpoint_success(mock_get_supabase):
    """Kiểm tra API POST /api/v1/auth/signin thành công nhận JWT token."""
    mock_supabase = MagicMock()
    mock_get_supabase.return_value = mock_supabase

    user_id = "55555555-5555-5555-5555-555555555555"
    mock_user = MagicMock()
    mock_user.id = user_id
    mock_user.email = "active_user@learnova.ai"
    mock_user.created_at = "2026-09-20T00:00:00Z"
    mock_user.user_metadata = {"full_name": "Trần Thị Lan"}

    fake_jwt = create_access_token({"sub": user_id, "email": "active_user@learnova.ai"})

    mock_session = MagicMock()
    mock_session.access_token = fake_jwt
    mock_session.refresh_token = "fake-refresh-token-xyz"
    mock_session.expires_in = 86400

    mock_auth_res = MagicMock()
    mock_auth_res.user = mock_user
    mock_auth_res.session = mock_session

    mock_supabase.auth.sign_in_with_password.return_value = mock_auth_res
    # Giả lập trả về profile
    mock_supabase.table.return_value.select.return_value.eq.return_value.limit.return_value.execute.return_value = MagicMock(
        data=[{"full_name": "Trần Thị Lan", "avatar_url": "https://avatar.url/lan.jpg", "created_at": "2026-09-20T00:00:00Z"}]
    )

    response = client.post(
        "/api/v1/auth/signin",
        json={
            "email": "active_user@learnova.ai",
            "password": "CorrectPassword123!",
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["expires_in"] == 15 * 24 * 3600  # 15 ngày
    assert data["user"]["email"] == "active_user@learnova.ai"
    assert data["user"]["full_name"] == "Trần Thị Lan"


@patch("src.services.auth_service.get_supabase_client")
def test_signin_endpoint_invalid_credentials(mock_get_supabase):
    """Kiểm tra API POST /api/v1/auth/signin với thông tin sai."""
    mock_supabase = MagicMock()
    mock_get_supabase.return_value = mock_supabase
    mock_supabase.auth.sign_in_with_password.side_effect = Exception("Invalid login credentials")

    response = client.post(
        "/api/v1/auth/signin",
        json={
            "email": "user@gmail.com",
            "password": "WrongPassword",
        },
    )

    assert response.status_code == 400
    data = response.json()
    assert "không chính xác" in data["detail"]


def test_me_endpoint_without_token():
    """Kiểm tra API GET /api/v1/auth/me khi không cung cấp token -> 401."""
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401
    assert "Authorization Bearer" in response.json()["detail"]


def test_me_endpoint_invalid_token():
    """Kiểm tra API GET /api/v1/auth/me với token rác -> 401."""
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer invalid_garbage_token_value"},
    )
    assert response.status_code == 401


@patch("src.core.security.get_supabase_client")
def test_me_endpoint_valid_token(mock_get_supabase):
    """Kiểm tra API GET /api/v1/auth/me với JWT hợp lệ."""
    user_id = "11111111-2222-3333-4444-555555555555"
    token = create_access_token({
        "sub": user_id,
        "email": "auth_me_test@learnova.ai",
        "user_metadata": {"full_name": "Lê Văn C"},
    })

    mock_supabase = MagicMock()
    mock_get_supabase.return_value = mock_supabase
    # Giả lập get_user từ Supabase Auth trả về lỗi để fallback qua decode JWT nội bộ
    mock_supabase.auth.get_user.side_effect = Exception("Not a Supabase token")
    mock_supabase.table.return_value.select.return_value.eq.return_value.limit.return_value.execute.return_value = MagicMock(
        data=[{"full_name": "Lê Văn C", "avatar_url": None, "created_at": "2026-09-20T00:00:00Z"}]
    )

    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == user_id
    assert data["email"] == "auth_me_test@learnova.ai"
    assert data["full_name"] == "Lê Văn C"


@patch("src.core.security.get_supabase_client")
@patch("src.services.auth_service.get_supabase_client")
def test_signout_endpoint(mock_auth_supabase, mock_sec_supabase):
    """Kiểm tra API POST /api/v1/auth/signout khi đã đăng nhập."""
    token = create_access_token({"sub": "user-uuid", "email": "test@learnova.ai"})

    mock_supabase = MagicMock()
    mock_auth_supabase.return_value = mock_supabase
    mock_sec_supabase.return_value = mock_supabase
    mock_supabase.auth.get_user.side_effect = Exception("Fallback")
    mock_supabase.table.return_value.select.return_value.eq.return_value.limit.return_value.execute.return_value = MagicMock(data=[])

    response = client.post(
        "/api/v1/auth/signout",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    assert response.json()["message"] == "Đăng xuất thành công."


@patch("src.services.auth_service.get_supabase_client")
def test_refresh_endpoint_success(mock_get_supabase):
    """Kiểm tra API POST /api/v1/auth/refresh thành công."""
    mock_supabase = MagicMock()
    mock_get_supabase.return_value = mock_supabase

    new_jwt = create_access_token({"sub": "refreshed-uuid", "email": "refreshed@learnova.ai"})
    mock_session = MagicMock()
    mock_session.access_token = new_jwt
    mock_session.refresh_token = "new-refresh-token"
    mock_session.expires_in = 7200

    mock_user = MagicMock()
    mock_user.id = "refreshed-uuid"
    mock_user.email = "refreshed@learnova.ai"
    mock_user.created_at = "2026-09-20T00:00:00Z"
    mock_user.user_metadata = {"full_name": "Refreshed User"}

    mock_res = MagicMock()
    mock_res.session = mock_session
    mock_res.user = mock_user
    mock_supabase.auth.refresh_session.return_value = mock_res

    response = client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": "valid-refresh-token"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["expires_in"] == 15 * 24 * 3600  # 15 ngày
    assert data["user"]["email"] == "refreshed@learnova.ai"


@patch("src.services.plagiarism.pipeline.plagiarism_pipeline.run")
@patch("src.core.security.get_supabase_client")
def test_plagiarism_check_with_auth_token(mock_get_supabase, mock_pipeline_run):
    """Kiểm tra API kiểm tra đạo văn tự động trích xuất user_id từ JWT token của người dùng."""
    user_id = "user-1234-uuid-plagiarism"
    token = create_access_token({"sub": user_id, "email": "author@learnova.ai"})

    mock_supabase = MagicMock()
    mock_get_supabase.return_value = mock_supabase
    mock_supabase.auth.get_user.side_effect = Exception("Fallback")
    mock_supabase.table.return_value.select.return_value.eq.return_value.limit.return_value.execute.return_value = MagicMock(data=[])

    mock_pipeline_run.return_value = {
        "document_id": "doc-uuid-001",
        "title": "Báo cáo nghiên cứu khoa học",
        "word_count": 100,
        "total_chunks": 5,
        "matched_chunks_count": 0,
        "plagiarism_score": 0.0,
        "matches": [],
        "status": "completed",
    }

    response = client.post(
        "/api/v1/plagiarism/check",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "title": "Báo cáo nghiên cứu khoa học",
            "text": "Nội dung bài viết để kiểm tra đạo văn với độ dài trên 15 ký tự hợp lệ.",
        },
    )

    assert response.status_code == 200
    # Đảm bảo pipeline.run được gọi với user_id được tự động trích xuất từ JWT
    mock_pipeline_run.assert_called_once()
    _, call_kwargs = mock_pipeline_run.call_args
    assert call_kwargs["user_id"] == user_id


if __name__ == "__main__":
    import pytest
    sys.exit(pytest.main(["-v", __file__]))

