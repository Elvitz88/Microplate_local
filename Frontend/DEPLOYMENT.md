# Frontend Deployment Guide

## 📋 Overview

Frontend ของระบบ Microplate Production สามารถ deploy ได้ 3 รูปแบบ:

1. **Development Mode** - Webpack Dev Server (Port 6410)
2. **Production Mode** - Docker Container with Nginx (Port 6410)
3. **With API Gateway** - รวม API endpoints ทั้งหมดไว้ที่ Port 6400

---

## 🚀 Quick Start

### 1. Development Mode (Local)

```bash
# ติดตั้ง dependencies
cd Frontend
yarn install

# Copy .env file
cp .env.example .env

# รัน dev server
yarn dev
```

เข้าถึงที่: **http://localhost:6410**

### 2. Production Mode (Docker)

```bash
# สร้าง .env file
cp .env.example .env

# Build และรัน Frontend container
docker-compose --profile frontend up -d --build

# หรือใช้ชื่อเต็ม
docker-compose -f docker-compose.yml --profile frontend up -d
```

เข้าถึงที่: **http://localhost:6410**

### 3. With API Gateway (Optional)

API Gateway รวม API endpoints ทั้งหมดไว้ที่ Port 6400

```bash
# รัน Frontend + API Gateway
docker-compose --profile frontend --profile gateway up -d --build
```

เข้าถึง:
- **Frontend**: http://localhost:6410
- **API Gateway**: http://localhost:6400

---

## 🔧 Configuration

### Environment Variables (.env)

```bash
# Frontend Port
FRONTEND_PORT=6410

# API Gateway Port
API_GATEWAY_PORT=6400

# Backend Service URLs (Browser จะเรียกใช้)
VITE_AUTH_SERVICE_URL=http://localhost:6401
VITE_IMAGE_SERVICE_URL=http://localhost:6402
VITE_VISION_SERVICE_URL=http://localhost:6403
VITE_RESULTS_SERVICE_URL=http://localhost:6404
VITE_LABWARE_SERVICE_URL=http://localhost:6405
VITE_PREDICTION_SERVICE_URL=http://localhost:6406
VITE_VISION_CAPTURE_SERVICE_URL=http://localhost:6407
VITE_MINIO_BASE_URL=http://localhost:9000
VITE_API_BASE_URL=http://localhost:6410
```

**สำคัญ:** URLs เหล่านี้เป็น URLs ที่ **Browser จะเรียกใช้** ไม่ใช่ container-to-container!

### สำหรับ Production Deployment

เปลี่ยน URLs ให้ตรงกับ domain/IP จริง:

```bash
VITE_AUTH_SERVICE_URL=https://your-domain.com/api/v1/auth
VITE_IMAGE_SERVICE_URL=https://your-domain.com/api/v1/images
VITE_VISION_SERVICE_URL=https://your-domain.com/api/v1/vision
...
```

---

## 📂 File Structure

```
Frontend/
├── Dockerfile              # Multi-stage build (builder + nginx)
├── docker-compose.yml      # Services: frontend, api-gateway
├── nginx.conf             # Nginx config สำหรับ Frontend container
├── proxy.conf             # Nginx config สำหรับ API Gateway
├── webpack.config.js      # Webpack config + dev server
├── .env.example           # ตัวอย่าง environment variables
├── .env                   # Environment variables (ไม่ commit)
└── src/                   # React source code
```

---

## 🌐 Nginx Configuration

### nginx.conf (Frontend Container)

- ใช้สำหรับ serve static files (HTML, JS, CSS)
- Proxy API requests ไปยัง backend services
- รองรับ client-side routing (React Router)
- WebSocket support สำหรับ real-time updates

**Key Features:**
- Client max body size: 25MB (สำหรับ upload รูปภาพ)
- Gzip compression
- Static asset caching (1 year)
- Security headers

### proxy.conf (API Gateway - Optional)

- รวม API endpoints ทั้งหมดไว้ที่ Port 6400
- ใช้ Docker service names (container-to-container)
- CORS headers สำหรับ cross-origin requests

**Upstreams:**
```nginx
upstream auth-service {
    server microplate-auth-service:6401;
}
upstream image-service {
    server microplate-image-ingestion-service:6402;
}
...
```

---

## 🔍 API Routing

### Frontend Container (Port 6410)

