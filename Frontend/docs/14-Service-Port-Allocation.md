# Service Port Allocation & Configuration

## Overview

This document outlines the port allocation and configuration for all microservices in the Microplate AI System. The ports are carefully allocated to avoid conflicts and provide clear service identification.

## Port Allocation

| Service | Port | Protocol | Description |
|---------|------|----------|-------------|
| **Auth Service** | 6401 | HTTP | User authentication and authorization |
| **Image Ingestion Service** | 6402 | HTTP | Image storage and management |
| **Vision Inference Service** | 6403 | HTTP | AI model inference and analysis |
| **Result API Service** | 6404 | HTTP/WebSocket | Data aggregation and real-time updates |
| **Labware Interface Service** | 6405 | HTTP | CSV generation and delivery |
| **Prediction DB Service** | 6406 | HTTP | Database operations for prediction data |
| **Vision Capture Service** | 6407 | HTTP/WebSocket | Camera capture and real-time status |

## Service Configuration

### Auth Service (Port 6401)
```yaml
# docker-compose.apps.yml
auth-service:
  ports:
    - "6401:6401"
  environment:
    - PORT=6401
```

**Responsibilities:**
- User registration and login
- JWT token management
- Password reset and email verification
- Role-based access control

### Image Ingestion Service (Port 6402)
```yaml
# docker-compose.apps.yml
image-ingestion-service:
  ports:
    - "6402:6402"
  environment:
    - PORT=6402
```

**Responsibilities:**
- Image upload and storage
- Signed URL generation
- Image metadata management
- Integration with object storage

### Labware Interface Service (Port 6403)
```yaml
# docker-compose.apps.yml
labware-interface:
  ports:
    - "6403:6403"
  environment:
    - PORT=6403
```

**Responsibilities:**
- CSV file generation
- File delivery to external systems
- Template management
- File storage and cleanup

### Result API Service (Port 6404)
```yaml
# docker-compose.apps.yml
result-api:
  ports:
    - "6404:6404"
  environment:
    - PORT=6404
```

**Responsibilities:**
- Sample data aggregation
- Real-time WebSocket updates
- Statistics and analytics
- Background data processing

### Vision Inference Service (Port 6405)
```yaml
# docker-compose.apps.yml
vision-inference:
  ports:
    - "6405:6405"
  environment:
    - PORT=6405
```

**Responsibilities:**
- AI model inference
- Image analysis and prediction
- Bounding box generation
- Model management

### Prediction DB Service (Port 6406)
```yaml
# docker-compose.apps.yml
prediction-db-service:
  ports:
    - "6406:6406"
  environment:
    - PORT=6406
```

**Responsibilities:**
- Database operations for predictions
- Data validation and integrity
- Schema management
- CRUD APIs for prediction data

### Vision Capture Service (Port 6407)
```yaml
# docker-compose.yml
vision-capture-service:
  ports:
    - "6407:6407"
  environment:
    - PORT=6407
    - CAMERA_DEVICE_ID=0
    - JWT_SECRET=${JWT_SECRET}
```

**Responsibilities:**
- Camera control and image capture
- Real-time status updates via WebSocket
- JWT authentication integration
- Image storage and management

## Environment Variables

### Common Variables
All services share these common environment variables:

```bash
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/microplates"

# Application
NODE_ENV="development"
API_BASE_URL="http://localhost:6400"

# Logging
LOG_LEVEL="info"
LOG_FORMAT="pretty"

# Gateway Integration
# JWT, CORS, Rate Limiting handled by gateway
```

### Service-Specific Variables

#### Result API Service
```bash
PORT=6404
REDIS_URL="redis://redis:6379"
REDIS_LOG_CHANNEL="microplate:result-api:logs"
REDIS_ERROR_CHANNEL="microplate:result-api:errors"
WEBSOCKET_PATH="/api/v1/results/ws"
PREDICTION_DB_SERVICE_URL="http://prediction-db-service:6406"
```

#### Prediction DB Service
```bash
PORT=6406
REDIS_URL="redis://redis:6379"
REDIS_LOG_CHANNEL="microplate:prediction-db:logs"
REDIS_ERROR_CHANNEL="microplate:prediction-db:errors"
```

#### Labware Interface Service
```bash
PORT=6405
OUTPUT_DIRECTORY="/app/generated"
DEFAULT_DELIVERY_METHOD="folder"
DEFAULT_FOLDER_PATH="/mnt/labshare/inbox"
```

#### Vision Capture Service
```bash
PORT=6407
CAMERA_DEVICE_ID=0
CAMERA_WIDTH=1920
CAMERA_HEIGHT=1080
CAMERA_FPS=30
JWT_SECRET=${JWT_SECRET}
JWT_ISSUER=microplate-auth
JWT_AUDIENCE=microplate-services
CAPTURE_DIR=captures
IMAGE_QUALITY=95
```

