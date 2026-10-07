import asyncio
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from src.services.ai_detector import AIDetectorService

# Sample 1: Bài viết 100% ChatGPT tạo ra
AI_ARTICLE = (
    "Trí tuệ nhân tạo (AI) đang dần trở thành một trong những công nghệ cốt lõi định hình tương lai của nhân loại. "
    "Nhìn chung, công nghệ này đóng vai trò quan trọng trong việc nâng cao hiệu suất làm việc và tối ưu hóa quy trình. "
    "Trong lĩnh vực giáo dục, giải pháp này giúp cá nhân hóa lộ trình học tập cho từng học sinh. "
    "Để đạt được kết quả tối ưu, chúng ta cần xem xét các yếu tố cốt lõi và tiêu chuẩn đạo đức khi triển khai. "
    "Tóm lại, việc ứng dụng trí tuệ nhân tạo mang lại nhiều lợi ích thiết thực cho sự phát triển của xã hội."
)

# Sample 2: Bài viết do con người sáng tác
HUMAN_ARTICLE = (
    "Quê tôi là một vùng đất yên bình với những cánh đồng lúa bạt ngàn trải dài tận chân trời. "
    "Hồi nhỏ tôi hay cùng lũ bạn trong làng rủ nhau đi thả diều mỗi chiều hè lộng gió. "
    "Mẹ tôi là người phụ nữ tảo tần, sớm tối chăm sóc chu đáo cho cả gia đình. "
    "Mỗi lần nhớ về quê hương, lòng tôi lại trào dâng cảm xúc thân thương và da diết."
)

# Sample 3: Văn bản hỗn hợp (2 câu người viết + 2 câu AI)
MIXED_ARTICLE = (
    "Quê tôi là một vùng đất yên bình với những cánh đồng lúa bạt ngàn trải dài tận chân trời. "
    "Hồi nhỏ tôi hay cùng lũ bạn trong làng rủ nhau đi thả diều mỗi chiều hè lộng gió. "
    "Nhìn chung, công nghệ này đóng vai trò quan trọng trong việc nâng cao hiệu suất làm việc và tối ưu hóa quy trình. "
    "Tóm lại, việc ứng dụng trí tuệ nhân tạo mang lại nhiều lợi ích thiết thực cho sự phát triển của xã hội."
)

async def test_flow():
    print("=" * 70)
    print("  KẾT QUẢ KIỂM THỬ LUỒNG DETECT AI VỚI MÔ HÌNH PHOBERT MỚI HUẤN LUYỆN")
    print("=" * 70)
    
    svc = AIDetectorService()
    print(f"📌 [TRẠNG THÁI MODEL] HF Model Loaded: {svc.use_hf_model}")
    print(f"📌 [TÊN MÔ HÌNH]     {svc.model_name}")
    print(f"📌 [THIẾT BỊ NẠP]    {svc.device}\n")
    
    samples = [
        ("BÀI VIẾT DO CHATGPT TẠO (AI 100%)", AI_ARTICLE),
        ("BÀI VIẾT DO CON NGƯỜI TẠO (HUMAN 100%)", HUMAN_ARTICLE),
        ("BÀI VIẾT HỖN HỢP (50% HUMAN + 50% AI)", MIXED_ARTICLE),
    ]

    for title, text in samples:
        print(f"----------------------------------------------------------------------")
        print(f"📄 {title}")
        print(f"----------------------------------------------------------------------")
        res = await svc.analyze_document(text)
        print(f"  • Tỷ lệ AI tổng thể:      {res['overall_ai_score']}%")
        print(f"  • Phần trăm AI:           {res['ai_generated_percentage']}%")
        print(f"  • Phần trăm Con người:    {res['human_written_percentage']}%")
        print(f"  • Detector hoạt động:     {res['detector']}")
        print(f"  • Chi tiết từng đoạn (Sentence / Passage Heatmap):")
        for idx, item in enumerate(res.get("sentence_heatmap", []), 1):
            status = "🤖 [AI GENERATED]" if item["is_ai"] else "👤 [HUMAN WRITTEN]"
            print(f"    [{idx}] {status:<20} | Score AI: {item['ai_score']*100:5.1f}% | Đoạn: '{item['text'][:65]}...'")
        print()

if __name__ == "__main__":
    asyncio.run(test_flow())
