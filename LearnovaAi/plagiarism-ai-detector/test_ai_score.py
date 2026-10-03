import asyncio
from src.services.ai_detector import AIDetectorService

# Doan van dung cho check truoc: "Nha em co nuoi mot chu cho ten la Mit..."
VIETNAMESE_TEXT = (
    "Nh\u00e0 em c\u00f3 nu\u00f4i m\u1ed9t ch\u00fa ch\u00f3 r\u1ea5t \u0111\u00e1ng y\u00eau t\u00ean l\u00e0 M\u00edt. "
    "M\u00edt c\u00f3 b\u1ed9 l\u00f4ng m\u00e0u v\u00e0ng \u00f3ng, m\u1ec1m m\u01b0\u1ee3t nh\u01b0 m\u1ed9t chi\u1ebfc \u00e1o nh\u1ecf l\u00fac n\u00e0o c\u0169ng s\u1ea1ch s\u1ebd. "
    "\u0110\u00f4i m\u1eaft ch\u00fa \u0111en tr\u00f2n, long lanh nh\u01b0 hai h\u1ea1t nh\u00e3n, lu\u00f4n \u00e1nh l\u00ean v\u1ebb th\u00f4ng minh v\u00e0 tinh ngh\u1ecbch. "
    "Hai chi\u1ebfc tai l\u00fac n\u00e0o c\u0169ng v\u1ec3nh l\u00ean m\u1ed7i khi nghe th\u1ea5y ti\u1ebfng \u0111\u1ed9ng l\u1ea1. "
    "Chi\u1ebfc m\u0169i \u0111en b\u00f3ng v\u00e0 r\u1ea5t th\u00ednh, c\u00f3 th\u1ec3 ng\u1eedi th\u1ea5y m\u00f9i th\u1ee9c \u0103n t\u1eeb r\u1ea5t xa. "
    "M\u1ed7i bu\u1ed5i chi\u1ec1u, em th\u01b0\u1eddng ch\u01a1i b\u00f3ng c\u00f9ng M\u00edt ngo\u00e0i s\u00e2n. "
    "Ch\u00fa ch\u1ea1y theo qu\u1ea3 b\u00f3ng, r\u1ed3i ngo\u1ea1m l\u1ea5y v\u00e0 mang tr\u1edf l\u1ea1i."
)

async def run():
    svc = AIDetectorService()
    print("=== KIEM TRA TRANG THAI MODEL ===")
    print("HF Model loaded:", svc.use_hf_model)
    print("Model name:", svc.model_name)
    print("Device:", svc.device)
    print()
    print("=== PHAN TICH VAN BAN ===")
    result = await svc.analyze_document(VIETNAMESE_TEXT)
    print("Overall AI score:", result["overall_ai_score"], "%")
    print("AI generated:", result["ai_generated_percentage"], "%")
    print("Human written:", result["human_written_percentage"], "%")
    print("Detector:", result["detector"])
    print("Model status:", result["model_health"]["status"])
    print()
    print("=== HEATMAP CHI TIET ===")
    for item in result["sentence_heatmap"]:
        label = "AI" if item["is_ai"] else "Human"
        print(f"  [{label}] {item['ai_score']:.2%} | {item['text'][:60]}...")

asyncio.run(run())
