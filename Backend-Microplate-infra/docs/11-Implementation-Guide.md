# Implementation Guide

## Overview

This guide provides step-by-step instructions for implementing the Microplate AI System. It covers development setup, service implementation, testing, and deployment.

## Prerequisites

### System Requirements
- **Node.js**: 18.x or higher
- **Python**: 3.11 or higher
- **PostgreSQL**: 17 or higher
- **Docker**: 20.x or higher
- **Yarn**: 1.22 or higher
- **Git**: 2.x or higher

### Development Tools
- **IDE**: VS Code with recommended extensions
- **Database Client**: pgAdmin or DBeaver
- **API Testing**: Postman or Insomnia
- **Version Control**: Git

## Development Setup

### 1. Repository Structure
```bash
microplate-ai-system/
├── services/
│   ├── auth-service/
│   ├── image-ingestion-service/
│   ├── vision-inference-service/
│   ├── result-api-service/
│   ├── labware-interface-service/
│   └── vision-capture-service/
├── frontend/
├── infrastructure/
│   ├── docker/
│   ├── kubernetes/
│   └── terraform/
├── docs/
├── scripts/
└── docker-compose.yml
```

### 2. Environment Setup

#### Clone Repository
```bash
# Setup the workspace folder
mkdir Microplate_Services
cd Microplate_Services
# Clone repositories (example structure)
git clone <auth-service-repo-url> Backend-Microplate-auth-service
# ... clone other services ...
```

#### Create Environment Files
```bash
# Copy environment templates
cp Backend-Microplate-auth-service/.env.example Backend-Microplate-auth-service/.env
cp Backend-Microplate-image-ingestion-service/.env.example Backend-Microplate-image-ingestion-service/.env
cp Backend-Microplate-vision-inference-service/.env.example Backend-Microplate-vision-inference-service/.env
cp Backend-Microplate-result-api-service/.env.example Backend-Microplate-result-api-service/.env
cp Backend-Microplate-labware-interface-service/.env.example Backend-Microplate-labware-interface-service/.env
cp Device/vision-capture-service/.env.example Device/vision-capture-service/.env
cp Frontend/.env.example Frontend/.env
```

#### Configure Environment Variables
Update each `.env` file with appropriate values for your development environment.

### 3. Database Setup

#### Install PostgreSQL
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql-17 postgresql-client-17

# macOS
brew install postgresql@17

# Windows
# Download from https://www.postgresql.org/download/windows/
```

#### Create Database
```sql
-- Connect to PostgreSQL
psql -U postgres

-- Create database
CREATE DATABASE microplates;

-- Create schemas
\c microplates;
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS microplates;
CREATE SCHEMA IF NOT EXISTS public;

-- Create user
CREATE USER microplate_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE microplates TO microplate_user;
GRANT ALL PRIVILEGES ON SCHEMA auth TO microplate_user;
GRANT ALL PRIVILEGES ON SCHEMA microplates TO microplate_user;
GRANT ALL PRIVILEGES ON SCHEMA public TO microplate_user;
```

#### Run Database Migrations
```bash
# Navigate to auth-service
cd Backend-Microplate-auth-service

# Install dependencies
yarn install

# Generate Prisma client
yarn prisma generate

# Run migrations
yarn prisma migrate dev

# Seed database
yarn prisma db seed
```

### 4. Object Storage Setup

#### Install MinIO
```bash
# Using Docker
docker run -d \
  --name minio \
  -p 9000:9000 \
  -p 9001:9001 \
  -e MINIO_ROOT_USER=minioadmin \
  -e MINIO_ROOT_PASSWORD=minioadmin \
  minio/minio server /data --console-address ":9001"

# Create buckets
mc alias set local http://localhost:9000 minioadmin minioadmin
mc mb local/raw-images
mc mb local/annotated-images
mc mb local/thumbnails
```

## Service Implementation

### 1. Auth Service Implementation

#### Initialize Project
```bash
cd Backend-Microplate-auth-service
yarn init -y
yarn add fastify @fastify/jwt @fastify/cors @fastify/helmet @fastify/rate-limit
yarn add prisma @prisma/client
yarn add argon2 jsonwebtoken nodemailer
yarn add zod
yarn add -D typescript @types/node tsx nodemon
```

#### Project Structure
```bash
auth-service/
├── src/
│   ├── config/
│   ├── controllers/
│   ├── services/
│   ├── middleware/
│   ├── routes/
│   ├── schemas/
│   ├── utils/
│   ├── types/
│   └── app.ts
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── tests/
├── package.json
├── tsconfig.json
└── .env
```

#### Core Implementation
```typescript
// src/app.ts
import Fastify from 'fastify';
import { authRoutes } from './routes/auth.routes';
import { userRoutes } from './routes/user.routes';
import { adminRoutes } from './routes/admin.routes';
import { healthRoutes } from './routes/health.routes';

