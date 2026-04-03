# factory-process-maker: 프론트 빌드 후 단일 Python 서버로 서빙
# 빌드: docker build -t factory-process-maker --build-arg VITE_API_BASE_URL='' .
# 실행: docker run -p 8000:8000 --env-file .env factory-process-maker

# ---- 프론트엔드 빌드 스테이지 ----
FROM node:20-alpine AS frontend-builder

WORKDIR /frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./

ARG VITE_API_BASE_URL=""
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build

# ---- 프로덕션 스테이지 ----
FROM python:3.11-slim

RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./

# 프론트엔드 빌드 결과물 복사
COPY --from=frontend-builder /frontend/dist ./frontend_dist

RUN mkdir -p uploads frames

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
