# ============================================================
# Stage 1: Builder — Cài đặt tất cả dependencies Python
# ============================================================
FROM python:3.11-slim AS builder

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Cài đặt system dependencies cần thiết
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency files
COPY requirements.txt ./

# Cài đặt tất cả Python packages (bao gồm torch + transformers + sentence-transformers)
RUN pip install --no-cache-dir \
    torch==2.2.2 --index-url https://download.pytorch.org/whl/cpu \
    && pip install --no-cache-dir \
    transformers==4.40.0 \
    sentence-transformers==3.0.1 \
    sentencepiece==0.2.0 \
    tiktoken==0.7.0 \
    accelerate==0.30.0 \
    && pip install --no-cache-dir -r requirements.txt


# ============================================================
# Stage 2: Model Downloader — Tải model vào cache
# Chạy lúc docker build, KHÔNG chạy lại mỗi lần khởi động container
# ============================================================
FROM builder AS model-downloader

ENV HF_HOME=/app/model_cache \
    TRANSFORMERS_CACHE=/app/model_cache \
    SENTENCE_TRANSFORMERS_HOME=/app/model_cache \
    HF_HUB_DISABLE_TELEMETRY=1 \
    TOKENIZERS_PARALLELISM=false

RUN mkdir -p /app/model_cache

COPY docker/preload_models.py ./docker/
RUN python docker/preload_models.py


# ============================================================
# Stage 3: Runtime — Image cuối cùng, nhẹ nhất có thể
# ============================================================
FROM python:3.11-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    # Trỏ HuggingFace cache đến thư mục đã được bake vào image ở Stage 2
    HF_HOME=/app/model_cache \
    TRANSFORMERS_CACHE=/app/model_cache \
    SENTENCE_TRANSFORMERS_HOME=/app/model_cache \
    HF_HUB_DISABLE_TELEMETRY=1 \
    TOKENIZERS_PARALLELISM=false \
    # Railway tự động inject PORT
    PORT=8000 \
    WORKERS=2

WORKDIR /app

# Chỉ copy runtime packages từ builder stage (không copy build tools)
COPY --from=builder /usr/local/lib/python3.11/site-packages/ /usr/local/lib/python3.11/site-packages/
COPY --from=builder /usr/local/bin/ /usr/local/bin/

# Copy model cache đã tải sẵn từ model-downloader stage
COPY --from=model-downloader /app/model_cache /app/model_cache

# Copy source code
COPY src/ ./src/

# Railway yêu cầu PORT được expose
EXPOSE 8000

# Health check để Railway biết app đã sẵn sàng
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8000}/health || exit 1

# Dùng sh -c để Railway có thể inject $PORT qua env var
CMD ["sh", "-c", "uvicorn src.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers ${WORKERS:-2} --log-level info"]
