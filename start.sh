#!/bin/sh
set -e

# The Railway public domain for this service targets port 8000 (derived from the EXPOSE
# directive in the Dockerfile). Railway may inject a PORT value that the edge does NOT
# route to, so we bind 8000 by default. Set APP_PORT to override if the domain's target
# port ever changes.
PORT="${APP_PORT:-8000}"
echo "================================================="
echo "=== LearnovaAI Backend starting on 0.0.0.0:${PORT} ==="
echo "================================================="
exec uvicorn src.main:app --host 0.0.0.0 --port "${PORT}"