## Docker Compose Configuration

### Network Setup
```yaml
networks:
  default:
    name: microplate-network
    external: true
```

### Service Dependencies
```yaml
# Service dependency chain
image-ingestion-service:
  depends_on:
    - auth-service

vision-inference-service:
  depends_on:
    - image-ingestion-service
    - prediction-db-service
    - result-api-service

result-api-service:
  depends_on:
    - prediction-db-service

labware-interface:
  depends_on:
    - result-api-service
```

## Health Check Endpoints

Each service provides health check endpoints:

| Service | Health Check URL |
|---------|------------------|
| Auth Service | `http://localhost:6401/healthz` |
| Image Ingestion | `http://localhost:6402/healthz` |
| Vision Inference | `http://localhost:6403/api/v1/inference/health` |
| Result API | `http://localhost:6404/api/v1/results/health` |
| Labware Interface | `http://localhost:6405/healthz` |
| Prediction DB | `http://localhost:6406/health` |
| Vision Capture | `http://localhost:6407/api/v1/capture/health` |

## Service Discovery

### Internal Communication
Services communicate using Docker service names:

- `http://auth-service:6401` - Auth Service
- `http://image-ingestion-service:6402` - Image Ingestion
- `http://vision-inference:6403` - Vision Inference
- `http://result-api:6404` - Result API
- `http://labware-interface:6405` - Labware Interface
- `http://prediction-db-service:6406` - Prediction DB
- `http://vision-capture-service:6407` - Vision Capture

### External Access
External clients access services directly:

- `http://localhost:6401/api/v1/auth/*` → Auth Service
- `http://localhost:6402/api/v1/images/*` → Image Ingestion
- `http://localhost:6403/api/v1/inference/*` → Vision Inference
- `http://localhost:6404/api/v1/results/*` → Result API
- `http://localhost:6405/api/v1/interface/*` → Labware Interface
- `http://localhost:6406/api/v1/predictions/*` → Prediction DB
- `http://localhost:6407/api/v1/capture/*` → Vision Capture

## Port Management

### Development Environment
- All services run on localhost with mapped ports
- Ports are accessible from host machine
- Docker handles port mapping and forwarding

### Production Environment
- Services run on internal network
- External access through direct service endpoints or load balancer
- Load balancer can be configured for high availability

### Port Conflicts
If port conflicts occur:
1. Check if port is already in use: `netstat -tulpn | grep :PORT`
2. Update docker-compose.apps.yml with new port
3. Update environment variables
4. Update documentation
5. Update service configuration

## Security Considerations

### Network Isolation
- Services communicate on internal Docker network
- External access through direct service endpoints
- No central gateway - each service handles its own authentication

### Port Security
- Only necessary ports are exposed
- Health check endpoints are internal
- API endpoints handle their own authentication

### Service Authentication
- Each service handles its own authentication
- JWT tokens validated per service
- Service-to-service communication uses internal network

## Monitoring and Debugging

### Port Monitoring
```bash
# Check if all services are running
docker-compose -f docker-compose.apps.yml ps

# Check specific service logs
docker-compose -f docker-compose.apps.yml logs -f result-api-service

# Check port usage
netstat -tulpn | grep -E ":(6401|6402|6403|6404|6405|6406|6407)"
```

### Service Health Checks
```bash
# Test all health endpoints
curl http://localhost:6401/healthz  # Auth
curl http://localhost:6402/healthz  # Image Ingestion
curl http://localhost:6403/api/v1/inference/health  # Vision Inference
curl http://localhost:6404/api/v1/results/health  # Result API
curl http://localhost:6405/healthz  # Labware Interface
curl http://localhost:6406/health  # Prediction DB
curl http://localhost:6407/api/v1/capture/health  # Vision Capture
```

## Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Find process using port
lsof -i :6404

# Kill process if needed
kill -9 PID
```

#### Service Not Starting
```bash
# Check service logs
docker-compose logs service-name

# Check port configuration
docker-compose config
```

#### Network Connectivity Issues
```bash
# Test internal connectivity
docker exec -it container-name curl http://other-service:port/health

# Check Docker network
docker network ls
docker network inspect microplate-network
```

## Future Considerations

### Scaling
- Services can be scaled horizontally
- Load balancer can distribute traffic
- Database connections need to be managed

### Port Expansion
- Additional services can use ports 6407+
- Port ranges should be documented
- Service discovery should be updated

### Security Enhancements
- TLS/SSL termination at load balancer or service level
- Service mesh implementation
- Network policies for Kubernetes
