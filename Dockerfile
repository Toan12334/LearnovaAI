FROM python:3.10-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip, setuptools, wheel
RUN pip install --no-cache-dir --upgrade pip setuptools wheel

# Copy backend requirements
COPY LearnovaAi/plagiarism-ai-detector/requirements.txt .

# Install CPU PyTorch using --extra-index-url
RUN pip install --no-cache-dir torch --extra-index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir -r requirements.txt

# Copy backend application source code
COPY LearnovaAi/plagiarism-ai-detector/ .

EXPOSE 8000

# Bind dynamically to Railway's $PORT environment variable
CMD sh -c "uvicorn src.main:app --host 0.0.0.0 --port ${PORT:-8000}"
