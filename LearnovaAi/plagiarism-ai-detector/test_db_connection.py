"""
Script kiểm tra kết nối Supabase Database sử dụng Supabase Python SDK
"""

import sys
from pathlib import Path

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

# Thêm thư mục gốc dự án vào PYTHONPATH
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

from src.core.config import settings
from src.db.supabase_client import get_supabase_client, check_supabase_connection


def main():
    print("=" * 60)
    print("🔍 ĐANG KIỂM TRA KẾT NỐI SUPABASE DATABASE...")
    print("=" * 60)
    print(f"📍 SUPABASE_URL: {settings.SUPABASE_URL}")
    key_preview = (
        f"{settings.SUPABASE_KEY[:15]}...{settings.SUPABASE_KEY[-5:]}"
        if settings.SUPABASE_KEY
        else "None"
    )
    print(f"🔑 SUPABASE_KEY: {key_preview}")
    print("-" * 60)

    try:
        # 1. Khởi tạo Client
        client = get_supabase_client()
        print("✅ 1. Khởi tạo Supabase Client: THÀNH CÔNG")

        # 2. Kiểm tra chi tiết kết nối & truy vấn bảng
        print("🔄 2. Kiểm tra truy vấn cơ sở dữ liệu...")
        status = check_supabase_connection()

        print(f"   - Trạng thái kết nối chung: {'🟢 KẾT NỐI TỐT' if status['connected'] else '🔴 THẤT BẠI'}")
        print(f"   - Trạng thái Storage: {status['storage']}")
        print("   - Trạng thái các bảng:")
        for table, info in status["tables"].items():
            if info.get("accessible"):
                print(f"      • Bảng '{table}': Có thể truy cập (Mẫu: {info.get('rows_sample')} bản ghi)")
            else:
                print(f"      • Bảng '{table}': {info.get('reason')}")

        print("=" * 60)
        print("🎉 KẾT NỐI VÀ TRUY VẤN DATABASE SUPABASE ĐÃ HOÀN TẤT THÀNH CÔNG!")
        print("=" * 60)
    except Exception as e:
        print(f"❌ KẾT NỐI THẤT BẠI: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
