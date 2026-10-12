"""
Admin User Management Endpoints
Cung cấp toàn diện các nghiệp vụ Quản trị Người Dùng chuẩn SaaS cho Admin:
- Thống kê tổng quan người dùng và tài nguyên số từ
- Danh sách, tìm kiếm, lọc theo vai trò & trạng thái, phân trang
- Chi tiết người dùng kèm lịch sử tra cứu & giao dịch
- Điều chỉnh hạn mức số từ (Cộng/Trừ từ có ghi nhận lý do)
- Phân quyền Quản trị viên (Admin) / Người dùng (User)
- Khóa / Kích hoạt tài khoản
- Tạo nhanh tài khoản trực tiếp từ trang Admin
"""

from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from src.core.logging import logger
from src.core.security import get_current_admin
from src.db.supabase_client import get_supabase_client, get_supabase_admin_client

router = APIRouter()


# -------------------------------------------------------------
# PYDANTIC SCHEMAS
# -------------------------------------------------------------
class AdjustBalanceRequest(BaseModel):
    adjustment: int = Field(..., description="Số từ điều chỉnh (+ cộng thêm, - trừ bớt)")
    reason: str = Field(..., min_length=3, max_length=255, description="Lý do điều chỉnh (ví dụ: 'Bù sự cố mạng', 'Khuyến mãi gói Pro')")


class UpdateRoleRequest(BaseModel):
    role: str = Field(..., pattern="^(user|admin)$", description="Vai trò mới ('user' hoặc 'admin')")


class UpdateStatusRequest(BaseModel):
    status: str = Field(..., pattern="^(active|banned)$", description="Trạng thái tài khoản ('active' hoặc 'banned')")
    reason: Optional[str] = Field(default=None, max_length=255, description="Lý do khóa hoặc mở khóa")


class AdminCreateUserRequest(BaseModel):
    email: str = Field(..., description="Email người dùng mới")
    password: str = Field(..., min_length=6, description="Mật khẩu khởi tạo")
    full_name: Optional[str] = Field(default=None, description="Họ và tên")
    role: str = Field(default="user", pattern="^(user|admin)$", description="Vai trò khởi tạo")
    words_balance: int = Field(default=5000, ge=0, description="Số từ khởi tạo ban đầu")
    admin_notes: Optional[str] = Field(default=None, description="Ghi chú nội bộ admin")


# -------------------------------------------------------------
# 1. THỐNG KÊ TỔNG QUAN (ADMIN STATS)
# -------------------------------------------------------------
@router.get("/stats", summary="[Admin] Thống kê tổng quan người dùng & hệ thống")
async def get_admin_user_stats(
    admin: Dict[str, Any] = Depends(get_current_admin),
):
    """Lấy các chỉ số KPI: Tổng người dùng, Active, Banned, Tổng số từ, Tổng tài liệu."""
    supabase = get_supabase_client()
    try:
        # 1. Thống kê từ profiles
        profiles_res = supabase.table("profiles").select("id, role, status, words_balance, created_at").execute()
        profiles = profiles_res.data or []

        total_users = len(profiles)
        active_users = sum(1 for p in profiles if (p.get("status") or "active") == "active")
        banned_users = sum(1 for p in profiles if p.get("status") == "banned")
        admin_users = sum(1 for p in profiles if p.get("role") == "admin")
        total_words_allocated = sum(int(p.get("words_balance") or 0) for p in profiles)

        # Người dùng mới trong 7 ngày qua
        seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
        new_users_7d = 0
        for p in profiles:
            ca_str = p.get("created_at")
            if ca_str:
                try:
                    ca = datetime.fromisoformat(ca_str.replace("Z", "+00:00"))
                    if ca >= seven_days_ago:
                        new_users_7d += 1
                except Exception:
                    pass

        # 2. Tổng số tài liệu đã kiểm tra
        docs_res = supabase.table("documents").select("id", count="exact").execute()
        total_documents = docs_res.count if hasattr(docs_res, "count") and docs_res.count is not None else 0
        if not total_documents and docs_res.data:
            total_documents = len(docs_res.data)

        return {
            "total_users": total_users,
            "active_users": active_users,
            "banned_users": banned_users,
            "admin_users": admin_users,
            "new_users_last_7_days": new_users_7d,
            "total_words_allocated": total_words_allocated,
            "total_documents_checked": total_documents,
        }
    except Exception as exc:
        logger.error(f"[Admin Stats Error]: {exc}")
        raise HTTPException(status_code=500, detail=f"Lỗi truy vấn thống kê quản trị: {str(exc)}")


