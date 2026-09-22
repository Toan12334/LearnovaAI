"""
Script deploy lên Hugging Face Spaces tự động.
Dùng huggingface_hub SDK để tạo/cập nhật Space.

Cài đặt: pip install huggingface_hub
Chạy: python hf_space/deploy_to_hf.py
"""

import os
import sys

# Fix Unicode output trên Windows console (cp1252 không hỗ trợ emoji)
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

import shutil
import tempfile
from pathlib import Path

# ====== CẤU HÌNH ======
HF_TOKEN = os.environ.get("HF_TOKEN", "")   # Token HF (Settings → Access Tokens → Write)
HF_USERNAME = os.environ.get("HF_USERNAME", "your-hf-username")  # Username HF của bạn
SPACE_NAME = "learnova-ai-backend"           # Tên Space (sẽ tạo nếu chưa có)
REPO_ID = f"{HF_USERNAME}/{SPACE_NAME}"

# Thư mục gốc của backend
BACKEND_ROOT = Path(__file__).parent.parent  # plagiarism-ai-detector/
HF_SPACE_DIR = Path(__file__).parent         # plagiarism-ai-detector/hf_space/
# ======================


def deploy():
    if not HF_TOKEN:
        print("❌ Thiếu HF_TOKEN! Đặt biến môi trường: set HF_TOKEN=hf_xxx...")
        return

    try:
        from huggingface_hub import HfApi, create_repo
    except ImportError:
        print("❌ Chưa cài huggingface_hub. Chạy: pip install huggingface_hub")
        return

    api = HfApi(token=HF_TOKEN)

    # Tạo Space nếu chưa tồn tại
    print(f"🚀 Đang tạo/kiểm tra Space: {REPO_ID}")
    try:
        create_repo(
            repo_id=REPO_ID,
            repo_type="space",
            space_sdk="gradio",     # gradio = free tier, docker = PRO only
            private=False,
            token=HF_TOKEN,
            exist_ok=True,
        )
        print(f"   ✅ Space sẵn sàng: https://huggingface.co/spaces/{REPO_ID}")
    except Exception as e:
        print(f"   ⚠ Space đã tồn tại hoặc lỗi: {e}")

    # Upload các file cần thiết lên Space
    files_to_upload = [
        (HF_SPACE_DIR / "README.md",    "README.md"),
        (HF_SPACE_DIR / "app.py",       "app.py"),
        (BACKEND_ROOT / "requirements.txt", "requirements.txt"),
    ]

    print("\n📦 Đang upload files lên Space...")
    for local_path, remote_path in files_to_upload:
        if local_path.exists():
            api.upload_file(
                path_or_fileobj=str(local_path),
                path_in_repo=remote_path,
                repo_id=REPO_ID,
                repo_type="space",
                token=HF_TOKEN,
            )
            print(f"   ✅ {local_path.name} → {remote_path}")
        else:
            print(f"   ⚠ Không tìm thấy: {local_path}")

    # Upload toàn bộ thư mục src/
    src_dir = BACKEND_ROOT / "src"
    print(f"\n📂 Đang upload thư mục src/ ({len(list(src_dir.rglob('*.py')))} files)...")
    api.upload_folder(
        folder_path=str(src_dir),
        path_in_repo="src",
        repo_id=REPO_ID,
        repo_type="space",
        token=HF_TOKEN,
        ignore_patterns=["__pycache__", "*.pyc", "*.pyo"],
    )
    print("   ✅ src/ đã được upload")

    print(f"\n🎉 DEPLOY THÀNH CÔNG!")
    print(f"   Space URL  : https://huggingface.co/spaces/{REPO_ID}")
    print(f"   API URL    : https://{HF_USERNAME}-{SPACE_NAME}.hf.space")
    print(f"   Docs (Swagger): https://{HF_USERNAME}-{SPACE_NAME}.hf.space/docs")
    print(f"\n⏳ HF Spaces đang build Docker image (~10-15 phút lần đầu)...")
    print(f"   Theo dõi tại: https://huggingface.co/spaces/{REPO_ID}")


if __name__ == "__main__":
    deploy()
