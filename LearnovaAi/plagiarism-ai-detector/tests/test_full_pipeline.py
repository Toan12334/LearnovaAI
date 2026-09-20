"""
Module Kiểm thử Toàn diện Pipeline Đối Soát Đạo Văn (Tests)
Có thể chạy trực tiếp:
    py tests/test_full_pipeline.py
Hoặc chạy qua pytest:
    pytest tests/test_full_pipeline.py
"""

import sys
from pathlib import Path

# Cấu hình encoding UTF-8 cho Windows Console
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

# Thêm thư mục gốc dự án vào PYTHONPATH
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from src.core.config import settings
from src.services.plagiarism.pipeline import plagiarism_pipeline
from src.db.supabase_client import get_supabase_client
from qdrant_client import QdrantClient


def run_test_scenario(title: str, text: str):
    print("\n" + "=" * 75)
    print(f"📌 BẮT ĐẦU TEST: '{title}'")
    print("=" * 75)
    print(f"🔹 Cấu hình Vector DB : Qdrant ({settings.QDRANT_COLLECTION})")
    print(f"🔹 Mô hình Embedding  : {settings.EMBEDDING_MODEL} (1024 dims)")
    print(f"🔹 Supabase URL       : {settings.SUPABASE_URL}")
    print("-" * 75)

    # 1. Gọi Pipeline 6 bước
    result = plagiarism_pipeline.run(
        content=text,
        title=title,
        enable_web_search=True,
        similarity_threshold=0.75,
    )

    doc_id = result["document_id"]
    print(f"✅ BƯỚC 1: Lưu bài viết gốc vào Supabase -> Document ID: {doc_id}")
    print(f"✅ BƯỚC 2: Tách câu qua TextCleaner     -> Tổng cộng {result['total_chunks']} câu")
    print(f"✅ BƯỚC 3: Lưu document_chunks          -> Đã ghi nhận các chunk_id")
    print(f"✅ BƯỚC 4: Tạo Vector (BAAI/bge-m3)     -> Đã sinh vector 1024 chiều")
    print(f"✅ BƯỚC 5: Lưu kho Qdrant Cloud         -> Đã nạp vào '{settings.QDRANT_COLLECTION}'")
    print(f"✅ BƯỚC 6: Đối soát trùng lặp           -> Tỷ lệ đạo văn: {result['plagiarism_score']}%")

    # 2. Xác minh dữ liệu trực tiếp trên Supabase
    supabase = get_supabase_client()
    doc_res = supabase.table("documents").select("*").eq("id", doc_id).execute()
    assert len(doc_res.data) > 0, "Lỗi: Không tìm thấy document trên Supabase!"
    doc_data = doc_res.data[0]
    print(f"\n🔍 KIỂM TRA TRẠNG THÁI TRÊN SUPABASE:")
    print(f"   • Tiêu đề: {doc_data['title']}")
    print(f"   • Trạng thái: {doc_data['status']}")
    print(f"   • Điểm đạo văn: {doc_data['plagiarism_score']}%")

    chunks_res = supabase.table("document_chunks").select("id, chunk_index, content").eq("document_id", doc_id).execute()
    print(f"   • Số chunks đã lưu: {len(chunks_res.data)} chunks")

    # 3. Xác minh điểm trên Qdrant Cloud
    try:
        if settings.QDRANT_URL:
            q_client = QdrantClient(url=settings.QDRANT_URL, api_key=settings.QDRANT_API_KEY)
        else:
            q_client = QdrantClient(host=settings.QDRANT_HOST, port=settings.QDRANT_PORT, api_key=settings.QDRANT_API_KEY)
        
        info = q_client.get_collection(settings.QDRANT_COLLECTION)
        print(f"\n☁️ KIỂM TRA TRÊN QDRANT CLOUD:")
        print(f"   • Collection: {settings.QDRANT_COLLECTION}")
        print(f"   • Status: {info.status}")
        print(f"   • Tổng số vector points hiện tại: {info.points_count}")
    except Exception as e:
        print(f"⚠️ Kiểm tra Qdrant: {e}")

    # 4. Kiểm tra các matches trùng lặp (nếu có)
    if result["matches"]:
        print(f"\n🚨 PHÁT HIỆN {len(result['matches'])} ĐOẠN TRÙNG LẶP:")
        for idx, m in enumerate(result["matches"], 1):
            print(f"   [{idx}] Nguồn: {m.get('source_type')} | Độ tương đồng: {m.get('similarity_score')}")
            if m.get("matched_url"):
                print(f"       URL: {m.get('matched_url')}")
            print(f"       Nội dung: {m.get('matched_text')[:80]}...")
    else:
        print("\n✨ Không phát hiện trùng lặp đáng kể (Văn bản nguyên bản).")

    print("=" * 75)
    return result


def test_pipeline_execution():
    """Hàm test chuẩn cho pytest"""
    sample_text = """
    Học máy là một nhánh quan trọng của trí tuệ nhân tạo.
    Mô hình BAAI bge-m3 hỗ trợ đa ngôn ngữ và biểu diễn ngữ nghĩa rất tốt.
    """
    res = run_test_scenario("Pytest Sample Document", sample_text)
    assert res["status"] == "completed"
    assert res["total_chunks"] >= 1


if __name__ == "__main__":
    # Đoạn văn bản mẫu kiểm tra tiếng Việt thực tế
    text_to_test = """
    Trí tuệ nhân tạo (AI) đang phát triển mạnh mẽ và thay đổi nhiều khía cạnh của đời sống con người.
    Học máy là một nhánh của trí tuệ nhân tạo liên quan đến việc xây dựng các ứng dụng học từ dữ liệu.
    Hệ thống phát hiện đạo văn sử dụng công nghệ tìm kiếm vector kết hợp với cơ sở dữ liệu đám mây.
    """
    run_test_scenario("Bài viết Thử nghiệm Kiểm tra Đạo văn", text_to_test)
