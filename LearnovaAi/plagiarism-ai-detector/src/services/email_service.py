"""
Email & OTP Verification Service for LearnovaAI
Xử lý sinh mã OTP 6 số ngẫu nhiên, lưu trữ vào Supabase DB,
gửi email qua SMTP với chuẩn cấu trúc chống rơi vào thư mục Spam.
"""

import smtplib
import secrets
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr, make_msgid, formatdate
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any

from src.core.config import settings
from src.core.logging import logger
from src.db.supabase_client import get_supabase_client


def parse_iso_datetime(dt_str: Any) -> datetime:
    """Parse ISO datetime string compatibly across Python 3.10+ and Postgres timestamps."""
    if isinstance(dt_str, datetime):
        return dt_str if dt_str.tzinfo else dt_str.replace(tzinfo=timezone.utc)
    
    clean = str(dt_str).replace("Z", "+00:00")
    if "." in clean:
        parts = clean.split(".")
        main_part = parts[0]
        sub = parts[1]
        tz_char = ""
        tz_offset = ""
        if "+" in sub:
            sub, tz_offset = sub.split("+", 1)
            tz_char = "+"
        elif "-" in sub:
            sub, tz_offset = sub.split("-", 1)
            tz_char = "-"
        
        sub = (sub + "000000")[:6]
        clean = f"{main_part}.{sub}{tz_char}{tz_offset}" if tz_char else f"{main_part}.{sub}"

    try:
        return datetime.fromisoformat(clean)
    except Exception:
        try:
            from dateutil import parser
            p = parser.parse(str(dt_str))
            return p if p.tzinfo else p.replace(tzinfo=timezone.utc)
        except Exception:
            return datetime.now(timezone.utc)


