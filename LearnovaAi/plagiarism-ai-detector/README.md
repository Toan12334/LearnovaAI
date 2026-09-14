# Plagiarism & AI Detector System

Hệ thống phát hiện đạo văn, truy vết mốc thời gian xuất bản và nhận diện văn bản sinh bởi AI (Hỗ trợ tiếng Việt và tiếng Anh).

---

## 📂 Cấu trúc thư mục dự án

```text
plagiarism-ai-detector/
├── docker/                      # Cấu hình Container (Qdrant, Redis, Postgres)
│   ├── Dockerfile
│   └── docker-compose.yml
├── docs/                        # Tài liệu nghiên cứu & API Spec
├── src/                         # Mã nguồn chính của ứng dụng
│   ├── api/                     # Định nghĩa RESTful API Endpoints
│   │   ├── v1/
│   │   │   ├── endpoints/
│   │   │   │   ├── plagiarism.py   # [GD1] Endpoint kiểm tra đạo văn
│   │   │   │   ├── timestamp.py    # [GD1] Endpoint truy vết thời gian
│   │   │   │   └── ai_detection.py # [GD2] Endpoint phát hiện AI
│   │   │   └── router.py
│   ├── core/                    # Cấu hình hệ thống, Security & Logging
│   │   ├── config.py            # Quản lý môi trường (API Keys, DB URLs)
│   │   └── logging.py
│   ├── db/                      # Quản lý kết nối Cơ sở dữ liệu
│   │   ├── qdrant_client.py     # [GD1/2] Vector DB cho Semantic Match
│   │   └── postgres_client.py   # Lưu lịch sử tra cứu & Metadata
│   ├── models/                  # Pydantic Schemas & ORM Models
│   │   ├── request.py
│   │   └── response.py
│   ├── services/                # Logic nghiệp vụ cốt lõi (Core Business)
│   │   ├── parsers/             # Trích xuất văn bản từ PDF, DOCX, TXT
│   │   │   └── doc_parser.py
│   │   ├── search/              # [GD1] Tìm nguồn nghi vấn (Google/Bing API)
│   │   │   └── web_search.py
│   │   ├── scraper/             # [GD1] Cào nội dung & Metadata từ URL
│   │   │   └── web_scraper.py
│   │   ├── timestamp/           # [GD1] Giải mã & Xác minh ngày xuất bản
│   │   │   ├── date_extractor.py# Trích xuất Meta-tags/Schema.org
│   │   │   └── archive_check.py # Fallback qua Internet Archive API
│   │   ├── plagiarism/          # [GD1] Lõi xử lý đạo văn
│   │   │   ├── winnowing.py     # Exact Match (Thuật toán Fingerprinting)
│   │   │   └── semantic.py      # Semantic Match (Vector Similarity)
│   │   └── ai_detection/        # [GD2] Lõi xử lý AI Detection
│   │       ├── perplexity.py    # Tính toán độ rối/biến thiên
│   │       └── model_infer.py   # Chạy Transformer classifier
│   └── utils/                   # Hàm tiện ích dùng chung
│       └── text_cleaner.py      # Tách câu, chuẩn hóa chữ tiếng Việt
├── tests/                       # Automated Tests (Pytest)
│   ├── test_plagiarism.py
│   └── test_timestamp.py
├── .env.example
├── pyproject.toml               # Quản lý Dependency (Poetry/Pip)
└── README.md
```

---

## 🚀 Hướng dẫn cài đặt & Khởi chạy

### 1. Khởi chạy cơ sở dữ liệu & dịch vụ nền (Docker)

```bash
cd plagiarism-ai-detector/docker
docker-compose up -d postgres qdrant redis
```

### 2. Cài đặt Dependencies

```bash
cd plagiarism-ai-detector
cp .env.example .env

# Sử dụng Poetry
poetry install
poetry shell

# Hoặc pip
pip install -r requirements.txt
```

### 3. Chạy API Server

```bash
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

- **Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Redoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

## 🧪 Kiểm thử (Testing)

```bash
pytest
```
