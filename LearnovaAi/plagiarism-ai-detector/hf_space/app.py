"""
HuggingFace Spaces entry point.
Mount FastAPI app vào Gradio để chạy trên Free Tier (không cần PRO subscription).
Gradio cung cấp port 7860 và UI, FastAPI xử lý /api/v1/* endpoints.
"""

import sys
import os
from pathlib import Path

# Thêm thư mục gốc vào sys.path để import src.*
ROOT = Path(__file__).parent
sys.path.insert(0, str(ROOT))

# Cấu hình biến môi trường từ HF Secrets
# (Set trong Space Settings → Repository Secrets)
# Các biến: SUPABASE_URL, SUPABASE_KEY, QDRANT_URL, QDRANT_API_KEY, SEARCH_API_KEY

import gradio as gr
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import FastAPI app từ src/main.py
from src.main import app as fastapi_app

# Tạo Gradio interface đơn giản làm landing page
def create_gradio_interface():
    with gr.Blocks(
        title="LearnovaAI API",
        theme=gr.themes.Soft(),
        css="""
        .container { max-width: 800px; margin: 0 auto; padding: 20px; }
        .api-link { color: #6366f1; text-decoration: none; font-weight: bold; }
        """
    ) as demo:
        gr.Markdown("""
        # 🎓 LearnovaAI — Plagiarism & AI Detector API

        **Backend FastAPI** đang chạy tại Space này.

        ## 🔗 Truy cập API

        | Endpoint | Mô tả |
        |----------|--------|
        | [`/docs`](/docs) | **Swagger UI** — Test tất cả API trực tiếp |
        | [`/redoc`](/redoc) | ReDoc Documentation |
        | [`/health`](/health) | Health Check |
        | [`/api/v1/auth/signup`](/docs#/Auth) | Đăng ký tài khoản |
        | [`/api/v1/plagiarism/check`](/docs#/Plagiarism) | Kiểm tra đạo văn |
        | [`/api/v1/ai-detection/detect`](/docs#/AI%20Detection) | Phát hiện văn bản AI |

        ## 📌 Hướng dẫn sử dụng

        1. Click vào **[/docs](/docs)** để mở Swagger UI
        2. Dùng endpoint `/api/v1/auth/signup` để tạo tài khoản
        3. Đăng nhập qua `/api/v1/auth/signin` để nhận JWT token
        4. Dùng token để truy cập các API được bảo vệ

        ---
        *Powered by FastAPI + XLM-RoBERTa + BAAI/bge-m3*
        """)

    return demo


# Mount Gradio vào FastAPI
demo = create_gradio_interface()

# Mount FastAPI app với Gradio
app = gr.mount_gradio_app(fastapi_app, demo, path="/")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=7860)