const fastify = Fastify({
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty'
    }
  }
});

// Register plugins
await fastify.register(require('@fastify/helmet'));

await fastify.register(require('@fastify/rate-limit'), {
  max: 100,
  timeWindow: '1 minute'
});

// Register routes
await fastify.register(authRoutes, { prefix: '/api/v1/auth' });
await fastify.register(userRoutes, { prefix: '/api/v1/auth' });
await fastify.register(adminRoutes, { prefix: '/api/v1/auth' });
await fastify.register(healthRoutes);

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: 6401, host: '0.0.0.0' });
    console.log('Auth service running on port 6401');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
```

> **หมายเหตุ**: ในระบบปัจจุบัน CORS และ rate limit ถูกจัดการโดย gateway ส่วนบริการแต่ละตัวสามารถตัด plugin `@fastify/cors` ออกได้เมื่อ deploy จริง ใช้เฉพาะตอนสาธิตหรือทดสอบแบบ stand-alone เท่านั้น

### 2. Image Ingestion Service Implementation

#### Initialize Project
```bash
cd Backend-Microplate-image-ingestion-service
yarn init -y
yarn add fastify @fastify/multipart @fastify/cors @fastify/helmet
yarn add prisma @prisma/client
yarn add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
yarn add sharp
yarn add zod
yarn add -D typescript @types/node tsx nodemon
```

#### Core Implementation
```typescript
// src/app.ts
import Fastify from 'fastify';
import { imageRoutes } from './routes/image.routes';
import { uploadRoutes } from './routes/upload.routes';
import { healthRoutes } from './routes/health.routes';

const fastify = Fastify({
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty'
    }
  }
});

// Register plugins
await fastify.register(require('@fastify/multipart'));

// Register routes
await fastify.register(imageRoutes, { prefix: '/api/v1/images' });
await fastify.register(uploadRoutes, { prefix: '/api/v1/images' });
await fastify.register(healthRoutes);

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: 6402, host: '0.0.0.0' });
    console.log('Image ingestion service running on port 6402');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
```

> **หมายเหตุ**: เช่นเดียวกับ auth-service ให้ gateway จัดการ CORS/Rate limit ใน production ตัวอย่างนี้ตัด `@fastify/cors` ออกเพื่อให้โค้ดสอดคล้องกับการใช้งานจริง

### 3. Vision Inference Service Implementation

#### Initialize Project
```bash
cd Backend-Microplate-vision-inference-service
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install fastapi uvicorn
pip install torch torchvision
pip install opencv-python pillow
pip install numpy scikit-image
pip install asyncpg httpx
pip install pydantic
pip install python-multipart
```

#### Project Structure
```bash
vision-inference-service/
├── src/
│   ├── config/
│   ├── controllers/
│   ├── services/
│   ├── models/
│   ├── utils/
│   ├── schemas/
│   ├── types/
│   └── main.py
├── models/
│   ├── yolo/
│   └── classification/
├── tests/
├── requirements.txt
├── Dockerfile
└── .env
```

#### Core Implementation
```python
# src/main.py
from fastapi import FastAPI, HTTPException
from contextlib import asynccontextmanager
import uvicorn

from controllers.inference_controller import InferenceController
from services.inference_service import InferenceService
from services.model_service import ModelService
from config.database import init_database

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_database()
    await ModelService.initialize()
    yield
    # Shutdown
    pass

app = FastAPI(
    title="Vision Inference Service",
    description="AI model inference for microplate analysis",
    version="1.0.0",
    lifespan=lifespan
)

# Initialize services
inference_service = InferenceService()
inference_controller = InferenceController(inference_service)

# Register routes
app.include_router(inference_controller.router, prefix="/api/v1/inference")

