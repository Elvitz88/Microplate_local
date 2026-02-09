# Result API Service

The Result API Service provides data aggregation, querying, and real-time updates for the Microplate AI System. It handles sample summaries, prediction history, and provides WebSocket connections for real-time data updates.

## Features

- **Sample Management**: Query and manage sample data with pagination and filtering
- **Run Details**: Get detailed information about prediction runs
- **Real-time Updates**: WebSocket support for live data updates
- **Statistics**: System-wide analytics and performance metrics
- **Caching**: Redis-based caching for improved performance
- **Aggregation**: Background worker for data consistency and aggregation

## Technology Stack

- **Runtime**: Node.js 20+
- **Framework**: Express 4.x
- **Language**: TypeScript
- **ORM**: Prisma 5.x
- **Database**: PostgreSQL 17
- **Cache**: Redis
- **WebSocket**: ws
- **Validation**: Zod
- **Documentation**: OpenAPI 3.0

## API Endpoints

### Sample Management

- `GET /api/v1/results/samples` - List samples with pagination and filtering
- `GET /api/v1/results/samples/:sampleNo` - Get detailed sample information
- `GET /api/v1/results/samples/:sampleNo/summary` - Get sample summary
- `GET /api/v1/results/samples/:sampleNo/runs` - Get all runs for a sample
- `GET /api/v1/results/samples/:sampleNo/last` - Get most recent run
- `GET /api/v1/results/samples/:sampleNo/trends` - Get trend analysis

### Run Management

- `GET /api/v1/results/runs/:runId` - Get detailed run information

### Direct Database Access (Optimized)

- `GET /api/v1/results/direct/samples` - Get all samples directly from database
- `GET /api/v1/results/direct/samples/:sampleNo/summary` - Get sample summary directly
- `GET /api/v1/results/direct/samples/:sampleNo/runs` - Get sample runs with full inference results
- `GET /api/v1/results/direct/runs/:runId` - Get run details directly
- `DELETE /api/v1/results/direct/runs/:runId` - **Delete run and auto-recalculate sample summary**

### Statistics

- `GET /api/v1/results/statistics/overview` - Get system-wide statistics

### WebSocket

- `WebSocket /api/v1/results/ws` - Real-time updates (no auth)
- `WebSocket /api/v1/results/ws/auth` - Authenticated real-time updates

### Health & Monitoring

- `GET /api/v1/results/health` - Health check
- `GET /api/v1/results/ready` - Readiness check
- `GET /api/v1/results/metrics` - Service metrics

## Environment Variables

```bash
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/microplates"

# Application
NODE_ENV="development"
PORT=6404
API_BASE_URL="http://localhost:6400"

# WebSocket
WEBSOCKET_PATH="/api/v1/results/ws"
WEBSOCKET_PING_INTERVAL=30000
WEBSOCKET_PONG_TIMEOUT=5000

# Caching & Redis
REDIS_LOG_CHANNEL="microplate:result-api:logs"
REDIS_ERROR_CHANNEL="microplate:result-api:errors"
CACHE_TTL=300
CACHE_PREFIX="result-api"

# Pagination
DEFAULT_PAGE_SIZE=20
MAX_PAGE_SIZE=100

# Real-time Updates
ENABLE_WEBSOCKET=true
ENABLE_DATABASE_NOTIFICATIONS=true

# Logging
LOG_LEVEL="info"
LOG_FORMAT="pretty"

# External Services
PREDICTION_DB_SERVICE_URL="http://prediction-db-service:6403"
IMAGE_SERVICE_URL="http://image-ingestion-service:6402"

# Gateway Integration
# JWT, CORS, Rate Limiting are managed by the API Gateway service
```

## Development Setup

### Prerequisites

- Node.js 20+
- Yarn 1.22+
- PostgreSQL 17
- Redis (optional, for caching)

### Installation

1. **Clone and navigate to the service directory**
   ```bash
   cd microplate-be/services/result-api-service
   ```

2. **Install dependencies**
   ```bash
   yarn install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

4. **Generate Prisma client**
   ```bash
   yarn prisma:generate
   ```

5. **Run database migrations**
   ```bash
   yarn prisma:migrate
   ```

6. **Start the development server**
   ```bash
   yarn dev
   ```

### Development Commands

```bash
# Start development server with hot reload
yarn dev

# Build the application
yarn build

# Start production server
yarn start

# Run tests
yarn test

# Run tests in watch mode
yarn test:watch

# Run tests with coverage
yarn test:coverage

# Lint code
yarn lint

# Fix linting issues
yarn lint:fix

# Format code
yarn format

# Type checking
yarn type-check

# Database operations
yarn prisma:generate    # Generate Prisma client
yarn prisma:migrate     # Run database migrations
yarn prisma:studio      # Open Prisma Studio
yarn prisma:deploy      # Deploy migrations to production

