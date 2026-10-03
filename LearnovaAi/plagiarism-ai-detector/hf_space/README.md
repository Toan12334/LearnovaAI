---
title: LearnovaAI Backend API
emoji: 🚀
colorFrom: indigo
colorTo: purple
sdk: gradio
sdk_version: 4.44.0
app_file: app.py
pinned: false
short_description: Plagiarism & AI text detector FastAPI backend
---

# 🚀 LearnovaAI — Plagiarism & AI Detector API

FastAPI backend running on Hugging Face Spaces (ZeroGPU).

## 📖 API Endpoints

| Method | Path | Mô tả |
|--------|------|--------|
| GET | `/health` | Health Check |
| GET | `/docs` | Swagger UI |
| POST | `/api/v1/auth/signup` | Đăng ký tài khoản |
| POST | `/api/v1/auth/signin` | Đăng nhập |
| POST | `/api/v1/plagiarism/check` | Kiểm tra đạo văn |
| POST | `/api/v1/ai-detection/detect` | Phát hiện văn bản AI |

## 🔗 Links

- Swagger UI: `https://toanoppa10012004-learnova-ai-backend.hf.space/docs`
- Health: `https://toanoppa10012004-learnova-ai-backend.hf.space/health`