@app.get("/healthz")
async def health_check():
    return {"status": "ok"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=6403)
```

> หมายเหตุ: การจัดการ CORS ดำเนินการผ่าน API gateway จึงไม่ต้องตั้ง middleware ในบริการย่อย

### 4. Frontend Implementation

#### Initialize Project
```bash
cd Frontend
yarn create vite . --template react-ts
yarn add @tanstack/react-query
yarn add react-router-dom
yarn add react-hook-form @hookform/resolvers zod
yarn add @headlessui/react @heroicons/react
yarn add tailwindcss @tailwindcss/forms
yarn add chart.js react-chartjs-2
yarn add date-fns
yarn add -D @types/react @types/react-dom
```

#### Core Implementation
```typescript
// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
```

## Testing Implementation

### 1. Unit Testing

#### Backend Services
```bash
# Install testing dependencies
yarn add -D jest @types/jest ts-jest supertest
yarn add -D @testing-library/jest-dom

# Create jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
  ],
};
```

#### Frontend Components
```bash
# Install testing dependencies
yarn add -D @testing-library/react @testing-library/jest-dom
yarn add -D @testing-library/user-event vitest jsdom

# Create vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
});
```

### 2. Integration Testing

#### API Testing
```typescript
// tests/integration/auth.test.ts
import request from 'supertest';
import { app } from '../src/app';

describe('Auth API', () => {
  test('POST /api/v1/auth/register', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'test@example.com',
        username: 'testuser',
        password: 'TestPass123!',
        firstName: 'Test',
        lastName: 'User'
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  test('POST /api/v1/auth/login', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        username: 'test@example.com',
        password: 'TestPass123!'
      });

    expect(response.status).toBe(200);
    expect(response.body.data.accessToken).toBeDefined();
  });
});
```

### 3. End-to-End Testing

#### Cypress Setup
```bash
# Install Cypress
yarn add -D cypress

# Create cypress.config.ts
import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'cypress/e2e/**/*.cy.ts',
  },
});
```

#### E2E Test Example
```typescript
// cypress/e2e/capture.cy.ts
describe('Capture Page', () => {
  beforeEach(() => {
    cy.visit('/capture');
  });

  it('should capture and analyze an image', () => {
    // Fill sample form
    cy.get('[data-testid="sample-no-input"]').type('S123456');
    cy.get('[data-testid="submission-no-input"]').type('SUB789');
    
    // Capture image
    cy.get('[data-testid="capture-button"]').click();
    
    // Wait for image to load
    cy.get('[data-testid="image-panel"]').should('be.visible');
    
    // Predict image
    cy.get('[data-testid="predict-button"]').click();
    
    // Wait for results
    cy.get('[data-testid="results-tabs"]').should('be.visible');
    cy.get('[data-testid="predict-tab"]').click();
    
    // Verify results
    cy.get('[data-testid="well-grid"]').should('be.visible');
  });
});
```

## Docker Implementation

### 1. Service Dockerfiles

#### Node.js Service
```dockerfile
# services/auth-service/Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy source code
COPY . .

# Build application
RUN yarn build

# Expose port
EXPOSE 6401

# Start application
CMD ["yarn", "start:prod"]
```

#### Python Service
```dockerfile
# services/vision-inference-service/Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Expose port
EXPOSE 6403

