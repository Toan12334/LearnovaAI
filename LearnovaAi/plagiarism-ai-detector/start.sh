#!/bin/sh
set -e

PORT="${PORT:-8000}"
echo "================================================="
echo "=== LearnovaAI Backend starting on 0.0.0.0:${PORT} ==="
echo "================================================="
exec uvicorn src.main:app --host 0.0.0.0 --port "${PORT}"
