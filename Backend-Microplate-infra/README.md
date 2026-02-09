# Microplate Backend Services

> Backend microservices and infrastructure for the Microplate AI System

---

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Services](#services)
- [Infrastructure](#infrastructure)
- [Quick Start](#quick-start)
- [Development](#development)
- [Database Management](#database-management)
- [API Documentation](#api-documentation)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

This directory contains all backend services and infrastructure components for the Microplate AI System. The backend is built using a **microservices architecture** with Node.js/TypeScript for business services and Python for AI/ML services.

### Key Components

- **6 Backend Services** - Independent, scalable microservices
- **Infrastructure Services** - PostgreSQL, MinIO, Redis, Prometheus, Grafana
- **Docker Compose** - Orchestration for development and testing
- **Shared Libraries** - Common middleware and utilities

---

## 🏗️ Architecture

The system is organized into multiple repositories, with each service and the infrastructure configuration residing in its own directory (repository).

```
Microplate_Services/
├── Backend-Microplate-auth-service/           # Authentication & Authorization (Port 6401)
├── Backend-Microplate-image-ingestion-service/# Image Storage & Management (Port 6402)
├── Backend-Microplate-labware-interface-service/ # CSV Generation (Port 6403)
├── Backend-Microplate-result-api-service/     # Result APIs & Aggregation (Port 6404)
├── Backend-Microplate-vision-inference-service/ # AI Model Inference (Port 6405)
├── Backend-Microplate-prediction-db-service/  # Database Operations (Port 6406)
├── Backend-Microplate-infra/                  # Infrastructure configuration & Docs
│   ├── docker-compose.apps.yml
│   ├── docker-compose.infra.yml
│   └── docs/
├── Backend-Microplate-shared-lib/             # Shared libraries
├── Device/                                    # Device specific services
│   └── vision-capture-service/
└── Frontend/                                  # Frontend Application
```

---

## 🔧 Services

### Service Matrix

| Service | Port | Technology | Responsibility | Documentation |
|---------|------|------------|----------------|---------------|
| **Auth Service** | 6401 | Node.js + Fastify + Prisma | User authentication, JWT tokens, RBAC | [Docs](../docs/03-Auth-Service.md) |
| **Image Ingestion** | 6402 | Node.js + Fastify + Prisma | Image storage, signed URLs, MinIO integration | [Docs](../docs/04-Image-Ingestion-Service.md) |
| **Labware Interface** | 6403 | Node.js + Fastify + Prisma | CSV generation, file delivery | [Docs](../docs/07-Labware-Interface-Service.md) |
| **Result API** | 6404 | Node.js + Fastify + Prisma | Data aggregation, WebSocket, APIs | [Docs](../docs/06-Result-API-Service.md) |
| **Vision Inference** | 6405 | Python + FastAPI | AI inference, YOLO detection | [Docs](../docs/05-Vision-Inference-Service.md) |
| **Prediction DB** | 6406 | Node.js + Fastify + Prisma | Database CRUD, data validation | [Docs](../docs/13-Prediction-DB-Service.md) |

### Service Dependencies

```mermaid
graph LR
    AUTH[Auth Service<br/>6401]
    IMG[Image Ingestion<br/>6402]
    LAB[Labware Interface<br/>6403]
    RES[Result API<br/>6404]
    INF[Vision Inference<br/>6405]
    PDB[Prediction DB<br/>6406]
    
    PG[(PostgreSQL)]
    MINIO[(MinIO)]
    REDIS[(Redis)]
    
    INF -->|Store Results| PDB
    INF -->|Store Images| IMG
    RES -->|Query Data| PDB
    LAB -->|Query Results| RES
    
    AUTH --> PG
    IMG --> PG
    IMG --> MINIO
    LAB --> PG
    RES --> PG
    RES --> REDIS
    PDB --> PG
    INF --> PG
```

---

## 🏢 Infrastructure

### Infrastructure Services

| Service | Port(s) | Purpose | UI/Console |
|---------|---------|---------|------------|
| **PostgreSQL** | 5432 | Primary database | pgAdmin (external) |
| **MinIO** | 9000, 9001 | Object storage (S3-compatible) | http://localhost:9001 |
| **Redis** | 6379 | Cache & session storage | redis-cli |
| **Prometheus** | 9090 | Metrics collection | http://localhost:9090 |
| **Grafana** | 3001 | Monitoring dashboards | http://localhost:3001 |

### Database Schemas

```sql
-- Multi-schema architecture
microplates=# \dn

     Name     | Owner
--------------+----------
 auth         | postgres  -- Authentication & users
 microplates  | postgres  -- Core business data
 public       | postgres  -- Utilities & health checks
```

### Object Storage Buckets

```
MinIO Buckets:
├── raw-images/          # Original captured images
├── annotated-images/    # AI-annotated images with bboxes
└── thumbnails/          # Image thumbnails (optional)
```

---

## 🚀 Quick Start

### 1. Prerequisites

```bash
# Check versions
node --version   # Should be 18+
yarn --version   # Should be 1.22+
docker --version # Should be 20+
psql --version   # Should be 17+ (optional, can use Docker)
```

### 2. Setup Environment

```bash
# Copy environment template
cp env.example .env

# Edit .env with your configuration
# Required variables:
# - DATABASE_URL
# - JWT_SECRET
# - JWT_REFRESH_SECRET
# - MINIO credentials
```

### 3. Start Infrastructure

```bash
# Start PostgreSQL, MinIO, Redis
docker-compose -f docker-compose.infra.yml up -d

# Check services are running
docker-compose -f docker-compose.infra.yml ps

# Wait for services to be ready (30 seconds)
sleep 30
```

### 4. Initialize Database

```bash
# Navigate to auth-service
cd ../Backend-Microplate-auth-service

# Install dependencies
yarn install

# Generate Prisma client
yarn prisma generate

# Run migrations
yarn prisma migrate deploy

# Seed initial data (creates admin user)
yarn prisma db seed
```

### 5. Start Application Services

**Option A: Using Docker Compose (Recommended)**

```bash
# Build and start all services
docker-compose -f docker-compose.apps.yml up --build -d

# View logs
docker-compose -f docker-compose.apps.yml logs -f

# Check service health
curl http://localhost:6401/healthz  # Auth
curl http://localhost:6404/healthz  # Result API
curl http://localhost:6406/health   # Prediction DB
```

**Option B: Individual Development Mode**

```bash
# Terminal 1 - Auth Service
cd ../Backend-Microplate-auth-service
yarn install
yarn dev

# Terminal 2 - Result API Service
cd ../Backend-Microplate-result-api-service
yarn install
yarn dev

# Terminal 3 - Prediction DB Service
cd ../Backend-Microplate-prediction-db-service
yarn install
yarn dev

# Terminal 4 - Image Ingestion Service
cd ../Backend-Microplate-image-ingestion-service
yarn install
yarn dev

# Terminal 5 - Labware Interface Service
cd ../Backend-Microplate-labware-interface-service
yarn install
yarn dev

# Terminal 6 - Vision Inference Service (Python)
cd ../Backend-Microplate-vision-inference-service
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python -m app.main
```

### 6. Verify Installation

```bash
# Run health check script
./scripts/health-check.sh

# Or manually check each service
for port in 6401 6402 6403 6404 6406; do
  echo "Checking port $port:"
  curl -s http://localhost:$port/healthz | jq
done
```

---

## 💻 Development

### Development Workflow

```bash
# 1. Create feature branch
git checkout -b feature/my-feature

# 2. Make changes to service
cd ../Backend-Microplate-result-api-service
# ... edit code ...

# 3. Run tests
yarn test

# 4. Run linting
yarn lint

# 5. Build
yarn build

# 6. Commit changes
git add .
git commit -m "feat: add new feature"
git push origin feature/my-feature
```

### Adding a New Service

```bash
# 1. Create service directory
cd ..
mkdir Backend-Microplate-new-service
cd Backend-Microplate-new-service

# 2. Initialize Node.js project
yarn init -y

# 3. Install dependencies
yarn add fastify @fastify/cors @fastify/helmet
yarn add prisma @prisma/client
yarn add -D typescript @types/node tsx nodemon

# 4. Setup Prisma
npx prisma init

# 5. Create service structure
mkdir -p src/{config,controllers,services,routes,middleware,utils}
touch src/app.ts

# 6. Add to docker-compose.apps.yml in Backend-Microplate-infra
```

### Database Migrations

```bash
# Create new migration
cd ../Backend-Microplate-auth-service
yarn prisma migrate dev --name add_user_roles

# Apply migrations to production
yarn prisma migrate deploy

# Reset database (⚠️ DEVELOPMENT ONLY)
yarn prisma migrate reset

# View migration status
yarn prisma migrate status

# Open Prisma Studio (GUI)
yarn prisma studio
```

### Working with Shared Libraries

```bash
# Install shared package
cd ../Backend-Microplate-result-api-service
yarn add file:../Backend-Microplate-shared-lib

# Use shared middleware
import { authenticateRequest } from '@microplate/shared';

fastify.addHook('preHandler', authenticateRequest);
```

---

## 🗄️ Database Management

### Accessing PostgreSQL

```bash
# Using Docker
docker exec -it microplate-postgres psql -U postgres -d microplates

# Using local psql
psql -h localhost -U postgres -d microplates

# Common queries
\l                              # List databases
\dn                             # List schemas
\dt microplates.*              # List tables in schema
\d microplates.prediction_run  # Describe table
```

### Backup & Restore

```bash
# Backup database
docker exec microplate-postgres pg_dump -U postgres microplates > backup.sql

# Backup with timestamp
docker exec microplate-postgres pg_dump -U postgres microplates > \
  backup_$(date +%Y%m%d_%H%M%S).sql

# Restore database
docker exec -i microplate-postgres psql -U postgres microplates < backup.sql

# Backup to S3 (production)
pg_dump -U postgres microplates | gzip | \
  aws s3 cp - s3://backups/microplate_$(date +%Y%m%d).sql.gz
```

### Database Maintenance

```sql
-- Vacuum and analyze
VACUUM ANALYZE;

-- Check database size
SELECT pg_size_pretty(pg_database_size('microplates'));

-- Check table sizes
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname IN ('auth', 'microplates')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check slow queries
SELECT query, mean_time, calls
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

---

## 📖 API Documentation

### OpenAPI/Swagger

Each service exposes interactive API documentation:

- Auth Service: http://localhost:6401/docs
- Image Ingestion: http://localhost:6402/docs
- Result API: http://localhost:6404/docs
- Prediction DB: http://localhost:6406/docs

### API Testing

**Using cURL:**

```bash
# Login
curl -X POST http://localhost:6401/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin@example.com","password":"admin123"}'

# Save token
export TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Get sample summary
curl http://localhost:6404/api/v1/results/direct/samples \
  -H "Authorization: Bearer $TOKEN"
```

**Using HTTPie:**

```bash
# Login
http POST localhost:6401/api/v1/auth/login \
  username=admin@example.com password=admin123

# Get results
http localhost:6404/api/v1/results/direct/samples \
  Authorization:"Bearer $TOKEN"
```

---

## 🚢 Deployment

### Local Development

```bash
# Start infrastructure
docker-compose -f docker-compose.infra.yml up -d

# Start services (development mode)
docker-compose -f docker-compose.apps.yml up --build
```

### Production Deployment

```bash
# Build production images
docker-compose -f docker-compose.apps.yml build

# Start with production config
docker-compose -f docker-compose.apps.yml up -d

# Scale services
docker-compose -f docker-compose.apps.yml up -d --scale result-api-service=3
```

### Kubernetes Deployment

```bash
# Create namespace
kubectl create namespace microplate-ai

# Deploy infrastructure
kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/redis.yaml
kubectl apply -f k8s/minio.yaml

# Wait for infrastructure
kubectl wait --for=condition=ready pod -l app=postgres -n microplate-ai --timeout=300s

# Deploy services
kubectl apply -f k8s/auth-service.yaml
kubectl apply -f k8s/result-api-service.yaml
kubectl apply -f k8s/prediction-db-service.yaml
# ... other services

# Check deployment
kubectl get pods -n microplate-ai
kubectl get services -n microplate-ai
```

---

## 🔧 Service Details

### Auth Service (Port 6401)

**Technology:** Node.js 18+ | Fastify 4.x | Prisma 5.x | PostgreSQL 17

**Responsibilities:**
- User registration and login
- JWT token management (access + refresh)
- Password reset and email verification
- Role-based access control (RBAC)
- Audit logging

**Key Endpoints:**
```
POST /api/v1/auth/register      # Register new user
POST /api/v1/auth/login         # Login user
POST /api/v1/auth/refresh       # Refresh access token
POST /api/v1/auth/logout        # Logout user
GET  /api/v1/auth/me            # Get current user
```

**Environment Variables:**
```bash
DATABASE_URL="postgresql://postgres:password@postgres:5432/microplates"
JWT_SECRET="your-secret-key"
JWT_REFRESH_SECRET="your-refresh-secret"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
PORT=6401
```

**Running:**
```bash
cd ../Backend-Microplate-auth-service
yarn install
yarn prisma generate
yarn dev
```

---

### Image Ingestion Service (Port 6402)

**Technology:** Node.js 18+ | Fastify 4.x | Prisma 5.x | MinIO/S3

**Responsibilities:**
- Image upload and storage
- Signed URL generation
- Image metadata management
- MinIO/S3 integration
- Thumbnail generation

**Key Endpoints:**
```
POST /api/v1/images                    # Upload image
POST /api/v1/signed-urls               # Generate signed URL
POST /api/v1/signed-urls/batch         # Generate batch signed URLs
GET  /api/v1/images/:id                # Get image metadata
GET  /api/v1/images/by-run/:runId     # Get images by run
```

**Environment Variables:**
```bash
DATABASE_URL="postgresql://postgres:password@postgres:5432/microplates"
OBJECT_STORAGE_ENDPOINT="http://minio:9000"
OBJECT_STORAGE_EXTERNAL_ENDPOINT="http://localhost:9000"
OBJECT_STORAGE_ACCESS_KEY="minioadmin"
OBJECT_STORAGE_SECRET_KEY="minioadmin123"
PORT=6402
```

**Running:**
```bash
cd ../Backend-Microplate-image-ingestion-service
yarn install
yarn dev
```

---

### Result API Service (Port 6404)

**Technology:** Node.js 18+ | Fastify 4.x | Prisma 5.x | WebSocket

**Responsibilities:**
- Sample data aggregation
- Real-time WebSocket updates
- Query APIs for frontend
- Background data processing
- Statistics and analytics

**Key Endpoints:**
```
GET  /api/v1/results/direct/samples           # Get all samples
GET  /api/v1/results/direct/samples/:id/runs  # Get sample runs
DELETE /api/v1/results/direct/runs/:runId     # Delete run & recalc
WS   /api/v1/results/ws                       # WebSocket connection
```

**Environment Variables:**
```bash
DATABASE_URL="postgresql://postgres:password@postgres:5432/microplates"
REDIS_URL="redis://redis:6379"
PREDICTION_DB_SERVICE_URL="http://prediction-db-service:6406"
PORT=6404
```

**Running:**
```bash
cd ../Backend-Microplate-result-api-service
yarn install
yarn dev
```

---

### Prediction DB Service (Port 6406)

**Technology:** Node.js 18+ | Fastify 4.x | Prisma 5.x

**Responsibilities:**
- Database CRUD operations for predictions
- Data validation and integrity
- Schema management
- Migration handling

**Key Endpoints:**
```
POST /api/v1/predictions           # Create prediction run
GET  /api/v1/predictions/:id       # Get prediction by ID
PUT  /api/v1/predictions/:id       # Update prediction
DELETE /api/v1/predictions/:id     # Delete prediction
POST /api/v1/predictions/:id/wells # Create well predictions
```

**Environment Variables:**
```bash
DATABASE_URL="postgresql://postgres:password@postgres:5432/microplates"
REDIS_URL="redis://redis:6379"
PORT=6406
```

**Running:**
```bash
cd ../Backend-Microplate-prediction-db-service
yarn install
yarn prisma generate
yarn dev
```

---

### Vision Inference Service (Port 6405)

**Technology:** Python 3.11+ | FastAPI | PyTorch | OpenCV

**Responsibilities:**
- AI model inference
- YOLO object detection
- Image analysis and prediction
- Bounding box generation
- Domain-specific logic calculation

**Key Endpoints:**
```
POST /api/v1/inference/predict    # Run inference on image
GET  /api/v1/inference/models     # Get available models
GET  /api/v1/inference/health     # Health check
```

**Environment Variables:**
```bash
DATABASE_URL="postgresql://postgres:password@postgres:5432/microplates"
MODEL_PATH="/app/models"
DEFAULT_MODEL_VERSION="v1.2.0"
CONFIDENCE_THRESHOLD=0.5
PORT=6405
```

**Running:**
```bash
cd ../Backend-Microplate-vision-inference-service
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python -m app.main
```

---

### Labware Interface Service (Port 6403)

**Technology:** Node.js 18+ | Fastify 4.x | Prisma 5.x

**Responsibilities:**
- CSV file generation
- Data formatting for labware systems
- File delivery to shared folders
- Template management

**Key Endpoints:**
```
POST /api/v1/interface/generate        # Generate CSV
GET  /api/v1/interface/files/:id       # Get file info
GET  /api/v1/interface/files/:id/download # Download CSV
GET  /api/v1/interface/templates       # Get templates
```

**Environment Variables:**
```bash
DATABASE_URL="postgresql://postgres:password@postgres:5432/microplates"
OUTPUT_DIRECTORY="/app/generated"
DEFAULT_DELIVERY_METHOD="folder"
PORT=6403
```

**Running:**
```bash
cd ../Backend-Microplate-labware-interface-service
yarn install
yarn dev
```

---

## 🧪 Testing

### Run All Tests

```bash
# Backend unit tests
yarn test:backend

# Service integration tests
yarn test:integration

# API contract tests
yarn test:contracts

# Load tests
yarn test:load
```

### Service-Specific Tests

```bash
# Test individual service
cd services/result-api-service
yarn test

# Watch mode
yarn test:watch

# Coverage report
yarn test:coverage
```

---

## 🐛 Troubleshooting

### Common Issues

#### Port Already in Use

```bash
# Find process using port
lsof -i :6404

# Kill process
kill -9 PID

# Or use different port
PORT=6405 yarn dev
```

#### Database Connection Failed

```bash
# Check PostgreSQL is running
docker-compose -f docker-compose.infra.yml ps postgres

# Check logs
docker-compose -f docker-compose.infra.yml logs postgres

# Test connection
psql "postgresql://postgres:password@localhost:5432/microplates"

# Restart PostgreSQL
docker-compose -f docker-compose.infra.yml restart postgres
```

#### MinIO Connection Failed

```bash
# Check MinIO is running
docker-compose -f docker-compose.infra.yml ps minio

# Access MinIO console
open http://localhost:9001

# Check buckets exist
mc ls local/

# Create missing buckets
mc mb local/raw-images
mc mb local/annotated-images
```

#### Service Won't Start

```bash
# Check logs
docker-compose -f docker-compose.apps.yml logs -f service-name

# Rebuild service
docker-compose -f docker-compose.apps.yml build service-name
docker-compose -f docker-compose.apps.yml up -d service-name

# Check dependencies
docker-compose -f docker-compose.infra.yml ps
```

For more troubleshooting, see [Troubleshooting Guide](../docs/16-Troubleshooting-Guide.md).

---

## 📊 Monitoring

### Prometheus Metrics

Access Prometheus: http://localhost:9090

**Key Metrics:**
- `http_requests_total` - Total HTTP requests
- `http_request_duration_seconds` - Request duration
- `database_connections_active` - Active DB connections
- `redis_cache_hit_rate` - Cache hit rate

### Grafana Dashboards

Access Grafana: http://localhost:3001

**Default credentials:** `admin` / `admin`

**Dashboards:**
- Microplate System Overview
- Service Health Dashboard
- Database Performance
- API Request Analytics

### Logs

```bash
# View all service logs
docker-compose -f docker-compose.apps.yml logs -f

# View specific service
docker-compose -f docker-compose.apps.yml logs -f result-api-service

# Filter logs
docker-compose -f docker-compose.apps.yml logs -f | grep ERROR

# Export logs
docker-compose -f docker-compose.apps.yml logs > logs.txt
```

---

## 🔐 Security

### Secret Generation

```bash
# Generate strong secrets
export JWT_SECRET=$(openssl rand -base64 32)
export JWT_REFRESH_SECRET=$(openssl rand -base64 32)
export DATABASE_PASSWORD=$(openssl rand -base64 32)
export MINIO_SECRET_KEY=$(openssl rand -base64 32)

# Save to .env
echo "JWT_SECRET=$JWT_SECRET" >> .env
echo "JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET" >> .env
```

### Security Scanning

```bash
# Scan dependencies for vulnerabilities
cd ../Backend-Microplate-result-api-service
yarn audit

# Fix vulnerabilities
yarn audit fix

# Scan Docker images
docker scan microplate/result-api-service:latest

# Use Trivy
trivy image microplate/result-api-service:latest
```

See [Security Best Practices](../docs/18-Security-Best-Practices.md) for comprehensive security guidelines.

---

## 📝 Environment Variables

### Shared Variables (All Services)

```bash
# Node Environment
NODE_ENV=development              # development | production
LOG_LEVEL=info                    # debug | info | warn | error
PORT=6404                         # Service port

# Database
DATABASE_URL="postgresql://postgres:password@postgres:5432/microplates"

# JWT Authentication
JWT_SECRET="your-secret-key"
JWT_REFRESH_SECRET="your-refresh-secret"
JWT_ALGORITHM="HS256"
JWT_ISSUER="microplate-auth"
JWT_AUDIENCE="microplate-services"

# Redis
REDIS_URL="redis://redis:6379"
REDIS_PASSWORD=""                 # Optional

# CORS
CORS_ORIGIN="http://localhost:6410,http://localhost:3000"
CORS_CREDENTIALS=true
```

### Service-Specific Variables

**Image Ingestion Service:**
```bash
OBJECT_STORAGE_ENDPOINT="http://minio:9000"
OBJECT_STORAGE_EXTERNAL_ENDPOINT="http://localhost:9000"
OBJECT_STORAGE_ACCESS_KEY="minioadmin"
OBJECT_STORAGE_SECRET_KEY="minioadmin123"
OBJECT_STORAGE_BUCKET_RAW="raw-images"
OBJECT_STORAGE_BUCKET_ANNOTATED="annotated-images"
```

**Result API Service:**
```bash
PREDICTION_DB_SERVICE_URL="http://prediction-db-service:6406"
IMAGE_SERVICE_URL="http://image-ingestion-service:6402"
WEBSOCKET_PATH="/api/v1/results/ws"
```

**Vision Inference Service:**
```bash
MODEL_PATH="/app/models"
DEFAULT_MODEL_VERSION="v1.2.0"
CONFIDENCE_THRESHOLD=0.5
ENABLE_GPU=true
```

---

## 🤝 Contributing

### Development Standards

- **Code Style**: ESLint + Prettier for TypeScript/JavaScript, Black for Python
- **Commits**: Conventional Commits (feat, fix, docs, etc.)
- **Branching**: GitFlow (main, develop, feature/*, hotfix/*)
- **Testing**: Write tests for all new features
- **Documentation**: Update API docs and README

### Commit Message Format

```bash
# Feature
git commit -m "feat(auth): add password reset functionality"

# Bug fix
git commit -m "fix(results): correct sample summary aggregation"

# Documentation
git commit -m "docs(api): update endpoint documentation"

# Refactoring
git commit -m "refactor(inference): optimize image preprocessing"
```

### Pull Request Process

1. Create feature branch from `develop`
2. Make changes and write tests
3. Ensure all tests pass
4. Update documentation
5. Submit PR to `develop`
6. Address review comments
7. Merge after approval

---

## 📦 Available Scripts

### Infrastructure

```bash
# Start infrastructure only
yarn infra:up

# Stop infrastructure
yarn infra:down

# Reset infrastructure (⚠️ Deletes data!)
yarn infra:reset
```

### Services

```bash
# Start all services
yarn services:up

# Stop all services
yarn services:down

# Rebuild services
yarn services:rebuild

# View logs
yarn services:logs
```

### Database

```bash
# Run migrations
yarn db:migrate

# Seed database
yarn db:seed

# Reset database (⚠️ Development only!)
yarn db:reset

# Open Prisma Studio
yarn db:studio
```

### Testing

```bash
# Run all tests
yarn test

# Unit tests only
yarn test:unit

# Integration tests
yarn test:integration

# E2E tests
yarn test:e2e

# Coverage report
yarn test:coverage
```

---

## 📚 Additional Resources

### Documentation
- [Complete Documentation](../docs/)
- [Architecture Overview](../docs/01-Architecture-Overview.md)
- [Implementation Guide](../docs/11-Implementation-Guide.md)
- [Deployment Guide](../docs/12-Deployment-Guide.md)
- [API Reference](../docs/15-API-Reference.md)
- [Troubleshooting](../docs/16-Troubleshooting-Guide.md)

### External Links
- [Fastify Documentation](https://www.fastify.io)
- [Prisma Documentation](https://www.prisma.io/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs)
- [MinIO Documentation](https://min.io/docs)

---

## 🔍 Service Health Status

Check real-time service status:

```bash
#!/bin/bash
# scripts/check-health.sh

echo "🔍 Checking service health..."
echo "================================"

services=(
  "Auth:6401:/healthz"
  "Image:6402:/healthz"
  "Labware:6403:/healthz"
  "Results:6404:/api/v1/results/health"
  "Inference:6405:/api/v1/inference/health"
  "PredictionDB:6406:/health"
)

for service in "${services[@]}"; do
  IFS=':' read -r name port path <<< "$service"
  
  status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$port$path 2>/dev/null)
  
  if [ "$status" = "200" ]; then
    echo "✅ $name (port $port): Healthy"
  else
    echo "❌ $name (port $port): Unhealthy (HTTP $status)"
  fi
done

echo "================================"
```

---

## 📞 Support

### Getting Help

- 📖 Check [Documentation](../docs/)
- 🐛 Search [Issues](https://github.com/your-org/microplate-ai/issues)
- 💬 Ask in [Discussions](https://github.com/your-org/microplate-ai/discussions)
- 📧 Email: dev@microplate-ai.com

### Reporting Issues

When reporting issues, please include:
- Service name and version
- Error messages and stack traces
- Steps to reproduce
- Environment details (OS, Docker version, etc.)
- Relevant logs

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.

---

## 🙏 Acknowledgments

Built with these amazing technologies:
- [Node.js](https://nodejs.org) - JavaScript runtime
- [Fastify](https://fastify.io) - Fast web framework
- [Prisma](https://prisma.io) - Next-generation ORM
- [PostgreSQL](https://postgresql.org) - Advanced database
- [MinIO](https://min.io) - High-performance object storage
- [Docker](https://docker.com) - Containerization platform

---

<div align="center">

**Microplate Backend Services** - Part of the Microplate AI System

[Documentation](../docs/) • [Frontend](../microplate-fe/) • [Device Services](../microplate-device/)

</div>