# -------------------------------------------------------------
# 2. DANH SÁCH NGƯỜI DÙNG & TÌM KIẾM, PHÂN TRANG
# -------------------------------------------------------------
@router.get("", summary="[Admin] Danh sách người dùng phân trang & tìm kiếm")
async def list_admin_users(
    page: int = Query(default=1, ge=1, description="Số trang hiện tại"),
    page_size: int = Query(default=15, ge=1, le=100, description="Số bản ghi mỗi trang"),
    search: Optional[str] = Query(default=None, description="Tìm theo email hoặc họ tên"),
    role: Optional[str] = Query(default=None, description="Lọc theo vai trò: 'user', 'admin' hoặc null"),
    status_filter: Optional[str] = Query(default=None, alias="status", description="Lọc theo trạng thái: 'active', 'banned'"),
    sort_by: str = Query(default="created_at", description="Cột sắp xếp ('created_at', 'words_balance', 'full_name')"),
    sort_order: str = Query(default="desc", description="Thứ tự ('asc' hoặc 'desc')"),
    admin: Dict[str, Any] = Depends(get_current_admin),
):
    """Lấy danh sách người dùng có hỗ trợ lọc, tìm kiếm và phân trang."""
    supabase = get_supabase_client()
    try:
        query = supabase.table("profiles").select("*", count="exact")

        # Áp dụng bộ lọc Role
        if role and role in ("user", "admin"):
            query = query.eq("role", role)

        # Áp dụng bộ lọc Status
        if status_filter and status_filter in ("active", "banned"):
            query = query.eq("status", status_filter)

        # Áp dụng tìm kiếm
        if search:
            clean_search = search.strip()
            # Tìm kiếm ilike trên email hoặc full_name
            query = query.or_(f"email.ilike.%{clean_search}%,full_name.ilike.%{clean_search}%")

        # Sắp xếp
        desc_bool = (sort_order.lower() == "desc")
        valid_sort_cols = ["created_at", "words_balance", "full_name", "role", "status"]
        col = sort_by if sort_by in valid_sort_cols else "created_at"
        query = query.order(col, desc=desc_bool)

        # Phân trang
        start = (page - 1) * page_size
        end = start + page_size - 1
        query = query.range(start, end)

        res = query.execute()
        users = res.data or []
        total = res.count if hasattr(res, "count") and res.count is not None else len(users)

        # Đếm số tài liệu đã kiểm tra cho từng user trong trang hiện tại
        if users:
            user_ids = [u["id"] for u in users]
            try:
                docs_res = supabase.table("documents").select("user_id").in_("user_id", user_ids).execute()
                doc_counts: Dict[str, int] = {}
                for d in (docs_res.data or []):
                    uid = d.get("user_id")
                    if uid:
                        doc_counts[uid] = doc_counts.get(uid, 0) + 1
                for u in users:
                    u["total_documents"] = doc_counts.get(u["id"], 0)
            except Exception:
                for u in users:
                    u["total_documents"] = 0

        total_pages = (total + page_size - 1) // page_size if total > 0 else 1

        return {
            "users": users,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
        }
    except Exception as exc:
        logger.error(f"[Admin List Users Error]: {exc}")
        raise HTTPException(status_code=500, detail=f"Lỗi lấy danh sách người dùng: {str(exc)}")