class EmailService:
    def __init__(self):
        pass

    @property
    def supabase(self):
        return get_supabase_client()

    @staticmethod
    def generate_otp() -> str:
        """Sinh mã OTP 6 số bảo mật ngẫu nhiên (từ 100000 đến 999999)."""
        return str(secrets.randbelow(900000) + 100000)

    def send_signup_otp(self, email: str) -> Dict[str, Any]:
        """
        Khởi tạo và gửi mã OTP 6 số xác thực đăng ký tài khoản.
        Bảo vệ chống spam: Kiểm tra cooldown 60 giây và lưu hạn 5 phút.
        """
        clean_email = email.strip().lower()
        now = datetime.now(timezone.utc)

        # 1. Kiểm tra Cooldown: Không cho gửi lại quá nhanh trong vòng 60 giây
        try:
            recent = (
                self.supabase.table("email_otps")
                .select("created_at")
                .eq("email", clean_email)
                .order("created_at", desc=True)
                .limit(1)
                .execute()
            )
            if recent.data:
                last_created_str = recent.data[0]["created_at"]
                last_created = parse_iso_datetime(last_created_str)
                if (now - last_created).total_seconds() < 60:
                    wait_sec = int(60 - (now - last_created).total_seconds())
                    raise ValueError(f"Vui lòng chờ {wait_sec} giây trước khi yêu cầu gửi lại mã OTP.")
        except ValueError:
            raise
        except Exception as query_err:
            logger.warning(f"Không thể kiểm tra cooldown OTP: {query_err}")

        # 2. Sinh mã OTP 6 số mới và tính thời gian hết hạn (5 phút)
        otp_code = self.generate_otp()
        expire_minutes = getattr(settings, "OTP_EXPIRE_MINUTES", 5)
        expires_at = now + timedelta(minutes=expire_minutes)

        # 3. Lưu vào cơ sở dữ liệu Supabase
        try:
            self.supabase.table("email_otps").insert({
                "email": clean_email,
                "otp_code": otp_code,
                "purpose": "signup",
                "expires_at": expires_at.isoformat(),
                "attempts": 0,
                "is_verified": False,
            }).execute()
            logger.info(f"[OTP Service] Đã tạo mã OTP cho {clean_email}: {otp_code} (Hết hạn lúc {expires_at})")
        except Exception as insert_err:
            logger.error(f"Lỗi khi lưu mã OTP vào database: {insert_err}")
            raise ValueError("Không thể khởi tạo mã xác thực. Vui lòng thử lại sau.")

        # 4. Gửi email qua SMTP
        email_sent = self._dispatch_email(clean_email, otp_code, expire_minutes)

        return {
            "email": clean_email,
            "message": "Mã xác thực OTP đã được gửi đến hộp thư của bạn.",
            "expires_in_seconds": expire_minutes * 60,
            "email_dispatched": email_sent,
            # Không trả OTP về client để bảo mật
            "debug_otp": None,
        }

    def verify_otp(self, email: str, otp_code: str, purpose: str = "signup") -> bool:
        """
        Xác minh tính hợp lệ của mã OTP người dùng nhập vào.
        Bảo vệ Anti-Brute Force: Giới hạn tối đa 5 lần nhập sai.
        """
        clean_email = email.strip().lower()
        clean_otp = otp_code.strip()
        now = datetime.now(timezone.utc)

        try:
            res = (
                self.supabase.table("email_otps")
                .select("*")
                .eq("email", clean_email)
                .eq("purpose", purpose)
                .eq("is_verified", False)
                .order("created_at", desc=True)
                .limit(1)
                .execute()
            )

            if not res.data:
                raise ValueError("Không tìm thấy mã OTP tương ứng hoặc mã đã được sử dụng.")

            record = res.data[0]
            record_id = record["id"]
            attempts = record.get("attempts", 0)

            # Kiểm tra số lần thử sai
            if attempts >= 5:
                raise ValueError("Mã OTP này đã bị khóa do nhập sai quá 5 lần. Vui lòng bấm gửi lại mã mới.")

            # Kiểm tra thời hạn hết hạn
            expires_at = parse_iso_datetime(record["expires_at"])
            if now > expires_at:
                raise ValueError("Mã OTP đã hết hạn (chỉ có hiệu lực trong 5 phút). Vui lòng yêu cầu mã mới.")

            # Đối chiếu mã OTP
            if record["otp_code"] != clean_otp:
                # Tăng số lần thử sai
                self.supabase.table("email_otps").update({"attempts": attempts + 1}).eq("id", record_id).execute()
                remaining = 4 - attempts
                raise ValueError(f"Mã OTP không chính xác. Bạn còn {max(0, remaining)} lần thử.")

            # Đánh dấu đã xác thực thành công
            self.supabase.table("email_otps").update({"is_verified": True}).eq("id", record_id).execute()
            logger.info(f"[OTP Service] Xác thực OTP thành công cho email: {clean_email}")
            return True

        except ValueError:
            raise
        except Exception as exc:
            logger.error(f"Lỗi kiểm tra OTP: {exc}")
            raise ValueError(f"Lỗi hệ thống khi xác thực OTP: {exc}")

    def _send_via_resend(self, recipient_email: str, subject: str, html_body: str, plain_body: str) -> bool:
        """
        Gửi email trực tiếp qua Resend.com REST API (https://api.resend.com/emails).
        Tốc độ siêu nhanh, tỉ lệ vào Inbox 99.8%, không bị nghẽn port SMTP.
        """
        import requests
        api_key = (settings.RESEND_API_KEY or "").strip()
        from_email = (getattr(settings, "RESEND_FROM_EMAIL", None) or "LearnovaAI <onboarding@resend.dev>").strip()

        payload = {
            "from": from_email,
            "to": [recipient_email],
            "subject": subject,
            "html": html_body,
            "text": plain_body,
            "headers": {
                "Auto-Submitted": "auto-generated",
                "X-Mailer": "LearnovaAI-Resend/2.5",
            },
        }

        try:
            resp = requests.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
                timeout=10,
            )
            if resp.status_code in (200, 201):
                res_data = resp.json()
                logger.info(f"[Resend.com] Gửi thành công email OTP tới {recipient_email}. Email ID: {res_data.get('id')}")
                return True
            else:
                logger.error(f"[Resend.com] Lỗi phản hồi ({resp.status_code}): {resp.text}")
                return False
        except Exception as exc:
            logger.error(f"[Resend.com] Lỗi kết nối khi gửi email qua Resend: {exc}")
            return False

    def _dispatch_email(self, recipient_email: str, otp_code: str, expire_minutes: int) -> bool:
        """
        Gửi email HTML & Plain Text đa phần chuẩn RFC, chống rơi vào thư mục Spam.
        Hỗ trợ ưu tiên 1: Resend.com API -> ưu tiên 2: SMTP Relay -> ưu tiên 3: Test mode log.
        """
        subject = f"{otp_code} là mã xác thực đăng ký tài khoản LearnovaAI"
        from_header = formataddr((settings.SMTP_FROM_NAME, settings.SMTP_FROM_EMAIL))

        # 1. Plain Text version (Bắt buộc cho Spam Filter)
        plain_body = f"""Xin chào,

Bạn vừa yêu cầu đăng ký tài khoản mới trên nền tảng LearnovaAI (Hệ thống Phát hiện Đạo văn & PhoBERT AI).

Mã xác thực OTP của bạn là: {otp_code}

Mã này có hiệu lực trong vòng {expire_minutes} phút.
VÌ LÝ DO AN TOÀN, TUYỆT ĐỐI KHÔNG CHIA SẺ MÃ NÀY CHO BẤT KỲ AI.

Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email.

Trân trọng,
Đội ngũ LearnovaAI
https://learnnovacheckai.com
"""

        # 2. HTML version thiết kế chuyên nghiệp, tỉ lệ text/html tối ưu, không có từ trigger spam
        html_body = f"""<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mã xác thực LearnovaAI</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 520px; background-color: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05); overflow: hidden;" cellspacing="0" cellpadding="0">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 32px 30px; text-align: center;">
              <h1 style="margin: 0; font-size: 26px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
                Learnova<span style="color: #a5b4fc;">AI</span>
              </h1>
              <p style="margin: 6px 0 0; font-size: 13px; color: #e0e7ff; font-weight: 500;">
                Nền tảng Đối Soát Độc Bản & PhoBERT AI Detector
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 36px 32px 30px;">
              <h2 style="margin: 0 0 12px; font-size: 19px; font-weight: 700; color: #0f172a;">
                Xác thực đăng ký tài khoản
              </h2>
              <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #475569;">
                Chào bạn, bạn vừa tạo tài khoản tại <strong>LearnovaAI</strong>. Vui lòng nhập mã OTP 6 số dưới đây để hoàn tất kích hoạt và nhận ngay <strong>5.000 từ miễn phí</strong>:
              </p>

              <!-- OTP Code Badge -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 24px;">
                <tr>
                  <td align="center" style="background-color: #f1f5f9; border: 2px dashed #cbd5e1; border-radius: 16px; padding: 22px;">
                    <div style="font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #4338ca; font-family: monospace;">
                      {otp_code}
                    </div>
                    <div style="margin-top: 6px; font-size: 12px; font-weight: 600; color: #64748b;">
                      Mã có hiệu lực trong {expire_minutes} phút
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Security Notice -->
              <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 12px; padding: 14px 16px; margin-bottom: 24px;">
                <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #92400e;">
                  🔒 <strong>Lưu ý bảo mật:</strong> Không chia sẻ mã OTP này cho bất kỳ ai. Nhân viên LearnovaAI sẽ không bao giờ hỏi mã của bạn.
                </p>
              </div>

              <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #64748b;">
                Nếu bạn không gửi yêu cầu đăng ký này, vui lòng bỏ qua email. Tài khoản sẽ không được khởi tạo nếu chưa nhập mã.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 30px; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #94a3b8; line-height: 1.5;">
                LearnovaAI © 2026 • Hệ thống Liêm chính Học thuật & AI Tiếng Việt<br>
                Đây là thư tự động, vui lòng không trả lời trực tiếp email này.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""

        # 1. ƯU TIÊN SỐ 1: Gửi qua Resend.com REST API
        if settings.RESEND_API_KEY:
            resend_success = self._send_via_resend(recipient_email, subject, html_body, plain_body)
            if resend_success:
                return True
            logger.warning("[Email Service] Gửi qua Resend API không thành công, thử kiểm tra cấu hình SMTP...")

        # 2. ƯU TIÊN SỐ 2: Gửi qua SMTP Relay nếu có cấu hình
        if settings.SMTP_HOST and settings.SMTP_USER:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = from_header
            msg["To"] = recipient_email
            msg["Date"] = formatdate(localtime=True)
            msg["Message-ID"] = make_msgid(domain="learnova.ai")
            # Headers quan trọng chống spam filter:
            msg["Auto-Submitted"] = "auto-generated"
            msg["X-Mailer"] = "LearnovaAI-Mailer/2.5"

            msg.attach(MIMEText(plain_body, "plain", "utf-8"))
            msg.attach(MIMEText(html_body, "html", "utf-8"))

            try:
                if settings.SMTP_PORT == 465:
                    server = smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=12)
                else:
                    server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=12)
                    if settings.SMTP_USE_TLS:
                        server.starttls()

                if settings.SMTP_PASSWORD:
                    server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)

                server.sendmail(settings.SMTP_FROM_EMAIL, [recipient_email], msg.as_string())
                server.quit()
                logger.info(f"[Email Service] Đã gửi thành công email OTP tới {recipient_email} qua SMTP")
                return True
            except Exception as send_err:
                logger.error(f"[Email Service] Thất bại khi gửi email qua SMTP: {send_err}")
                return False

        # 3. ƯU TIÊN SỐ 3: Chế độ Debug/Test khi chưa có RESEND_API_KEY hoặc SMTP
        logger.info(
            f"[Email Service] Chưa cấu hình RESEND_API_KEY hoặc SMTP_HOST trong .env. "
            f"-> Mã OTP cho {recipient_email} là: [{otp_code}] (Xem log máy chủ để xác thực)."
        )
        return False


email_service = EmailService()
