#!/bin/bash
# Script khởi động container — đặt đúng biến môi trường cache trước khi chạy uvicorn

# Báo cho HuggingFace dùng đúng thư mục cache đã được bake vào image
export HF_HOME=/app/model_cache
export TRANSFORMERS_CACHE=/app/model_cache
export SENTENCE_TRANSFORMERS_HOME=/app/model_cache
export HF_HUB_DISABLE_TELEMETRY=1
export TOKENIZERS_PARALLELISM=false

echo "🚀 Khởi động LearnovaAI Backend API..."
echo "   Cache dir: $HF_HOME"
echo "   PORT: ${PORT:-8000}"
echo "   Workers: ${WORKERS:-2}"

exec uvicorn src.main:app \
    --host 0.0.0.0 \
    --port "${PORT:-8000}" \
    --workers "${WORKERS:-2}" \
    --log-level info
