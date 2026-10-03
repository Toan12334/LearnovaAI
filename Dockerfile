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

# Install CPU PyTorch and backend requirements using CPU extra index url
RUN pip install --no-cache-dir torch --extra-index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir -r requirements.txt --extra-index-url https://download.pytorch.org/whl/cpu

# Copy backend application source code
COPY LearnovaAi/plagiarism-ai-detector/ .

# Make start.sh executable
RUN chmod +x ./start.sh

EXPOSE 8000

# Start via start.sh to bind to Railway's dynamic $PORT
CMD ["./start.sh"]