# Start application
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "6403"]
```

### 2. Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:17
    environment:
      POSTGRES_DB: microplates
      POSTGRES_USER: microplate_user
      POSTGRES_PASSWORD: your_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/init-db.sql

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  auth-service:
    build: ./services/auth-service
    environment:
      DATABASE_URL: postgresql://microplate_user:your_password@postgres:5432/microplates
      JWT_SECRET: your-jwt-secret
      JWT_REFRESH_SECRET: your-refresh-secret
    ports:
      - "6401:6401"
    depends_on:
      - postgres

  image-ingestion-service:
    build: ./services/image-ingestion-service
    environment:
      DATABASE_URL: postgresql://microplate_user:your_password@postgres:5432/microplates
      OBJECT_STORAGE_ENDPOINT: http://minio:9000
      OBJECT_STORAGE_ACCESS_KEY: minioadmin
      OBJECT_STORAGE_SECRET_KEY: minioadmin
    ports:
      - "6402:6402"
    depends_on:
      - postgres
      - minio

  vision-inference-service:
    build: ./services/vision-inference-service
    environment:
      DATABASE_URL: postgresql://microplate_user:your_password@postgres:5432/microplates
      IMAGE_SERVICE_URL: http://image-ingestion-service:6402
    ports:
      - "6403:6403"
    depends_on:
      - postgres
      - image-ingestion-service

  result-api-service:
    build: ./services/result-api-service
    environment:
      DATABASE_URL: postgresql://microplate_user:your_password@postgres:5432/microplates
      REDIS_URL: redis://redis:6379
    ports:
      - "6404:6404"
    depends_on:
      - postgres
      - redis

  labware-interface-service:
    build: ./services/labware-interface-service
    environment:
      DATABASE_URL: postgresql://microplate_user:your_password@postgres:5432/microplates
      OUTPUT_DIRECTORY: /app/generated
    ports:
      - "6405:6405"
    volumes:
      - ./shared:/app/generated
    depends_on:
      - postgres

  vision-capture-service:
    build: ./services/vision-capture-service
    environment:
      DEFAULT_CAMERA_ID: 0
    ports:
      - "6406:6406"
    devices:
      - /dev/video0:/dev/video0

  frontend:
    build: ./frontend
    ports:
      - "3000:80"
    depends_on:
      - auth-service
      - image-ingestion-service
      - vision-inference-service
      - result-api-service
      - labware-interface-service
      - vision-capture-service

volumes:
  postgres_data:
  minio_data:
```

## Development Workflow

### 1. Local Development

#### Start All Services
```bash
# Start infrastructure services
docker-compose up postgres minio redis -d

# Start backend services
yarn dev:backend

# Start frontend
yarn dev:frontend
```

#### Individual Service Development
```bash
# Start specific service
cd Backend-Microplate-auth-service
yarn dev

# Run tests
yarn test

# Run linting
yarn lint

# Run type checking
yarn type-check
```

### 2. Code Quality

#### Pre-commit Hooks
```bash
# Install husky
yarn add -D husky lint-staged

# Setup pre-commit hook
npx husky install
npx husky add .husky/pre-commit "yarn lint-staged"
```

#### Lint-staged Configuration
```json
// package.json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md}": [
      "prettier --write"
    ]
  }
}
```

### 3. CI/CD Pipeline

#### GitHub Actions
```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:17
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: microplates_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'yarn'
      
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Install dependencies
        run: |
          yarn install
          cd Backend-Microplate-vision-inference-service
          pip install -r requirements.txt
      
      - name: Run tests
        run: |
          yarn test:backend
          yarn test:frontend
          cd Backend-Microplate-vision-inference-service
          python -m pytest
      
      - name: Build Docker images
        run: |
          docker-compose build
      
      - name: Run integration tests
        run: |
          docker-compose up -d
          yarn test:integration
          docker-compose down
```

## Deployment

### 1. Production Environment

#### Environment Configuration
```bash
# Production environment variables
NODE_ENV=production
LOG_LEVEL=info
DATABASE_URL=postgresql://user:password@db:5432/microplates
REDIS_URL=redis://redis:6379
JWT_SECRET=your-production-jwt-secret
OBJECT_STORAGE_ENDPOINT=https://s3.amazonaws.com
OBJECT_STORAGE_ACCESS_KEY=your-access-key
OBJECT_STORAGE_SECRET_KEY=your-secret-key
```

#### Docker Production Build
```dockerfile
# Multi-stage build for production
FROM node:18-alpine AS builder

WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production

COPY . .
RUN yarn build

FROM node:18-alpine AS production

WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

EXPOSE 6401
CMD ["node", "dist/app.js"]
```

### 2. Kubernetes Deployment

#### Namespace
```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: microplate-ai
```

#### ConfigMap
```yaml
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: microplate-config
  namespace: microplate-ai
data:
  NODE_ENV: "production"
  LOG_LEVEL: "info"
  DATABASE_URL: "postgresql://user:password@postgres:5432/microplates"
  REDIS_URL: "redis://redis:6379"
```

#### Deployment
```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: auth-service
  namespace: microplate-ai
spec:
  replicas: 3
  selector:
    matchLabels:
      app: auth-service
  template:
    metadata:
      labels:
        app: auth-service
    spec:
      containers:
      - name: auth-service
        image: microplate-ai/auth-service:latest
        ports:
        - containerPort: 6401
        envFrom:
        - configMapRef:
            name: microplate-config
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

#### Service
```yaml
# k8s/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: auth-service
  namespace: microplate-ai
