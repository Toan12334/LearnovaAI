---
title: LearnovaAI Plagiarism & AI Detector API
emoji: 🎓
colorFrom: indigo
colorTo: purple
sdk: docker
app_port: 7860
pinned: false
license: mit
short_description: FastAPI backend phát hiện đạo văn và văn bản AI (XLM-RoBERTa + BAAI/bge-m3)
---

# 🎓 LearnovaAI — Plagiarism & AI Detector API

FastAPI backend cung cấp các dịch vụ:
- **Phát hiện đạo văn** (Winnowing + Semantic Embedding với BAAI/bge-m3)
- **Nhận diện văn bản AI** (XLM-RoBERTa multilingual detector)
- **Truy vết mốc thời gian** xuất bản nguồn
- **Auth** với Supabase JWT

## API Documentation

Truy cập Swagger UI: `https://your-space.hf.space/docs`

## Endpoints

| Method | Path | Mô tả |
|--------|------|--------|
| POST | `/api/v1/auth/signup` | Đăng ký tài khoản |
| POST | `/api/v1/auth/signin` | Đăng nhập |
| POST | `/api/v1/plagiarism/check` | Kiểm tra đạo văn |
| POST | `/api/v1/ai-detection/detect` | Phát hiện văn bản AI |
| GET | `/health` | Health check |
| GET | `/docs` | Swagger UI |