Nginx proxy ส่งต่อ API requests ไปยัง backend services:

```
GET  /api/v1/auth/*       → microplate-auth-service:6401
POST /api/v1/files/*      → microplate-image-ingestion-service:6402
POST /api/v1/vision/*     → microplate-vision-inference-api:6403
GET  /api/v1/result/*     → microplate-result-api-service:6404
POST /api/v1/interface/*  → microplate-labware-interface-service:6405
GET  /api/v1/prediction/* → microplate-prediction-db-service:6406
POST /api/v1/capture/*    → microplate-vision-capture:6407
WS   /ws/*                → WebSocket connections
```

### API Gateway (Port 6400 - Optional)

API Gateway เป็น single entry point สำหรับ API requests ทั้งหมด

---

## 🐳 Docker Commands

### Build

```bash
# Build Frontend image
docker-compose build microplate-frontend

# Build with no cache
docker-compose build --no-cache microplate-frontend
```

### Run

```bash
# Start Frontend only
docker-compose --profile frontend up -d

# Start with API Gateway
docker-compose --profile frontend --profile gateway up -d

# View logs
docker-compose logs -f microplate-frontend

# Stop
docker-compose --profile frontend down
```

### Debug

```bash
# เข้าไปใน container
docker exec -it microplate-frontend sh

# ดู nginx config
docker exec microplate-frontend cat /etc/nginx/nginx.conf

# ดู logs
docker logs microplate-frontend

# Test nginx config
docker exec microplate-frontend nginx -t
```

---

## 🧪 Testing

### Health Check

```bash
# Frontend health
curl http://localhost:6410/health

# API Gateway health (if running)
curl http://localhost:6400/health
```

### Test API Routing

```bash
# Test Auth API
curl http://localhost:6410/api/v1/auth/health

# Test Result API
curl http://localhost:6410/api/v1/result/samples
```

---

## 🔐 Security

Frontend ใช้ security headers:

```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

API Gateway รองรับ CORS:

```nginx
add_header Access-Control-Allow-Origin * always;
add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, PATCH, OPTIONS" always;
```

---

## 📝 Notes

### 1. Environment Variables at Runtime

Frontend container จะอ่าน `.env` file ที่ mount เข้ามา:

```yaml
volumes:
  - ./.env:/usr/share/nginx/html/.env:ro
```

React app จะโหลด environment variables จาก `.env` file นี้เมื่อ runtime

### 2. Service Dependencies

Frontend container ใช้ `depends_on` เพื่อรอ backend services:

```yaml
depends_on:
  - microplate-auth-service
  - microplate-image-ingestion-service
  - ...
```

**Note:** `depends_on` รอแค่ container start ไม่ได้รอให้ service พร้อมใช้งาน ใช้ healthcheck เพื่อตรวจสอบ

### 3. Docker Network

ทุก services ใช้ network: `microplate-network`

```yaml
networks:
  microplate-network:
    external: true
    name: microplate-network
```

**Important:** Network ต้องถูกสร้างก่อน:

```bash
docker network create microplate-network
```

---

## 🐛 Troubleshooting

### ปัญหา: Frontend ไม่สามารถเรียก API ได้

**สาเหตุ:** Backend services ยังไม่ start หรือ network ไม่ถูกต้อง

**แก้ไข:**
```bash
# ตรวจสอบว่า backend services ทำงานอยู่
docker ps | grep microplate

# ตรวจสอบ network
docker network inspect microplate-network

# Restart frontend
docker-compose --profile frontend restart
```

### ปัญหา: 413 Request Entity Too Large

**สาเหตุ:** ไฟล์ upload ใหญ่เกิน nginx limit

**แก้ไข:** แก้ไข `client_max_body_size` ใน `nginx.conf`:
```nginx
client_max_body_size 25m;  # เพิ่มเป็น 25MB
```

### ปัญหา: WebSocket connection failed

**สาเหตุ:** WebSocket proxy ไม่ถูกต้อง

**แก้ไข:** ตรวจสอบ nginx config:
```nginx
location /ws/ {
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    ...
}
```

---

## 📚 Additional Resources

- [Nginx Documentation](https://nginx.org/en/docs/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [React Documentation](https://react.dev/)
- [Webpack Documentation](https://webpack.js.org/)

---

**Updated:** 2026-01-13
**Version:** 2.0
