# 📘 LearnovaAI — Developer Deployment & Architecture Guide

Tài liệu chi tiết dành cho lập trình viên (Developer) phục vụ công tác quản trị, truy cập, vận hành và phát triển hệ thống **LearnovaAI** trên máy chủ VPS (`103.178.235.88`).

---

## 1. 🌐 Bảng Địa Chỉ Truy Cập Dịch Vụ (Service Endpoints)

| Dịch vụ | URL / Địa chỉ | Ghi chú |
| :--- | :--- | :--- |
| **Website Frontend (User UI)** | [http://103.178.235.88/](http://103.178.235.88/) | Giao diện chính ứng dụng Web SPA (Nginx port 80) |
| **Backend API Gateway** | [http://103.178.235.88/api/](http://103.178.235.88/api/) | FastAPI Backend (Reverse Proxy từ port 8000) |
| **Tài liệu API Swagger UI** | [http://103.178.235.88/docs](http://103.178.235.88/docs) | Giao diện kiểm thử toàn bộ REST Endpoints |
| **Supabase Studio Dashboard** | [http://103.178.235.88:3000](http://103.178.235.88:3000) | Giao diện Web quản lý Database & Users trực quan |
| **Supabase REST / Auth API** | [http://103.178.235.88:54321](http://103.178.235.88:54321) | Cổng Supabase GoTrue Auth & PostgREST API |

---

## 2. 🗄️ Cấu Hình Kết Nối Cơ Sở Dữ Liệu (PostgreSQL & Supabase)

### A. Kết nối qua Supabase Python SDK (`supabase-py`):
```ini
SUPABASE_URL=http://103.178.235.88:54321
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzkxMzY1MzkzLCJleHAiOjE5NDkwNDUzOTN9.hC2DQk1YyyczKOzcmOvZpwFhIso7ZEkMCv4vNXCusng
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3OTEzNjUzOTMsImV4cCI6MTk4OTA0NTM5M30.8TdVlAsccU6pE84nY1IczIvjE0XhRT7zQHZnQtSiGRw
JWT_SECRET=DTCjUshtW3AMEfPPQ0jg4QOAdoeJVBUoyENw+EV7
```

### B. Kết nối PostgreSQL trực tiếp (DBeaver, TablePlus, pgAdmin):
- **Host / IP**: `103.178.235.88`
- **Port**: `5432`
- **Database Name**: `postgres`
- **User**: `postgres`
- **Password**: `5b6a07795fdc59608fbdb2661a4305b5`

### C. Danh Sách Các Bảng (Database Schemas):
1. **`auth.users`**: Lưu tài khoản đăng nhập (`id`, `email`, `encrypted_password`, `created_at`).
2. **`public.profiles`**: Lưu thông tin hồ sơ (`id`, `full_name`, `avatar_url`, `created_at`, `updated_at`).
3. **`public.documents`**: Lưu bài viết gốc & chỉ số đạo văn/AI (`id`, `user_id`, `title`, `content`, `plagiarism_score`, `ai_score`, `status`).
4. **`public.document_chunks`**: Lưu từng câu/đoạn văn phân tách (`id`, `document_id`, `chunk_index`, `content`, `ai_probability`, `perplexity`).
5. **`public.plagiarism_matches`**: Lưu kết quả trùng lặp đạo văn (`id`, `chunk_id`, `source_type`, `matched_url`, `matched_text`, `similarity_score`).

---

## 3. 🤖 Các Mô Hình AI Đã Deploy Trực Tiếp Trên VPS

1. **PhoBERT Vietnamese AI Detector**
   - **Model Name**: `toanoppa10012004/phobert-vietnamese-ai-detector`
   - **Vị trí Cache trên VPS**: `/root/.cache/huggingface/hub`
   - **Tốc độ suy luận**: ~200 ms / request trên CPU.
   - **Kiểm tra trạng thái**: `GET http://103.178.235.88/api/v1/ai-detection/health`

2. **Multilingual Embedding Model (Vector 384 dimensions)**
   - **Model Name**: `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`
   - **Nhiệm vụ**: Sinh vector ngữ nghĩa 384 chiều cho đối soát đạo văn với Qdrant Vector Cloud.

---

## 4. 📂 Thư Mục Dự Án & Quản Lý Dịch Vụ Trên VPS

### A. Thư mục trên VPS:
- **Backend FastAPI**: `/opt/learnova-backend`
- **Virtual Environment**: `/opt/learnova-backend/venv`
- **File Biến Môi Trường Backend**: `/opt/learnova-backend/.env`
- **Frontend Dist (Nginx Web Root)**: `/var/www/learnova`
- **Self-hosted Supabase**: `/root/supabase`

### B. Các Lệnh Quản Lý Dịch Vụ Thường Dùng (SSH):

```bash
# 1. Kiểm tra trạng thái Backend FastAPI:
systemctl status learnova-backend

# 2. Khởi động lại Backend:
systemctl restart learnova-backend

# 3. Xem log thời gian thực của Backend:
journalctl -u learnova-backend -f

# 4. Kiểm tra & Nạp lại cấu hình Nginx:
nginx -t && systemctl reload nginx

# 5. Kiểm tra trạng thái cụm Supabase Docker:
cd /root/supabase && sh run.sh status
```

---

## 5. 🔄 Quy Trình Cập Nhật Code Khi Phát Triển Tính Năng Mới (Dev Workflow)

### Cập nhật Backend:
```bash
# Trên máy local: commit & push code
git push origin main

# Trên VPS qua SSH:
cd /opt/learnova-backend
git pull origin main
./venv/bin/pip install -r requirements.txt  # (Nếu có thêm package mới)
systemctl restart learnova-backend
```

### Cập nhật Frontend:
```bash
# Trên máy local (trong thư mục learnnovaaiui):
npm run build

# Đẩy thư mục dist mới lên VPS thay thế cho /var/www/learnova và reload Nginx:
systemctl reload nginx
```

> 💡 **Tip**: Bạn cũng có thể yêu cầu AI cập nhật tự động bằng câu lệnh: *"Hãy build và deploy code mới nhất của Backend/Frontend lên VPS giúp tôi."*