spec:
  selector:
    app: auth-service
  ports:
  - port: 6401
    targetPort: 6401
  type: ClusterIP
```

#### Ingress
```yaml
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: microplate-ai-ingress
  namespace: microplate-ai
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  rules:
  - host: api.microplate-ai.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: gateway
            port:
              number: 6400
```

## Monitoring and Observability

### 1. Logging

#### Structured Logging
```typescript
// services/auth-service/src/utils/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname'
    }
  }
});

export const createChildLogger = (context: Record<string, any>) => {
  return logger.child(context);
};
```

### 2. Metrics

#### Prometheus Metrics
```typescript
// services/gateway/src/utils/metrics.ts
import client from 'prom-client';

export const register = new client.Registry();

// Add default metrics
client.collectDefaultMetrics({ register });

// Custom metrics
export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

export const httpRequestTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestTotal);
```

### 3. Health Checks

#### Service Health Check
```typescript
// services/auth-service/src/routes/health.routes.ts
import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const healthRoutes = async (fastify: FastifyInstance) => {
  fastify.get('/healthz', async (request, reply) => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  fastify.get('/readyz', async (request, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { status: 'ready', timestamp: new Date().toISOString() };
    } catch (error) {
      reply.code(503);
      return { status: 'not ready', error: error.message };
    }
  });

  fastify.get('/metrics', async (request, reply) => {
    reply.type('text/plain');
    return register.metrics();
  });
};
```

## Troubleshooting

### 1. Common Issues

#### Database Connection Issues
```bash
# Check database connectivity
psql -h localhost -U microplate_user -d microplates -c "SELECT 1;"

# Check database logs
docker logs postgres

# Reset database
docker-compose down -v
docker-compose up postgres -d
yarn prisma migrate dev
```

#### Service Communication Issues
```bash
# Check service health
curl http://localhost:6400/healthz

# Check service logs
docker logs auth-service
docker logs image-ingestion-service

# Test service connectivity
curl http://localhost:6401/api/v1/auth/healthz
curl http://localhost:6402/api/v1/images/healthz
```

#### Frontend Issues
```bash
# Check frontend build
yarn build

# Check browser console
# Open browser dev tools and check for errors

# Clear browser cache
# Hard refresh (Ctrl+Shift+R)
```

### 2. Performance Issues

#### Database Performance
```sql
-- Check slow queries
SELECT query, mean_time, calls, total_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Check table sizes
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname IN ('auth', 'microplates')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

#### Memory Issues
```bash
# Check container memory usage
docker stats

# Check service memory usage
ps aux | grep node
ps aux | grep python

# Monitor memory leaks
# Use heap snapshots in Node.js
# Use memory profiler in Python
```

## Security Considerations

### 1. Environment Security

#### Secrets Management
```bash
# Use environment variables for secrets
export JWT_SECRET=$(openssl rand -base64 32)
export DATABASE_PASSWORD=$(openssl rand -base64 32)

# Use secret management tools
# - HashiCorp Vault
# - AWS Secrets Manager
# - Azure Key Vault
```

#### Network Security
```yaml
# Docker network isolation
networks:
  microplate-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

### 2. Application Security

#### Input Validation
```typescript
// Validate all inputs
import { z } from 'zod';

const sampleFormSchema = z.object({
  sampleNo: z.string().min(1).max(50),
  submissionNo: z.string().min(1).max(50).optional(),
});

// Sanitize inputs
import DOMPurify from 'dompurify';
const sanitizedInput = DOMPurify.sanitize(userInput);
```

#### Authentication Security
```typescript
// Secure JWT configuration
const jwtConfig = {
  accessToken: {
    secret: process.env.JWT_ACCESS_SECRET,
    expiresIn: '15m',
    algorithm: 'HS256'
  },
  refreshToken: {
    secret: process.env.JWT_REFRESH_SECRET,
    expiresIn: '7d',
    algorithm: 'HS256'
  }
};
```

This implementation guide provides a comprehensive roadmap for building and deploying the Microplate AI System. Follow the steps sequentially, and refer to the individual service documentation for detailed implementation specifics.
