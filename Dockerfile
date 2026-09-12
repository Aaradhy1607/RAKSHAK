FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for build
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements & install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend, ML, geo, and test artifacts
COPY backend/ ./backend/
COPY ml/ ./ml/
COPY geo/ ./geo/
COPY data/ ./data/

# Pre-train and serialize models on container build
RUN python -m ml.benchmark

EXPOSE 8000

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
