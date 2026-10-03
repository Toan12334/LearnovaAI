"""
Hugging Face Spaces entry point - Pure FastAPI (no Gradio).
Chạy FastAPI trực tiếp trên port 7860 mà không cần Gradio wrapper.
Tránh hoàn toàn bug HfFolder của gradio==4.44.0 vs huggingface_hub>=0.30.
"""

import sys
import os
from pathlib import Path

# Thêm thư mục gốc vào sys.path để import src.*
ROOT = Path(__file__).parent
sys.path.insert(0, str(ROOT))

# Import FastAPI app từ src/main.py
from src.main import app  # noqa: E402

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=7860,
        workers=1,
        log_level="info",
    )