# Worker commands
yarn worker:dev         # Start aggregation worker in development
yarn worker:start       # Start aggregation worker in production
```

## Docker Deployment

### Build Image

```bash
docker build -t result-api-service .
```

### Run Container

```bash
docker run -d \
  --name result-api-service \
  -p 6404:6404 \
  -e DATABASE_URL="postgresql://postgres:password@host.docker.internal:5432/microplates" \
  result-api-service
```

### Docker Compose

```yaml
version: '3.8'
services:
  result-api-service:
    build: .
    ports:
      - "6404:6404"
    environment:
      - DATABASE_URL=postgresql://postgres:password@postgres:5432/microplates
      - NODE_ENV=production
    depends_on:
      - postgres
    restart: unless-stopped
```

## API Documentation

Once the service is running, you can access the interactive API documentation at:

- **Development**: http://localhost:6404/docs
- **Production**: https://api.microplate.ai/docs

## WebSocket Usage

### Connection

```javascript
// Basic connection (no auth)
const ws = new WebSocket('ws://localhost:6404/api/v1/results/ws');

// Authenticated connection
const ws = new WebSocket('ws://localhost:6404/api/v1/results/ws/auth', {
  headers: {
    'Authorization': 'Bearer your-jwt-token'
  }
});
```

### Subscription Messages

```javascript
// Subscribe to sample updates
ws.send(JSON.stringify({
  type: 'subscribe',
  channel: 'sample',
  sampleNo: 'S123456'
}));

// Subscribe to run updates
ws.send(JSON.stringify({
  type: 'subscribe',
  channel: 'run',
  runId: 123
}));

// Unsubscribe
ws.send(JSON.stringify({
  type: 'unsubscribe',
  channel: 'sample',
  sampleNo: 'S123456'
}));
```

### Server Messages

```javascript
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  switch (message.type) {
    case 'sample_updated':
      console.log('Sample updated:', message.data);
      break;
    case 'run_completed':
      console.log('Run completed:', message.data);
      break;
    case 'system_stats_updated':
      console.log('System stats updated:', message.data);
      break;
  }
};
```

## Background Worker

The aggregation worker handles background processing for data consistency and real-time updates.

### Start Worker

```bash
# Development
yarn worker:dev

# Production
yarn worker:start
```

### Worker Features

- **Database Notifications**: Listens for new interface results and updates sample summaries
- **Consistency Checks**: Periodically validates sample summary consistency
- **Cleanup Tasks**: Removes old health check records and temporary data
- **Statistics Updates**: Updates system-wide statistics

## Monitoring

### Health Checks

- **Health**: `GET /api/v1/results/health` - Basic health status
- **Readiness**: `GET /api/v1/results/ready` - Service readiness check
- **Metrics**: `GET /api/v1/results/metrics` - Performance metrics

### Logging

The service uses structured JSON logging with the following levels:

- `error`: Error conditions
- `warn`: Warning conditions
- `info`: Informational messages
- `debug`: Debug-level messages

### Metrics

Key metrics tracked:

- Request rates and response times
- Cache hit/miss rates
- WebSocket connection count
- Database query performance
- Error rates by endpoint

## Gateway Integration

This service is designed to work with the API Gateway service which handles:

### Authentication & Authorization
- JWT token verification and validation
- User information extraction and header injection
- Role-based access control (admin, operator, viewer)
- Permission-based restrictions

### Security & Rate Limiting
- CORS policy enforcement
- Rate limiting per endpoint and user
- Request/response security headers
- IP-based access control

### Request Processing
- Request routing and load balancing
- Request/response logging and monitoring
- Error handling and transformation

The service expects the following headers from the gateway:
- `X-User-Id`: Authenticated user ID
- `X-User-Email`: User email address
- `X-Username`: Username
- `X-Roles`: Comma-separated list of user roles
- `X-Request-ID`: Unique request identifier

## Performance

### Caching Strategy

- Redis cache for frequently accessed data
- TTL-based cache expiration
- Cache invalidation on data updates
- Cache warming for popular samples

### Database Optimization

- Proper indexing for query performance
- Connection pooling
- Query optimization
- Read replicas for heavy queries

### Real-time Updates

- Efficient WebSocket message broadcasting
- Connection pooling and management
- Message queuing for high throughput
- Graceful connection handling

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check DATABASE_URL configuration
   - Verify PostgreSQL is running and accessible
   - Check network connectivity

2. **Redis Connection Failed**
   - Verify Redis is running
   - Service will continue without cache

3. **WebSocket Connection Issues**
   - Check ENABLE_WEBSOCKET configuration
   - Verify WebSocket support in client
   - Check firewall/proxy settings

4. **High Memory Usage**
   - Check for memory leaks in long-running connections
   - Monitor WebSocket connection count
   - Review cache size and TTL settings

### Debug Mode

Enable debug logging:

```bash
LOG_LEVEL=debug yarn dev
```

### Database Queries

Monitor database queries:

```bash
# Enable query logging in development
NODE_ENV=development yarn dev
```

## Contributing

1. Follow the existing code style and patterns
2. Add tests for new features
3. Update documentation for API changes
4. Ensure all linting and type checking passes
5. Test WebSocket functionality thoroughly

## License

This project is licensed under the MIT License.
