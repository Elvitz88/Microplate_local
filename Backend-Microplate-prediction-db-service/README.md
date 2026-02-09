# Prediction Database Service

Database service for managing prediction data using Prisma ORM and Fastify.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 17+
- Redis 6+

### Installation

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Start development server
npm run dev
```

### Environment Setup

```bash
# Copy environment file
cp env.example .env

# Edit environment variables
nano .env
```

## 📋 Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:deploy` - Deploy migrations to production
- `npm run db:reset` - Reset database and run migrations (no seed)
- `npm run db:studio` - Open Prisma Studio
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## 🏗️ Architecture

### Database Schema
- **prediction_result**: Main schema for prediction data
- **public**: Utility schema for health checks

### API Endpoints

#### Health Check
- `GET /api/v1/health` - Service health status
- `GET /api/v1/health/detailed` - Detailed health including DB/Redis
- `GET /api/v1/health/ready` - Readiness probe
- `GET /api/v1/health/live` - Liveness probe

#### Predictions
- `GET /api/v1/predictions/:id` - Get prediction by ID
- `GET /api/v1/predictions` - List predictions with filters
- `DELETE /api/v1/predictions/:id` - Delete prediction

#### Database Management
- `GET /api/v1/database/status` - Database status
- `GET /api/v1/database/stats/predictions` - Prediction stats
- `GET /api/v1/database/stats/samples` - Sample stats
- `GET /api/v1/database/tables/:schema` - Table info by schema

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | - |
| `PORT` | Server port | 6406 |
| `REDIS_LOG_CHANNEL` | Redis PubSub log channel | microplate:prediction-db:logs |
| `REDIS_ERROR_CHANNEL` | Redis PubSub error channel | microplate:prediction-db:errors |
| `LOG_LEVEL` | Logging level | info |

### Database Connection

```typescript
// Example connection string
DATABASE_URL="postgresql://postgres:password@localhost:5432/microplates"
```

## 🐳 Docker

### Build Image
```bash
docker build -t prediction-db-service .
```

### Run Container
```bash
docker run -p 6404:6404 \
  -e DATABASE_URL="postgresql://postgres:password@host.docker.internal:5432/microplates" \
  prediction-db-service
```

### Docker Compose
```yaml
version: '3.8'
services:
  prediction-db-service:
    build: .
    ports:
      - "6404:6404"
    environment:
      - DATABASE_URL=postgresql://postgres:password@postgres:5432/microplates
    depends_on:
      - postgres
```

## 📊 Database Schema

### PredictionRun
- Main prediction run record
- Contains metadata and status
- Links to all related data

### WellPrediction
- Individual well predictions
- Contains class, confidence, bbox
- Linked to PredictionRun

### ImageFile (optional)
- If used: metadata of image artifacts; else managed by image-ingesion-service

### RowCounts
- Row-level statistics
- Positive/negative counts
- Last positions

### InferenceResult
- Complete analysis results (table name `interface_results`)
- Distribution data
- Business logic results

## 🔍 Monitoring

### Health Checks
- Readiness: `GET /api/v1/health/ready`
- Liveness: `GET /api/v1/health/live`
- Detailed: `GET /api/v1/health/detailed`

### Logging
- Structured JSON logging
- Request/response logging
- Error tracking
- Performance metrics

## 🚨 Error Handling

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `404` - Not Found
- `500` - Internal Server Error

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": {}
  }
}
```

## 🔐 Security

### Authentication
- JWT token validation
- Role-based access control
- API key authentication

### Rate Limiting
- Request rate limiting
- IP-based throttling
- Configurable limits

### CORS
- Configurable origins
- Credential support
- Preflight handling

## 📈 Performance

### Database Optimization
- Connection pooling
- Query optimization
- Index optimization
- Caching strategies

### API Performance
- Response compression
- Request validation
- Error handling
- Logging optimization

## 🧪 Testing

### Unit Tests
```bash
npm test
```

### Integration Tests
```bash
npm run test:integration
```

### E2E Tests
```bash
npm run test:e2e
```

## 📝 API Documentation

### OpenAPI Specification
- Available at `/docs` endpoint
- Interactive API explorer
- Request/response examples

### Postman Collection
- Import collection from `/postman` endpoint
- Pre-configured requests
- Environment variables

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Add tests
5. Submit pull request

## 📄 License

MIT License - see LICENSE file for details