# -------------------------------------------------------------
# 3. CHI TIẾT NGƯỜI DÙNG & LỊCH SỬ HOẠT ĐỘNG
# -------------------------------------------------------------
@router.get("/{user_id}", summary="[Admin] Xem chi tiết hồ sơ & lịch sử của user")
async def get_admin_user_detail(
    user_id: str,
    admin: Dict[str, Any] = Depends(get_current_admin),
):
    """Lấy chi tiết hồ sơ, 10 lượt kiểm tra tài liệu gần nhất và lịch sử giao dịch."""
    supabase = get_supabase_client()
    try:
        # 1. Profile
        prof_res = supabase.table("profiles").select("*").eq("id", user_id).limit(1).execute()
        if not prof_res.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy người dùng.")
        profile = prof_res.data[0]

        # 2. 10 Tài liệu kiểm tra gần nhất
        docs_res = (
            supabase.table("documents")
            .select("id, title, plagiarism_score, ai_score, status, word_count, created_at")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .limit(10)
            .execute()
        )
        recent_documents = docs_res.data or []

        # 3. Lịch sử giao dịch (nếu bảng transactions tồn tại)
        recent_transactions = []
        try:
            tx_res = (
                supabase.table("transactions")
                .select("*")
                .eq("user_id", user_id)
                .order("created_at", desc=True)
                .limit(10)
                .execute()
            )
            recent_transactions = tx_res.data or []
        except Exception:
            pass

        return {
            "user": profile,
            "recent_documents": recent_documents,
            "recent_transactions": recent_transactions,
            "total_documents": len(recent_documents),
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Lỗi truy xuất chi tiết user: {str(exc)}")


# -------------------------------------------------------------
# 4. ĐIỀU CHỈNH HẠN MỨC SỐ TỪ (ADJUST WORDS BALANCE)
# -------------------------------------------------------------
@router.patch("/{user_id}/adjust-balance", summary="[Admin] Cộng hoặc trừ số từ của người dùng")
async def adjust_user_balance(
    user_id: str,
    payload: AdjustBalanceRequest,
    admin: Dict[str, Any] = Depends(get_current_admin),
):
    """Cộng hoặc trừ số từ trực tiếp kèm lý do điều chỉnh từ Admin."""
    supabase = get_supabase_client()
    try:
        prof_res = supabase.table("profiles").select("words_balance, email, full_name").eq("id", user_id).limit(1).execute()
        if not prof_res.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy người dùng.")
        
        current_balance = int(prof_res.data[0].get("words_balance") or 0)
        new_balance = max(0, current_balance + payload.adjustment)

        # Cập nhật vào profiles
        update_res = (
            supabase.table("profiles")
            .update({
                "words_balance": new_balance,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            })
            .eq("id", user_id)
            .execute()
        )

        admin_email = admin.get("email") or "Admin"
        logger.info(
            f"[Admin Audit] {admin_email} đã điều chỉnh số từ cho user {user_id}: "
            f"{current_balance} -> {new_balance} ({payload.adjustment:+d}). Lý do: {payload.reason}"
        )

        return {
            "message": f"Đã điều chỉnh thành công! Số dư mới: {new_balance:,} từ.",
            "user_id": user_id,
            "old_balance": current_balance,
            "new_balance": new_balance,
            "adjustment": payload.adjustment,
            "reason": payload.reason,
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Lỗi điều chỉnh số từ: {str(exc)}")


# -------------------------------------------------------------
# 5. PHÂN QUYỀN (UPDATE ROLE: USER <-> ADMIN)
# -------------------------------------------------------------
@router.patch("/{user_id}/role", summary="[Admin] Thay đổi vai trò người dùng (user/admin)")
async def update_user_role(
    user_id: str,
    payload: UpdateRoleRequest,
    admin: Dict[str, Any] = Depends(get_current_admin),
):
    """Phân quyền quản trị viên hoặc thu hồi quyền quản trị."""
    if user_id == admin["id"] and payload.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bạn không thể tự hạ quyền quản trị viên của chính mình.",
        )

    supabase = get_supabase_client()
    try:
        update_res = (
            supabase.table("profiles")
            .update({
                "role": payload.role,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            })
            .eq("id", user_id)
            .execute()
        )
        if not update_res.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy người dùng.")

        logger.info(f"[Admin Audit] {admin.get('email')} đã đổi vai trò của user {user_id} thành '{payload.role}'")

        return {
            "message": f"Đã cập nhật vai trò người dùng thành '{payload.role}' thành công.",
            "user_id": user_id,
            "new_role": payload.role,
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Lỗi cập nhật vai trò: {str(exc)}")


# -------------------------------------------------------------
# 6. KHÓA / KÍCH HOẠT TÀI KHOẢN (BAN / UNBAN STATUS)
# -------------------------------------------------------------
@router.patch("/{user_id}/status", summary="[Admin] Khóa hoặc Mở khóa tài khoản")
async def update_user_status(
    user_id: str,
    payload: UpdateStatusRequest,
    admin: Dict[str, Any] = Depends(get_current_admin),
):
    """Khóa người dùng vi phạm hoặc mở khóa tài khoản."""
    if user_id == admin["id"] and payload.status == "banned":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bạn không thể tự khóa tài khoản của chính mình.",
        )

    supabase = get_supabase_client()
    try:
        update_data = {
            "status": payload.status,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        if payload.reason:
            update_data["admin_notes"] = f"[{datetime.now().strftime('%d/%m/%Y')}] {payload.status.upper()}: {payload.reason}"

        update_res = (
            supabase.table("profiles")
            .update(update_data)
            .eq("id", user_id)
            .execute()
        )
        if not update_res.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy người dùng.")

        status_text = "Khóa tài khoản" if payload.status == "banned" else "Mở khóa tài khoản"
        logger.info(f"[Admin Audit] {admin.get('email')} đã {status_text} user {user_id}. Lý do: {payload.reason}")

        return {
            "message": f"Đã {status_text} thành công.",
            "user_id": user_id,
            "new_status": payload.status,
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Lỗi cập nhật trạng thái: {str(exc)}")


# -------------------------------------------------------------
# 7. TẠO NGƯỜI DÙNG MỚI TRỰC TIẾP (ADMIN CREATE USER)
# -------------------------------------------------------------
@router.post("", summary="[Admin] Tạo mới người dùng trực tiếp không cần qua OTP")
async def create_user_by_admin(
    payload: AdminCreateUserRequest,
    admin: Dict[str, Any] = Depends(get_current_admin),
):
    """Tạo tài khoản nhanh cho khách hàng VIP, trường đại học hoặc nhân viên nội bộ."""
    clean_email = payload.email.strip().lower()
    admin_client = get_supabase_admin_client()
    supabase = get_supabase_client()

    if not admin_client:
        raise HTTPException(status_code=500, detail="Không tìm thấy cấu hình Supabase Admin Service Role.")

    try:
        # 1. Tạo auth.users
        admin_res = admin_client.auth.admin.create_user({
            "email": clean_email,
            "password": payload.password,
            "email_confirm": True,
            "user_metadata": {
                "full_name": payload.full_name or "",
                "created_by_admin": admin.get("email") or "Admin",
            },
        })
        if not admin_res or not admin_res.user:
            raise ValueError("Không thể tạo bản ghi tài khoản xác thực.")

        new_user = admin_res.user
        new_id = str(new_user.id)

        # 2. Tạo profiles
        profile_data = {
            "id": new_id,
            "email": clean_email,
            "full_name": payload.full_name,
            "role": payload.role,
            "status": "active",
            "words_balance": payload.words_balance,
            "admin_notes": payload.admin_notes,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        supabase.table("profiles").upsert(profile_data).execute()

        logger.info(f"[Admin Audit] {admin.get('email')} đã tạo tài khoản mới: {clean_email} (Role: {payload.role}, Số từ: {payload.words_balance})")

        return {
            "message": "Đã tạo tài khoản người dùng mới thành công!",
            "user": profile_data,
        }
    except Exception as exc:
        err_msg = str(exc)
        if "already registered" in err_msg.lower() or "already exists" in err_msg.lower():
            raise HTTPException(status_code=400, detail="Email này đã tồn tại trong hệ thống.")
        raise HTTPException(status_code=500, detail=f"Lỗi tạo tài khoản: {err_msg}")
