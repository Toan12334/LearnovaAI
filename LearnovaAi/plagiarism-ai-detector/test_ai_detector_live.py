"""
Script kiểm thử so sánh phát hiện văn bản giữa Con người (Human) và Trí tuệ nhân tạo (AI/ChatGPT).

Sử dụng trực tiếp mô hình RobertaDetector từ src/services/ai_detector.py.
"""

import sys
import time
from pathlib import Path

# Cấu hình UTF-8 cho Windows console để hiển thị icon và tiếng Việt không bị lỗi font
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

# Đảm bảo đường dẫn gốc của dự án được nạp vào sys.path
BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from src.services.ai_detector import RobertaDetector


def format_prediction_result(label: str, text: str, ai_score: float, elapsed_time: float):
    """Định dạng và in kết quả dự đoán ra console trực quan."""
    human_score = round(1.0 - ai_score, 4)
    ai_percent = round(ai_score * 100, 2)
    human_percent = round(human_score * 100, 2)

    if ai_score >= 0.65:
        verdict = "🔴 AI-GENERATED (Văn bản do AI/ChatGPT tạo ra)"
        color_tag = "AI"
    elif ai_score <= 0.35:
        verdict = "🟢 HUMAN-WRITTEN (Văn bản do người viết)"
        color_tag = "HUMAN"
    else:
        verdict = "🟡 UNCERTAIN / MIXED (Nghi vấn - Có dấu hiệu lai tạp)"
        color_tag = "MIXED"

    print("=" * 80)
    print(f"📌 [KIỂM THỬ]: {label.upper()}")
    print("-" * 80)
    print(f"📝 Đoạn văn kiểm tra (độ dài {len(text)} ký tự):")
    # Hiển thị tối đa 300 ký tự xem trước
    preview = text.strip()
    if len(preview) > 300:
        preview = preview[:300] + "..."
    print(f'"{preview}"')
    print("-" * 80)
    print(f"📊 KẾT QUẢ PHÂN TÍCH:")
    print(f"   • Xác suất AI:         {ai_percent:>6.2f}% (Điểm: {ai_score:.4f})")
    print(f"   • Xác suất Người viết: {human_percent:>6.2f}% (Điểm: {human_score:.4f})")
    print(f"   • Thời gian xử lý:     {elapsed_time * 1000:.1f} ms")
    print(f"   • KẾT LUẬN:            {verdict}")
    print("=" * 80)
    print()


def main():
    print("\n" + "=" * 80)
    print("🤖 HỆ THỐNG KIỂM TRA PHÁT HIỆN VĂN BẢN AI VS NGƯỜI VIẾT (ROBERTA DETECTOR)")
    print("=" * 80)
    print("Đang khởi tạo mô hình và tải trọng số vào bộ nhớ (lần đầu sẽ tải từ HuggingFace)...")

    start_init = time.perf_counter()
    try:
        detector = RobertaDetector()
    except Exception as e:
        print(f"❌ Không thể khởi tạo mô hình: {e}")
        return

    init_time = time.perf_counter() - start_init
    print(f"✅ Khởi tạo thành công trong {init_time:.2f}s trên thiết bị: {detector.device}\n")

    # Mẫu 1: Văn bản tiếng Việt do Con người viết (Human-written)
    vn_human_sample = (
        "Hôm qua mình đi chợ muộn nên không kịp mua cá tươi, đành nấu tạm gói mì tôm với ít rau cải thừa trong tủ lạnh. "
        "Ăn xong trời đổ mưa to sấm chớp ầm ầm làm mất điện cả xóm đến tận nửa đêm mới có lại."
    )

    # Mẫu 2: Văn bản tiếng Việt điển hình do ChatGPT tạo ra (AI-generated)
    vn_ai_sample = (
        "Trong cuộc sống, mỗi người đều có những mục tiêu và ước mơ riêng. Để đạt được điều mình mong muốn, "
        "chúng ta cần kiên trì, chủ động học hỏi và không ngại đối mặt với thất bại. Thành công không đến ngay lập tức "
        "mà thường là kết quả của nhiều ngày cố gắng. Mỗi khó khăn đều mang đến một bài học giúp chúng ta trưởng thành hơn. "
        "Vì vậy, thay vì sợ thất bại, hãy xem đó là cơ hội để hoàn thiện bản thân."
    )

    # Mẫu 3: Văn bản tiếng Anh do AI (ChatGPT) tạo ra (AI-generated)
    en_ai_sample = (
        "Artificial intelligence has revolutionized modern society across numerous domains, "
        "ranging from healthcare diagnostics to automated financial trading systems. "
        "Furthermore, large language models utilize deep neural network architectures to process vast "
        "amounts of textual data, thereby enabling fluent contextual comprehension and human-like text generation."
    )

    # Chạy kiểm thử mẫu 1 (Tiếng Việt - Người viết)
    t0 = time.perf_counter()
    score_vn_human = detector.predict(vn_human_sample)
    elapsed_vn_human = time.perf_counter() - t0
    format_prediction_result("Mẫu 1 - Tiếng Việt: Người viết (Human)", vn_human_sample, score_vn_human, elapsed_vn_human)

    # Chạy kiểm thử mẫu 2 (Tiếng Việt - ChatGPT)
    t0 = time.perf_counter()
    score_vn_ai = detector.predict(vn_ai_sample)
    elapsed_vn_ai = time.perf_counter() - t0
    format_prediction_result("Mẫu 2 - Tiếng Việt: ChatGPT tạo ra (AI)", vn_ai_sample, score_vn_ai, elapsed_vn_ai)

    # Chạy kiểm thử mẫu 3 (Tiếng Anh - ChatGPT)
    t0 = time.perf_counter()
    score_en_ai = detector.predict(en_ai_sample)
    elapsed_en_ai = time.perf_counter() - t0
    format_prediction_result("Mẫu 3 - Tiếng Anh: ChatGPT tạo ra (AI)", en_ai_sample, score_en_ai, elapsed_en_ai)

    # Cho phép người dùng nhập đoạn văn tùy ý từ bàn phím để kiểm tra
    print("💡 BẠN CÓ MUỐN KIỂM TRA ĐOẠN VĂN BẢN RIÊNG CỦA BẠN KHÔNG?")
    print("👉 Hãy dán/nhập đoạn văn vào dưới đây (Nhấn Enter mà không nhập gì để kết thúc):")
    try:
        user_text = input("\nNhập đoạn văn của bạn: ").strip()
        if user_text:
            t0 = time.perf_counter()
            user_score = detector.predict(user_text)
            elapsed_user = time.perf_counter() - t0
            format_prediction_result("Mẫu 4 - Đoạn văn do bạn nhập", user_text, user_score, elapsed_user)
        else:
            print("Đã hoàn tất kiểm thử.")
    except (KeyboardInterrupt, EOFError):
        print("\nĐã thoát chương trình kiểm thử.")


if __name__ == "__main__":
    main()
