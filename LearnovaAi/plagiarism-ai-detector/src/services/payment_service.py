"""
Payment & PayOS VietQR Service for LearnovaAI
Xử lý tạo đơn hàng, gọi PayOS API tạo mã VietQR động,
xử lý Webhook cộng từ tự động và kiểm tra trạng thái đơn hàng.
"""

import hmac
import hashlib
import time
import secrets
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
import requests

from src.core.config import settings
from src.core.logging import logger
from src.db.supabase_client import get_supabase_client
from src.models.payment import PricingPackageModel, CreateOrderResponse, OrderStatusResponse


# Danh sách 3 gói cước chuẩn Nạp Từ Linh Hoạt
DEFAULT_PACKAGES: List[Dict[str, Any]] = [
    {
        "id": "starter",
        "name": "Sinh Viên Starter",
        "price": 29000,
        "words": 25000,
        "description": "Phù hợp kiểm tra 1 - 3 bài tiểu luận, bài tập lớn học phần.",
        "features": [
            "25.000 từ kiểm tra (Không bao giờ hết hạn)",
            "Đối soát toàn diện CSDL & Serper Web",
            "Kiểm tra PhoBERT AI tiếng Việt chuyên sâu",
            "Xuất báo cáo PDF chi tiết minh bạch",
            "Lưu trữ lịch sử đối soát 30 ngày",
        ],
        "is_popular": False,
        "badge": "Tiết kiệm",
        "sort_order": 1,
    },
    {
        "id": "plus",
        "name": "Khóa Luận Plus",
        "price": 69000,
        "words": 70000,
        "description": "Gói phổ biến nhất - Phù hợp khóa luận cử nhân, nghiên cứu khoa học.",
        "features": [
            "70.000 từ kiểm tra (Tặng thêm 10.000 từ)",
            "Số từ vĩnh viễn không hết hạn",
            "Độ phủ đối soát 100% toàn văn",
            "Phân tích Paraphrase & Trích dẫn sâu",
            "Xuất báo cáo PDF chuẩn Turnitin-Style",
            "Ưu tiên tốc độ xử lý hàng đợi",
        ],
        "is_popular": True,
        "badge": "Phổ biến nhất 🔥",
        "sort_order": 2,
    },
    {
        "id": "master",
        "name": "Cao Học Master",
        "price": 149000,
        "words": 180000,
        "description": "Tối ưu chi phí nhất - Dành cho luận văn Thạc sĩ, Luận án Tiến sĩ.",
        "features": [
            "180.000 từ kiểm tra (Giá chỉ ~820đ / 1.000 từ)",
            "Số từ vĩnh viễn không hết hạn",
            "Quét kiểm tra không giới hạn số lần nộp",
            "Xuất báo cáo định dạng cao cấp",
            "Hỗ trợ kỹ thuật ưu tiên 24/7",
        ],
        "is_popular": False,
        "badge": "Tối ưu nhất ⚡",
        "sort_order": 3,
    },
]


