# Deployment & Operational Guide

## 1. Local Development Setup

### Backend Deployment
```bash
# 1. Train ML model & generate registries
python -m ml.benchmark

# 2. Run backend development server
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend Deployment
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173`.

---

## 2. Production Docker Deployment

### Dockerfile (Backend)
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
RUN python -m ml.benchmark
EXPOSE 8000
CMD ["python", "-m", "uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Dockerfile (Frontend)
```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

---

## 3. Environment Variables (`.env`)
```ini
PROJECT_NAME="NER Landslide Early Warning & Risk Intelligence System"
HOST=0.0.0.0
PORT=8000
DEBUG=False
DATABASE_URL=sqlite:///./data/landslide_system.db
OPEN_METEO_BASE_URL=https://api.open-meteo.com/v1/forecast
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=
SMTP_PASSWORD=
ALERT_EMAIL_SENDER=alerts@ner-earlywarning.gov.in
```
