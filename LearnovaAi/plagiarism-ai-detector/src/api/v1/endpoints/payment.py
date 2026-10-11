"""
Payment API Endpoints for LearnovaAI
Cung cấp các API: Danh sách gói cước, Tạo đơn hàng PayOS VietQR,
Kiểm tra trạng thái đơn hàng và tiếp nhận PayOS Webhook.
"""

from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel

from src.core.security import get_current_user
from src.core.logging import logger
from src.models.payment import (
    PricingPackageModel,
    CreateOrderRequest,
    CreateOrderResponse,
    OrderStatusResponse,
)
from src.services.payment_service import payment_service

router = APIRouter()


@router.get(
    "/packages",
    response_model=List[PricingPackageModel],
    summary="Lấy danh sách các gói nạp từ khả dụng",
)
async def get_packages():
    """Trả về danh sách 3 gói cước: Starter, Plus, Master."""
    return payment_service.get_packages()


@router.post(
    "/create-order",
    response_model=CreateOrderResponse,
    summary="Tạo đơn hàng thanh toán mua gói từ qua PayOS VietQR",
)
async def create_order(
    payload: CreateOrderRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Tạo đơn hàng thanh toán và sinh mã VietQR động:
    - Trả về mã VietQR, tài khoản thụ hưởng, số tiền, nội dung chuyển khoản.
    - Người dùng mở app ngân hàng quét mã để thanh toán tự động.
    """
    user_id = current_user.get("id")
    user_email = current_user.get("email")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Vui lòng đăng nhập để thực hiện nạp gói từ.",
        )

    try:
        order = payment_service.create_order(
            user_id=user_id,
            user_email=user_email,
            package_id=payload.package_id,
        )
        return order
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(val_err),
        )
    except Exception as exc:
        logger.error(f"Lỗi tạo đơn hàng thanh toán: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Không thể khởi tạo đơn hàng thanh toán. Vui lòng thử lại sau.",
        )


@router.get(
    "/order-status/{order_code}",
    response_model=OrderStatusResponse,
    summary="Kiểm tra trạng thái đơn hàng (Polling)",
)
async def get_order_status(
    order_code: int,
    current_user: dict = Depends(get_current_user),
):
    """Kiểm tra trạng thái đơn hàng: PENDING -> PAID."""
    try:
        return payment_service.check_order_status(order_code)
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(val_err),
        )
    except Exception as exc:
        logger.error(f"Lỗi kiểm tra trạng thái đơn hàng {order_code}: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Không thể kiểm tra trạng thái đơn hàng.",
        )


@router.post(
    "/payos-webhook",
    summary="Tiếp nhận thông báo thanh toán thành công từ PayOS",
)
async def payos_webhook(request: Request):
    """
    Webhook tiếp nhận sự kiện thanh toán từ PayOS:
    - Tiếp nhận xác thực Webhook URL khi đăng ký với PayOS.
    - Tự động xác thực chữ ký số HMAC-SHA256.
    - Cập nhật trạng thái đơn hàng và cộng từ tức thì cho người dùng.
    """
    try:
        payload = await request.json()
        logger.info(f"[PayOS Webhook] Nhận dữ liệu webhook: {payload}")

        # Trường hợp PayOS gửi webhook xác nhận Webhook URL khi cấu hình trên Dashboard
        if "webhookUrl" in payload:
            logger.info(f"[PayOS Webhook] Xác nhận Webhook URL thành công: {payload.get('webhookUrl')}")
            return {"success": True, "message": "Webhook URL verified"}

        success = payment_service.verify_and_process_webhook(payload)
        return {"success": success, "message": "Webhook processed successfully"}
    except Exception as exc:
        logger.error(f"[PayOS Webhook] Lỗi xử lý: {exc}")
        return {"success": False, "error": str(exc)}


@router.post(
    "/simulate-payment/{order_code}",
    summary="Mô phỏng thanh toán thành công (Dành cho thử nghiệm và demo)",
)
async def simulate_payment(
    order_code: int,
    current_user: dict = Depends(get_current_user),
):
    """
    Endpoint hỗ trợ thử nghiệm trực tiếp luồng cộng từ tự động
    khi đang ở môi trường Sandbox/Test.
    """
    res = payment_service.complete_payment(
        order_code=order_code,
        raw_webhook={"simulated_by": current_user.get("email")},
    )
    if not res:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không thể xác nhận thanh toán cho đơn hàng này.",
        )
    return {"success": True, "message": f"Đơn hàng {order_code} đã được thanh toán và cộng từ thành công!"}
