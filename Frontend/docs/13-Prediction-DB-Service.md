# Prediction Database Service

## Overview

The Prediction Database Service is a dedicated Node.js microservice responsible for managing all prediction-related data operations. It provides a clean separation between AI inference logic and database operations, following microservices best practices.

## Technology Stack

- **Runtime**: Node.js 18+
- **Framework**: Fastify 4.x
- **ORM**: Prisma 5.x
- **Database**: PostgreSQL 17
- **Language**: TypeScript
- **Authentication**: JWT
- **Logging**: Pino
- **Validation**: Zod

## Architecture

### Service Responsibilities

1. **Database Operations**
   - Store prediction runs and results
   - Manage well predictions and image files
   - Handle row counts and interface results
   - Maintain data integrity and relationships

2. **API Management**
   - Provide CRUD APIs for prediction data
   - Handle data validation and sanitization
   - Manage API rate limiting and security

3. **Schema Management**
   - Database migrations and schema updates
   - Prisma client generation and maintenance
   - Data seeding and initialization

### Database Schema

The service manages the `prediction_result` schema with the following models:

#### Core Models

- **PredictionRun**: Main prediction run record
- **WellPrediction**: Individual well predictions
- **ImageFile**: Image file metadata
- **RowCounts**: Row-level statistics
- **InterfaceResults**: Complete analysis results
- **SampleSummary**: Aggregated sample data
- **InterfaceFile**: Generated interface files
- **SystemConfig**: System configuration

#### Utility Models

- **HealthCheck**: Service health monitoring

## API Endpoints

### Health Check

#### GET /health
Returns service health status.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-01T00:00:00Z",
    "services": {
      "database": {
        "status": "healthy",
        "connected": true
      },
      "redis": {
        "status": "healthy",
        "connected": true
      }
    }
  }
}
```

#### GET /health/db
Returns database connectivity status.

#### GET /health/redis
Returns Redis connectivity status.

### Predictions

#### POST /api/v1/predictions
Create a new prediction run.

**Request Body:**
```json
{
  "sampleNo": "SAMPLE001",
  "submissionNo": "SUB001",
  "description": "Test prediction",
  "rawImagePath": "/path/to/image.jpg",
  "modelVersion": "v1.2.0",
  "status": "pending",
  "confidenceThreshold": 0.5
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "sampleNo": "SAMPLE001",
    "submissionNo": "SUB001",
    "description": "Test prediction",
    "rawImagePath": "/path/to/image.jpg",
    "modelVersion": "v1.2.0",
    "status": "pending",
    "confidenceThreshold": 0.5,
    "predictAt": "2024-01-01T00:00:00Z",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

#### GET /api/v1/predictions/:id
Get prediction run by ID.

#### GET /api/v1/predictions
List predictions with filters.

**Query Parameters:**
- `sampleNo`: Filter by sample number
- `status`: Filter by status
- `limit`: Number of results (default: 20)
- `offset`: Pagination offset (default: 0)

#### PUT /api/v1/predictions/:id
Update prediction run.

#### DELETE /api/v1/predictions/:id
Delete prediction run.

### Well Predictions

#### POST /api/v1/predictions/:id/wells
Create well predictions for a run.

**Request Body:**
```json
{
  "predictions": [
    {
      "wellId": "A1",
      "label": "A1",
      "class": "positive",
      "confidence": 0.95,
      "bbox": {
        "xmin": 10,
        "ymin": 20,
        "xmax": 30,
        "ymax": 40
      }
    }
  ]
}
```

### Image Files

#### POST /api/v1/predictions/:id/images
Create image file record.

**Request Body:**
```json
{
  "sampleNo": "SAMPLE001",
  "fileType": "raw",
  "fileName": "image.jpg",
  "filePath": "/path/to/image.jpg",
  "fileSize": 1024000,
  "mimeType": "image/jpeg",
  "width": 1920,
  "height": 1080
}
```

### Row Counts

#### POST /api/v1/predictions/:id/counts
Create row counts record.

**Request Body:**
```json
{
  "counts": {
    "raw_count": {
      "A": 8,
      "B": 7,
      "C": 9
    },
    "last_positions": {
      "A": 8,
      "B": 7,
      "C": 9
    }
  }
}
```

### Interface Results

#### POST /api/v1/predictions/:id/results
Create interface results record.

**Request Body:**
```json
{
  "results": {
    "distribution": {
      "positive": 37,
      "negative": 59,
      "invalid": 0
    }
  }
}
```

### Database Management

#### GET /api/v1/db/status
Get database status and statistics.

#### GET /api/v1/db/stats
Get detailed database statistics.

#### POST /api/v1/db/migrate
Run database migrations.

#### POST /api/v1/db/seed
Seed database with initial data.

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | - |
| `REDIS_HOST` | Redis host | localhost |
| `REDIS_PORT` | Redis port | 6379 |
| `REDIS_PASSWORD` | Redis password | - |
| `REDIS_DB` | Redis database number | 0 |
| `PORT` | Server port | 6404 |
| `NODE_ENV` | Environment | development |
| `JWT_SECRET` | JWT secret key | - |
| `JWT_EXPIRES_IN` | JWT expiration time | 24h |
| `LOG_LEVEL` | Logging level | info |
| `LOG_FORMAT` | Log format (json/text) | json |
| `GATEWAY_HOST` | Base URL of API gateway | https://api.example.com |
| `RATE_LIMIT_MAX` | Rate limit max requests | 100 |
| `RATE_LIMIT_TIME_WINDOW` | Rate limit time window (ms) | 60000 |

### Database Connection

```typescript
// Example connection string
DATABASE_URL="postgresql://postgres:password@localhost:5432/microplates"
```

## Development

### Prerequisites

- Node.js 18+
- PostgreSQL 17+
- Redis 6+

### Setup

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Seed initial data
npm run db:seed

# Start development server
npm run dev
```

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:deploy` - Deploy migrations to production
- `npm run db:seed` - Seed database with initial data
- `npm run db:reset` - Reset database and run migrations
- `npm run db:studio` - Open Prisma Studio
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## Docker

### Build Image

```bash
docker build -t prediction-db-service .
```

### Run Container

```bash
docker run -p 6404:6404 \
  -e DATABASE_URL="postgresql://postgres:password@host.docker.internal:5432/microplates" \
  -e REDIS_HOST=host.docker.internal \
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
      - REDIS_HOST=redis
    depends_on:
      - postgres
      - redis
```

## Security

### Authentication

- JWT token validation
- Role-based access control
- API key authentication

### Rate Limiting

- Request rate limiting
- IP-based throttling
- Configurable limits

### CORS

- Managed centrally by API gateway (service assumes trusted requests)

## Monitoring

### Health Checks

- Service health: `GET /health`
- Database health: `GET /health/db`
- Redis health: `GET /health/redis`

### Logging

- Structured JSON logging
- Request/response logging
- Error tracking
- Performance metrics

### Metrics

- Request count and duration
- Database query performance
- Error rates and types
- Memory and CPU usage

## Error Handling

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

## Performance

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

## Testing

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

## API Documentation

### OpenAPI Specification

- Available at `/docs` endpoint
- Interactive API explorer
- Request/response examples

### Postman Collection

- Import collection from `/postman` endpoint
- Pre-configured requests
- Environment variables

## Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Add tests
5. Submit pull request

## License

MIT License - see LICENSE file for details
