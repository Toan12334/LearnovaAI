"""
Test Module: Kiểm thử Quy tắc Nghiệp vụ Tự Trùng Lặp (Self-Plagiarism)
Kiểm chứng 3 kịch bản:
1. Lần 1: user_A kiểm tra bài viết gốc -> Đạt 0% đạo văn (nguyên bản).
2. Lần 2: CÙNG user_A bấm kiểm tra lại (hoặc nộp lại bài cũ) -> Vẫn đạt 0% đạo văn (Hệ thống loại trừ bản cũ của chính user_A).
3. Lần 3: user_B nộp bài có nội dung trùng với user_A -> Bị phát hiện đạo văn 100% (Trùng với bài của user_A).
"""

import sys
import uuid
from pathlib import Path

# Cấu hình UTF-8 cho Windows console
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from src.services.plagiarism.pipeline import plagiarism_pipeline
from src.db.supabase_client import get_supabase_client
from src.db.qdrant_client import qdrant_service
from src.core.config import settings


def main():
    print("=" * 80)
    print("🛡️ BẮT ĐẦU KIỂM THỬ QUY TẮC NGHIỆP VỤ TỰ ĐẠO VĂN (SELF-PLAGIARISM)...")
    print("=" * 80)

    session_id = uuid.uuid4().hex[:8]
    user_A = f"user_author_{session_id}"
    user_B = f"user_other_{session_id}"

    # Văn bản thử nghiệm với chủ đề hoàn toàn mới mẻ chưa từng có trong hệ thống
    test_title = f"Nghiên cứu về Liệu pháp Gen và Y sinh CRISPR {session_id}"
    test_content = f"""
    Công nghệ chỉnh sửa gen CRISPR Cas9 phiên bản {session_id} mở ra kỷ nguyên mới cho điều trị bệnh di truyền.
    Các enzyme cắt DNA đặc hiệu mã hiệu {session_id} cho phép can thiệp chính xác vào các đoạn mã khiếm khuyết.
    Liệu pháp tế bào miễn dịch kết hợp kỹ thuật sinh học phân tử {session_id} đang đem lại hy vọng lớn cho y học.
    """

    created_doc_ids = []

    try:
        # -------------------------------------------------------------------------
        # KỊCH BẢN 1: user_A nộp bài lần đầu tiên
        # -------------------------------------------------------------------------
        print("\n" + "-" * 80)
        print(f"1️⃣ [KỊCH BẢN 1] user_A ({user_A}) gửi bài viết kiểm tra LẦN ĐẦU:")
        print("-" * 80)
        res_1 = plagiarism_pipeline.run(
            content=test_content,
            title=test_title,
            user_id=user_A,
            enable_web_search=False,  # Tắt web search để kiểm tra độc lập cơ chế Qdrant Self-Plagiarism
            similarity_threshold=0.80,
        )
        created_doc_ids.append(res_1["document_id"])
        print(f"   -> Document ID 1: {res_1['document_id']}")
        print(f"   -> Số câu: {res_1['total_chunks']}")
        print(f"   -> Số câu trùng: {res_1['matched_chunks_count']}")
        print(f"   -> Tỷ lệ đạo văn: {res_1['plagiarism_score']}%")
        assert res_1["plagiarism_score"] == 0.0, f"Lỗi: Lần 1 phải đạt 0% đạo văn, nhưng nhận {res_1['plagiarism_score']}%!"
        print("   ✅ KẾT QUẢ: 0% ĐẠO VĂN (CHÍNH XÁC)")

        # -------------------------------------------------------------------------
        # KỊCH BẢN 2: CÙNG user_A bấm kiểm tra lại bài viết đó (hoặc nộp lại bài cũ)
        # -------------------------------------------------------------------------
        print("\n" + "-" * 80)
        print(f"2️⃣ [KỊCH BẢN 2] CÙNG user_A ({user_A}) nộp lại bài viết đó LẦN THỨ HAI:")
        print("   (Kỳ vọng: Hệ thống loại trừ các vector cũ của user_A -> Vẫn đạt 0% đạo văn)")
        print("-" * 80)
        res_2 = plagiarism_pipeline.run(
            content=test_content,
            title=f"{test_title} (Lần 2)",
            user_id=user_A,
            enable_web_search=False,
            similarity_threshold=0.80,
        )
        created_doc_ids.append(res_2["document_id"])
        print(f"   -> Document ID 2: {res_2['document_id']}")
        print(f"   -> Số câu: {res_2['total_chunks']}")
        print(f"   -> Số câu trùng: {res_2['matched_chunks_count']}")
        print(f"   -> Tỷ lệ đạo văn: {res_2['plagiarism_score']}%")
        assert res_2["plagiarism_score"] == 0.0, f"Lỗi: Cùng user_A nộp lại không được tự trùng với chính mình (nhận {res_2['plagiarism_score']}%)!"
        print("   ✅ KẾT QUẢ: VẪN ĐẠT 0% ĐẠO VĂN (LOẠI TRỪ TỰ TRÙNG LẶP THÀNH CÔNG 🎉)")

        # -------------------------------------------------------------------------
        # KỊCH BẢN 3: user_B nộp bài viết sao chép từ bài của user_A
        # -------------------------------------------------------------------------
        print("\n" + "-" * 80)
        print(f"3️⃣ [KỊCH BẢN 3] NGƯỜI DÙNG KHÁC user_B ({user_B}) nộp bài viết này:")
        print("   (Kỳ vọng: Hệ thống phát hiện bài trùng từ user_A -> Bị tính đạo văn)")
        print("-" * 80)
        res_3 = plagiarism_pipeline.run(
            content=test_content,
            title=f"{test_title} (user_B nộp)",
            user_id=user_B,
            enable_web_search=False,
            similarity_threshold=0.80,
        )
        created_doc_ids.append(res_3["document_id"])
        print(f"   -> Document ID 3: {res_3['document_id']}")
        print(f"   -> Số câu: {res_3['total_chunks']}")
        print(f"   -> Số câu trùng: {res_3['matched_chunks_count']}")
        print(f"   -> Tỷ lệ đạo văn: {res_3['plagiarism_score']}%")
        print(f"   -> Số matches phát hiện: {len(res_3['matches'])}")
        assert res_3["plagiarism_score"] > 0.0, "Lỗi: user_B phải bị phát hiện trùng lặp từ bài của user_A!"
        print(f"   ✅ KẾT QUẢ: PHÁT HIỆN ĐẠO VĂN {res_3['plagiarism_score']}% TỪ user_A (CHÍNH XÁC 🎉)")

        print("\n" + "=" * 80)
        print("🏆 TẤT CẢ CÁC QUY TẮC NGHIỆP VỤ VỀ SELF-PLAGIARISM ĐÃ HOẠT ĐỘNG HOÀN HẢO!")
        print("=" * 80)

    finally:
        # Dọn dẹp dữ liệu test tạm thời để không ảnh hưởng dữ liệu chính
        supabase = get_supabase_client()
        from qdrant_client.http.models import Filter, FieldCondition, MatchValue
        for d_id in created_doc_ids:
            try:
                # Xóa matches, chunks, documents tương ứng trên Supabase
                chunks = supabase.table("document_chunks").select("id").eq("document_id", d_id).execute()
                c_ids = [c["id"] for c in (chunks.data or [])]
                if c_ids:
                    supabase.table("plagiarism_matches").delete().in_("chunk_id", c_ids).execute()
                    supabase.table("document_chunks").delete().in_("id", c_ids).execute()
                supabase.table("documents").delete().eq("id", d_id).execute()

                # Xóa các points tương ứng trên Qdrant Cloud
                qdrant_service.client.delete(
                    collection_name=settings.QDRANT_COLLECTION,
                    points_selector=Filter(must=[FieldCondition(key="document_id", match=MatchValue(value=str(d_id)))]),
                )
            except Exception:
                pass


if __name__ == "__main__":
    main()