class PaymentService:
    @property
    def supabase(self):
        return get_supabase_client()

    @property
    def payos_client(self):
        """Khởi tạo PayOS SDK client chính thức."""
        client_id = (settings.PAYOS_CLIENT_ID or "").strip()
        api_key = (settings.PAYOS_API_KEY or "").strip()
        checksum_key = (settings.PAYOS_CHECKSUM_KEY or "").strip()
        if client_id and api_key and checksum_key:
            try:
                from payos import PayOS
                return PayOS(client_id=client_id, api_key=api_key, checksum_key=checksum_key)
            except Exception as e:
                logger.error(f"[PayOS] Khởi tạo client lỗi: {e}")
        return None

    def get_packages(self) -> List[Dict[str, Any]]:
        """Lấy danh sách các gói cước đang áp dụng."""
        try:
            res = (
                self.supabase.table("pricing_packages")
                .select("*")
                .order("sort_order", desc=False)
                .execute()
            )
            if res.data and len(res.data) > 0:
                return res.data
        except Exception as e:
            logger.warning(f"[Payment] Không thể đọc gói từ DB ({e}), sử dụng mặc định.")
        return DEFAULT_PACKAGES

    def get_package_by_id(self, package_id: str) -> Optional[Dict[str, Any]]:
        """Tìm gói cước theo ID."""
        packages = self.get_packages()
        for pkg in packages:
            if pkg["id"] == package_id:
                return pkg
        return None

    def _generate_order_code(self) -> int:
        """Sinh mã orderCode duy nhất cho PayOS (số nguyên dương <= 9007199254740991)."""
        # Kết hợp timestamp mili-giây rút gọn và số ngẫu nhiên 3 chữ số
        timestamp_part = int(time.time() * 100) % 1000000000
        rand_part = secrets.randbelow(900) + 100
        return int(f"{timestamp_part}{rand_part}")

    def _sign_payos_payload(self, data: Dict[str, Any], checksum_key: str) -> str:
        """Ký HMAC-SHA256 theo chuẩn bảo mật của PayOS."""
        sorted_keys = sorted(data.keys())
        query_string = "&".join([f"{k}={data[k]}" for k in sorted_keys if data[k] is not None])
        return hmac.new(
            checksum_key.encode("utf-8"),
            query_string.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()

    def create_order(
        self, user_id: str, user_email: str, package_id: str
    ) -> CreateOrderResponse:
        """
        Khởi tạo đơn hàng thanh toán mua gói từ.
        Kết nối trực tiếp PayOS VietQR API hoặc chế độ VietQR Sandbox.
        """
        pkg = self.get_package_by_id(package_id)
        if not pkg:
            raise ValueError(f"Gói cước '{package_id}' không tồn tại trên hệ thống.")

        order_code = self._generate_order_code()
        amount = int(pkg["price"])
        words = int(pkg["words"])
        package_name = pkg["name"]

        # Nội dung chuyển khoản duy nhất (VD: LN123456)
        payment_content = f"LN{order_code % 10000000:07d}"

        # Kiểm tra cấu hình PayOS thực tế
        client_id = (settings.PAYOS_CLIENT_ID or "").strip()
        api_key = (settings.PAYOS_API_KEY or "").strip()
        checksum_key = (settings.PAYOS_CHECKSUM_KEY or "").strip()

        checkout_url = None
        qr_code = None
        account_number = None
        account_name = None
        bank_name = None
        payos_link_id = None
        is_simulation = False

        if client_id and api_key and checksum_key:
            # GỌI PAYOS PRODUCTION API
            logger.info(f"[PayOS] Đang tạo yêu cầu thanh toán cho orderCode: {order_code}")
            request_data = {
                "orderCode": order_code,
                "amount": amount,
                "description": payment_content,
                "returnUrl": settings.PAYOS_RETURN_URL,
                "cancelUrl": settings.PAYOS_CANCEL_URL,
            }
            signature = self._sign_payos_payload(request_data, checksum_key)
            request_data["signature"] = signature

            headers = {
                "x-client-id": client_id,
                "x-api-key": api_key,
                "Content-Type": "application/json",
            }

            try:
                resp = requests.post(
                    "https://api-merchant.payos.vn/v2/payment-requests",
                    headers=headers,
                    json=request_data,
                    timeout=12,
                )
                res_json = resp.json()
                if resp.status_code == 200 and res_json.get("code") == "00":
                    data = res_json.get("data", {})
                    checkout_url = data.get("checkoutUrl")
                    account_number = data.get("accountNumber")
                    account_name = data.get("accountName")
                    bin_code = str(data.get("bin") or "970452")
                    payos_link_id = data.get("paymentLinkId")

                    bin_map = {
                        "970452": "KienlongBank (PayOS)",
                        "970422": "MB Bank (Quân Đội)",
                        "970415": "VietinBank",
                        "970436": "Vietcombank",
                        "970407": "Techcombank",
                        "970418": "BIDV",
                        "970405": "Agribank",
                        "970423": "TPBank",
                        "970432": "VPBank",
                        "970416": "ACB",
                    }
                    bank_name = bin_map.get(bin_code, f"Ngân hàng (BIN {bin_code})")

                    # Tạo ảnh chuẩn VietQR NAPAS 247 đẹp mắt
                    if bin_code and account_number:
                        acc_encoded = (account_name or "").replace(" ", "%20")
                        qr_code = (
                            f"https://img.vietqr.io/image/{bin_code}-{account_number}-compact2.png"
                            f"?amount={amount}&addInfo={payment_content}&accountName={acc_encoded}"
                        )
                    else:
                        raw_qr = data.get("qrCode", "")
                        qr_code = f"https://api.qrserver.com/v1/create-qr-code/?size=300x300&data={raw_qr}"

                    logger.info(
                        f"[PayOS] Đã tạo thành công đơn hàng {order_code} "
                        f"(STK: {account_number}, Bank: {bank_name})"
                    )
                else:
                    logger.error(f"[PayOS] Lỗi trả về: {res_json}")
                    is_simulation = True
            except Exception as e:
                logger.error(f"[PayOS] Lỗi kết nối API: {e}")
                is_simulation = True
        else:
            # CHẾ ĐỘ VIETQR TỰ ĐỘNG CHUẨN (Demo/Sandbox)
            is_simulation = True
            logger.info(
                f"[Payment] Chưa có PayOS Client ID/API Key. "
                f"Sử dụng chuẩn VietQR QuickPay thông minh cho orderCode: {order_code}"
            )

        # Fallback tạo mã VietQR chuẩn NAPAS nếu PayOS chưa cấu hình
        if not qr_code or is_simulation:
            # Tạo link ảnh mã VietQR tự động qua chuẩn mở VietQR API
            account_number = account_number or "0345678999"
            account_name = account_name or "CONG TY LEARNOVAAI"
            bank_name = bank_name or "MB Bank (Ngân hàng Quân Đội)"
            qr_code = (
                f"https://img.vietqr.io/image/970422-{account_number}-compact2.png"
                f"?amount={amount}&addInfo={payment_content}&accountName={account_name.replace(' ', '%20')}"
            )

        # Lưu đơn hàng vào cơ sở dữ liệu Supabase
        try:
            self.supabase.table("payment_orders").insert({
                "order_code": order_code,
                "user_id": user_id,
                "user_email": user_email,
                "package_id": package_id,
                "package_name": package_name,
                "amount": amount,
                "words": words,
                "status": "PENDING",
                "payment_method": "PAYOS_VIETQR",
                "payos_payment_link_id": payos_link_id,
                "checkout_url": checkout_url,
                "qr_code": qr_code,
                "account_number": account_number,
                "account_name": account_name,
                "bank_name": bank_name,
                "payment_content": payment_content,
            }).execute()
        except Exception as insert_err:
            logger.error(f"[Payment] Lỗi lưu đơn hàng: {insert_err}")

        return CreateOrderResponse(
            order_code=order_code,
            package_id=package_id,
            package_name=package_name,
            amount=amount,
            words=words,
            status="PENDING",
            checkout_url=checkout_url,
            qr_code=qr_code,
            account_number=account_number,
            account_name=account_name,
            bank_name=bank_name,
            payment_content=payment_content,
            is_simulation=is_simulation,
            expires_in_seconds=600,
        )

    def complete_payment(self, order_code: int, raw_webhook: Optional[Dict[str, Any]] = None) -> bool:
        """
        Xử lý khi đơn hàng thanh toán thành công:
        1. Cập nhật trạng thái đơn thành PAID.
        2. Tự động cộng số từ vào profiles của người dùng.
        """
        try:
            res = (
                self.supabase.table("payment_orders")
                .select("*")
                .eq("order_code", order_code)
                .limit(1)
                .execute()
            )
            if not res.data:
                logger.warning(f"[Payment] Không tìm thấy đơn hàng orderCode: {order_code}")
                return False

            order = res.data[0]
            if order.get("status") == "PAID":
                logger.info(f"[Payment] Đơn hàng {order_code} đã được thanh toán trước đó.")
                return True

            user_id = order.get("user_id")
            words_to_add = order.get("words", 0)
            now_iso = datetime.now(timezone.utc).isoformat()

            # Cập nhật trạng thái đơn hàng
            self.supabase.table("payment_orders").update({
                "status": "PAID",
                "paid_at": now_iso,
                "raw_response": raw_webhook or {},
                "updated_at": now_iso,
            }).eq("order_code", order_code).execute()

            # Cộng số từ vào hồ sơ người dùng trong bảng profiles
            if user_id:
                prof_res = (
                    self.supabase.table("profiles")
                    .select("words_balance")
                    .eq("id", user_id)
                    .limit(1)
                    .execute()
                )
                curr_balance = 5000
                if prof_res.data:
                    curr_balance = prof_res.data[0].get("words_balance") or 0

                new_balance = curr_balance + words_to_add
                self.supabase.table("profiles").update({
                    "words_balance": new_balance,
                    "updated_at": now_iso,
                }).eq("id", user_id).execute()

                logger.info(
                    f"[Payment Thành Công] Đơn {order_code}: User {user_id} "
                    f"được cộng +{words_to_add:,} từ. Số dư mới: {new_balance:,} từ."
                )

            return True

        except Exception as e:
            logger.error(f"[Payment] Lỗi xử lý hoàn tất thanh toán {order_code}: {e}")
            return False

    def check_order_status(self, order_code: int) -> OrderStatusResponse:
        """Kiểm tra trạng thái đơn hàng hiện tại (dành cho frontend polling)."""
        res = (
            self.supabase.table("payment_orders")
            .select("*")
            .eq("order_code", order_code)
            .limit(1)
            .execute()
        )
        if not res.data:
            raise ValueError(f"Đơn hàng {order_code} không tồn tại.")

        order = res.data[0]
        status = order.get("status", "PENDING")

        # NẾU ĐƠN VẪN PENDING, TỰ ĐỘNG ĐỐI SOÁT TRỰC TIẾP VỚI PAYOS API (Dual-Channel Guarantee)
        if status == "PENDING" and self.payos_client:
            try:
                payos_info = self.payos_client.payment_requests.get(int(order_code))
                if payos_info and getattr(payos_info, "status", None) == "PAID":
                    logger.info(
                        f"[PayOS Polling Sync] Đơn hàng {order_code} đã thanh toán thành công "
                        f"theo PayOS API! Tự động cộng từ ngay lập tức."
                    )
                    self.complete_payment(int(order_code), raw_webhook={"source": "polling_payos_api_sync"})
                    status = "PAID"
                    order["status"] = "PAID"
            except Exception as sync_err:
                logger.debug(f"[PayOS Polling Sync] Chưa có cập nhật từ PayOS: {sync_err}")

        user_id = order.get("user_id")
        current_balance = None

        if user_id:
            try:
                prof_res = (
                    self.supabase.table("profiles")
                    .select("words_balance")
                    .eq("id", user_id)
                    .limit(1)
                    .execute()
                )
                if prof_res.data:
                    current_balance = prof_res.data[0].get("words_balance")
            except Exception:
                pass

        return OrderStatusResponse(
            order_code=order_code,
            status=status,
            amount=order.get("amount", 0),
            words=order.get("words", 0),
            package_name=order.get("package_name", ""),
            paid_at=order.get("paid_at"),
            words_balance=current_balance,
        )

    def verify_and_process_webhook(self, payload: Dict[str, Any]) -> bool:
        """Xác thực Webhook từ PayOS và kích hoạt cộng từ."""
        data = payload.get("data", {})
        order_code = data.get("orderCode")

        # 1. Thử xác thực chữ ký số bằng SDK PayOS chính thức
        verified = False
        if self.payos_client:
            try:
                verified_data = self.payos_client.webhooks.verify(payload)
                if verified_data:
                    verified = True
                    if getattr(verified_data, "order_code", None):
                        order_code = verified_data.order_code
            except Exception as e:
                logger.warning(f"[PayOS Webhook] SDK verify: {e}. Thử fallback kiểm tra API.")

        # 2. Fallback: Nếu SDK báo lỗi chữ ký nhưng có orderCode,
        # kiểm tra trực tiếp trạng thái với PayOS API để đảm bảo an toàn tuyệt đối 100%
        if not verified and order_code and self.payos_client:
            try:
                payos_info = self.payos_client.payment_requests.get(int(order_code))
                if payos_info and getattr(payos_info, "status", None) == "PAID":
                    logger.info(f"[PayOS Webhook Fallback] Đơn {order_code} được xác thực PAID trực tiếp từ PayOS API!")
                    verified = True
            except Exception as api_err:
                logger.error(f"[PayOS Webhook Fallback] Không thể check PayOS API: {api_err}")

        # 3. Kích hoạt hoàn tất thanh toán & cộng từ nếu hợp lệ
        if (verified or not settings.PAYOS_CHECKSUM_KEY) and order_code:
            return self.complete_payment(int(order_code), raw_webhook=payload)

        return False


payment_service = PaymentService()
