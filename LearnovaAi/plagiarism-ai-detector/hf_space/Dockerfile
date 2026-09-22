# ============================================================
# Dockerfile dành riêng cho Hugging Face Spaces
# KHÁC với Railway Dockerfile ở 2 điểm:
#   1. PORT = 7860 (HF bắt buộc)
#   2. Không bake model vào image (HF tải nhanh từ hub nội bộ)
# ============================================================
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    # HuggingFace Spaces: cache model trong /data (persistent volume)
    HF_HOME=/data/model_cache \
    TRANSFORMERS_CACHE=/data/model_cache \
    SENTENCE_TRANSFORMERS_HOME=/data/model_cache \
    HF_HUB_DISABLE_TELEMETRY=1 \
    TOKENIZERS_PARALLELISM=false \
    # HF Spaces yêu cầu PORT = 7860
    PORT=7860

WORKDIR /app

# System dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Bước 1: Pin NumPy < 2 (PyTorch CPU không tương thích NumPy 2.x)
RUN pip install --no-cache-dir "numpy<2"

# Bước 2: PyTorch CPU-only (nhẹ hơn GPU version ~800MB)
RUN pip install --no-cache-dir \
    "torch==2.3.1" \
    --index-url https://download.pytorch.org/whl/cpu

# Bước 3: ML libraries
RUN pip install --no-cache-dir \
    "transformers==4.41.2" \
    "sentence-transformers==3.0.1" \
    "sentencepiece==0.2.0" \
    "tiktoken==0.7.0" \
    "accelerate==0.30.0"

# Bước 4: Project dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY src/ ./src/

# HF Spaces yêu cầu expose port 7860
EXPOSE 7860

# Health check
HEALTHCHECK --interval=30s --timeout=15s --start-period=120s --retries=5 \
    CMD curl -f http://localhost:7860/health || exit 1

# Chạy với 1 worker (HF free tier CPU cơ bản)
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "7860", "--workers", "1", "--log-level", "info"]
