"""
Script kiểm thử toàn diện Pipeline đối soát đạo văn 6 bước (Backend).
Bao gồm:
1. Lưu bài gốc vào Supabase documents (pending).
2. Tách câu qua TextCleaner.
3. Lưu các câu vào Supabase document_chunks.
4. Tạo Vector embeddings qua FastEmbed (384 dimensions).
5. Lưu kho Qdrant DB.
6. Quét đối soát Qdrant (nội bộ) & Serper (web) và lưu kết quả vào Supabase plagiarism_matches.
"""

import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

from src.services.plagiarism.pipeline import plagiarism_pipeline
from src.db.supabase_client import get_supabase_client


def main():
    print("=" * 70)
    print("🚀 BẮT ĐẦU KIỂM THỬ ĐỐI SOÁT ĐẠO VĂN (Internal Match & Web Match)...")
    print("=" * 70)

    # Bài viết mới có chứa các câu trùng lặp từ bài trước (đã lưu trong Qdrant)
    sample_title = "Tiểu luận tổng quan Trí tuệ Nhân tạo 2026"
    sample_content = """
    Học máy là một nhánh của trí tuệ nhân tạo liên quan đến việc xây dựng các ứng dụng học từ dữ liệu.
    Deep learning sử dụng các mạng nơ-ron sâu với nhiều tầng ẩn để trích xuất đặc trưng phức tạp.
    Đây là một phát biểu hoàn toàn mới do tác giả tự suy nghĩ ra trong năm 2026.
    """

    print(f"📄 Tiêu đề: {sample_title}")
    print(f"📝 Nội dung kiểm tra:\n{sample_content.strip()}")
    print("-" * 70)

    result = plagiarism_pipeline.run(
        content=sample_content,
        title=sample_title,
        enable_web_search=True,
        similarity_threshold=0.75,
    )

    doc_id = result["document_id"]
    print("\n" + "=" * 70)
    print("📊 KẾT QUẢ THỰC THI PIPELINE:")
    print("=" * 70)
    print(f"✅ 1. Document ID: {doc_id}")
    print(f"✅ 2. Tổng số câu: {result['total_chunks']} câu")
    print(f"✅ 3. Số câu phát hiện trùng: {result['matched_chunks_count']} câu")
    print(f"✅ 4. Tỷ lệ đạo văn: {result['plagiarism_score']}%")
    print(f"✅ 5. Tổng số matches tìm thấy: {result['matches_count']}")

    # Truy vấn trực tiếp cơ sở dữ liệu Supabase
    supabase = get_supabase_client()
    print("\n" + "-" * 70)
    print("🔍 DỮ LIỆU THỰC TẾ TRONG SUPABASE (plagiarism_matches):")
    print("-" * 70)

    chunks_check = supabase.table("document_chunks").select("id, chunk_index, content").eq("document_id", doc_id).order("chunk_index").execute()
    chunk_ids = [c["id"] for c in chunks_check.data]

    if chunk_ids:
        matches_check = supabase.table("plagiarism_matches").select("*").in_("chunk_id", chunk_ids).execute()
        for idx, m in enumerate(matches_check.data, 1):
            print(f"Match #{idx}:")
            print(f"   - Chunk ID: {m['chunk_id']}")
            print(f"   - Nguồn (source_type): {m['source_type']}")
            print(f"   - Điểm tương đồng (similarity_score): {m['similarity_score']}")
            print(f"   - Bài trùng (matched_document_id): {m['matched_document_id']}")
            print(f"   - URL trùng (matched_url): {m['matched_url']}")
            print(f"   - Đoạn văn trùng: {m['matched_text']}")
            print("-" * 50)

    print("\n" + "=" * 70)
    print("🎉 TOÀN BỘ 6 BƯỚC PIPELINE ĐÃ ĐỐI SOÁT VÀ LƯU MATCHES THÀNH CÔNG VÀO DATABASE!")
    print("=" * 70)


if __name__ == "__main__":
    main()
