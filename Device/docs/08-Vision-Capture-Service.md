# Vision Capture Service - Complete Implementation

## Overview

Vision Capture Service เป็นบริการสำหรับการถ่ายภาพ Microplate ด้วยกล้องที่เชื่อมต่อ โดยใช้ FastAPI และ OpenCV พร้อมระบบ WebSocket สำหรับ real-time updates

## Technology Stack

- **Runtime**: Python 3.11+
- **Framework**: FastAPI + Uvicorn
- **Computer Vision**: OpenCV, PIL
- **Authentication**: JWT Token validation
- **Real-time**: WebSocket support
- **Validation**: Pydantic
- **Containerization**: Docker + Docker Compose

## Service Architecture

```
vision-capture-service/
├── app/
│   ├── api/routes/          # API endpoints
│   │   ├── capture.py       # Capture operations
│   │   ├── health.py        # Health checks
│   │   └── websocket.py     # WebSocket endpoints
│   ├── core/                # Core functionality
│   │   ├── auth.py          # JWT authentication
│   │   ├── config.py        # Configuration management
│   │   └── websocket_manager.py # WebSocket management
│   ├── models/              # Data models
│   │   └── schemas.py       # Pydantic schemas
│   └── services/            # Business logic
│       ├── camera_service.py    # Camera operations
│       └── status_service.py    # Status monitoring
├── tests/                   # Unit tests
├── main.py                  # FastAPI application
├── requirements.txt         # Python dependencies
├── Dockerfile              # Docker configuration
├── docker-compose.yml      # Docker Compose
└── README.md               # Documentation
```

## API Endpoints

### Health & Status Endpoints

#### GET /api/v1/capture/health
Health check endpoint

**Response:**
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "details": {
    "uptime_seconds": 3600,
    "camera_connected": true,
    "camera_capturing": false,
    "websocket_connections": 2,
    "version": "1.0.0"
  }
}
```

#### GET /api/v1/capture/status
Get camera status (requires authentication)

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "is_connected": true,
  "is_capturing": false,
  "device_id": 0,
  "resolution": "1920x1080",
  "fps": 30,
  "last_capture": "2024-01-15T10:30:00Z",
  "error_message": null
}
```

### Capture Endpoints

#### POST /api/v1/capture/image
Capture image from camera (requires authentication)

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "sample_no": "TEST005",
  "submission_no": "SUB001",
  "description": "Microplate capture",
  "quality": 95
}
```

**Response:**
```json
{
  "success": true,
  "message": "Image captured successfully",
  "data": {
    "image_data": {
      "filename": "capture_TEST005_SUB001_20240115_103000.jpg",
      "file_path": "/app/captures/capture_TEST005_SUB001_20240115_103000.jpg",
      "file_size": 2048576,
      "width": 1920,
      "height": 1080,
      "format": "JPEG",
      "captured_at": "2024-01-15T10:30:00Z"
    },
    "sample_no": "TEST005",
    "submission_no": "SUB001"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### POST /api/v1/capture/test
Test camera functionality (requires authentication)

**Response:**
```json
{
  "success": true,
  "message": "Camera test successful",
  "data": {
    "camera_status": "working",
    "device_info": {
      "device_id": 0,
      "configured_resolution": "1920x1080",
      "configured_fps": 30,
      "is_initialized": true,
      "is_capturing": false
    }
  }
}
```

#### GET /api/v1/capture/stats
Get capture statistics (requires authentication)

**Response:**
```json
{
  "success": true,
  "data": {
    "total_captures": 25,
    "successful_captures": 23,
    "failed_captures": 2,
    "average_capture_time": 1.2,
    "last_capture_time": "2024-01-15T10:30:00Z",
    "storage_used": 52428800
  }
}
```

### WebSocket Endpoints

#### WS /ws/capture
WebSocket endpoint for real-time capture updates

**Connection:**
```javascript
const ws = new WebSocket('ws://localhost:6407/ws/capture');

ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    
    if (message.type === 'capture_progress') {
        console.log(`Progress: ${message.data.progress}%`);
    }
    
    if (message.type === 'capture_result') {
        console.log('Capture completed:', message.data);
    }
};
```

**Message Types:**
- `initial_status`: Initial connection status
- `capture_progress`: Capture progress updates
- `capture_result`: Capture completion result
- `status_update`: Camera status updates
- `heartbeat`: Connection heartbeat
- `pong`: Response to ping

#### WS /ws/status
WebSocket endpoint for status monitoring only

## Implementation Details

### Camera Service
```python
class CameraService:
    def __init__(self):
        self.camera = None
        self.is_initialized = False
        self.is_capturing = False
        self.capture_dir = Path("captures")
        self._capture_stats = {
            "total_captures": 0,
            "successful_captures": 0,
            "failed_captures": 0,
            "capture_times": []
        }
    
    async def initialize(self) -> bool:
        """Initialize camera connection"""
        self.camera = cv2.VideoCapture(self.device_id or 0)
        
        if not self.camera.isOpened():
            return False
        
        # Set camera properties
        self.camera.set(cv2.CAP_PROP_FRAME_WIDTH, self.width)
        self.camera.set(cv2.CAP_PROP_FRAME_HEIGHT, self.height)
        self.camera.set(cv2.CAP_PROP_FPS, self.fps)
        
        self.is_initialized = True
        return True
    
    async def capture_image(
        self, 
        sample_no: str, 
        submission_no: Optional[str] = None,
        description: str = "Captured image",
        quality: int = 95
    ) -> Tuple[bool, Optional[ImageData], Optional[str]]:
        """Capture image from camera"""
        if not self.is_initialized or self.camera is None:
            return False, None, "Camera not initialized"
        
        if self.is_capturing:
            return False, None, "Capture already in progress"
        
        self.is_capturing = True
        
        try:
            # Capture frame
            ret, frame = self.camera.read()
            
            if not ret:
                return False, None, "Failed to capture frame from camera"
            
            # Generate filename
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"capture_{sample_no}_{timestamp}.jpg"
            
            if submission_no:
                filename = f"capture_{sample_no}_{submission_no}_{timestamp}.jpg"
            
            file_path = self.capture_dir / filename
            
            # Save image
            success = cv2.imwrite(str(file_path), frame, [cv2.IMWRITE_JPEG_QUALITY, quality])
            
            if not success:
                return False, None, "Failed to save image"
            
            # Create image data
            height, width = frame.shape[:2]
            file_size = file_path.stat().st_size
            
            image_data = ImageData(
                filename=filename,
                file_path=str(file_path),
                file_size=file_size,
                width=width,
                height=height,
                format="JPEG",
                captured_at=datetime.now()
            )
            
            # Update stats
            self._capture_stats["total_captures"] += 1
            self._capture_stats["successful_captures"] += 1
            self.last_capture_time = datetime.now()
            
            return True, image_data, None
            
        except Exception as e:
            self._capture_stats["failed_captures"] += 1
            return False, None, str(e)
        
        finally:
            self.is_capturing = False
```

### Status Service
```python
class StatusService:
    def __init__(self):
        self.start_time = time.time()
        self.is_monitoring = False
        self.status_callbacks = []
        self.camera_service = None
        self.websocket_manager = None
    
    async def get_service_status(self) -> ServiceStatus:
        """Get comprehensive service status"""
        uptime = time.time() - self.start_time
        
        # Get camera status
        camera_status = CameraStatus(
            is_connected=False,
            is_capturing=False,
            device_id=None,
            resolution=None,
            fps=None,
            last_capture=None,
            error_message="Camera service not available"
        )
        
        if self.camera_service:
            camera_status = await self.camera_service.get_status()
        
        # Get WebSocket connection count
        websocket_connections = 0
        if self.websocket_manager:
            websocket_connections = self.websocket_manager.get_connection_count()
        
        # Determine overall service status
        overall_status = "healthy"
        if not camera_status.is_connected:
            overall_status = "degraded"
        if camera_status.error_message:
            overall_status = "unhealthy"
        
        return ServiceStatus(
            service_name="Vision Capture Service",
            version="1.0.0",
            status=overall_status,
            uptime=uptime,
            camera_status=camera_status,
            websocket_connections=websocket_connections,
            last_health_check=datetime.now()
        )
```

### WebSocket Manager
```python
class WebSocketManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.connection_metadata: Dict[WebSocket, Dict[str, Any]] = {}
        self.heartbeat_task: Optional[asyncio.Task] = None
    
    async def connect(self, websocket: WebSocket, client_info: Optional[Dict[str, Any]] = None):
        """Accept new WebSocket connection"""
        await websocket.accept()
        self.active_connections.append(websocket)
        self.connection_metadata[websocket] = {
            "connected_at": datetime.now(),
            "client_info": client_info or {},
            "last_heartbeat": datetime.now()
        }
    
    async def broadcast_status_update(self, status_data: Dict[str, Any]):
        """Broadcast camera status update"""
        message = {
            "type": "status_update",
            "data": status_data,
            "timestamp": datetime.now().isoformat()
        }
        await self.broadcast(message)
    
    async def broadcast_capture_progress(self, progress_data: Dict[str, Any]):
        """Broadcast capture progress update"""
        message = {
            "type": "capture_progress",
            "data": progress_data,
            "timestamp": datetime.now().isoformat()
        }
        await self.broadcast(message)
    
    async def broadcast_capture_result(self, result_data: Dict[str, Any]):
        """Broadcast capture result"""
        message = {
            "type": "capture_result",
            "data": result_data,
            "timestamp": datetime.now().isoformat()
        }
        await self.broadcast(message)
```

## Environment Configuration

```bash
# Server Configuration
HOST=0.0.0.0
PORT=6407
DEBUG=false

# JWT Configuration (must match auth-service)
JWT_SECRET=your-jwt-secret-key
JWT_ALGORITHM=HS256
JWT_ISSUER=microplate-auth
JWT_AUDIENCE=microplate-services

# Camera Configuration
CAMERA_DEVICE_ID=0
CAMERA_WIDTH=1920
CAMERA_HEIGHT=1080
CAMERA_FPS=30

# Image Capture Settings
CAPTURE_TIMEOUT=30
IMAGE_QUALITY=95
IMAGE_FORMAT=JPEG

# File Storage
CAPTURE_DIR=captures
MAX_CAPTURE_AGE_HOURS=24

# Status Monitoring
STATUS_CHECK_INTERVAL=5
CONNECTION_TIMEOUT=10

# Logging
LOG_LEVEL=INFO
LOG_FILE=logs/vision-capture.log

# WebSocket Settings
WS_HEARTBEAT_INTERVAL=30
WS_MAX_CONNECTIONS=10

```

## Docker Deployment

### Dockerfile
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for OpenCV
RUN apt-get update && apt-get install -y \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    libavcodec-dev \
    libavformat-dev \
    libswscale-dev \
    libv4l-dev \
    libxvidcore-dev \
    libx264-dev \
    libjpeg-dev \
    libpng-dev \
    libtiff-dev \
    libatlas-base-dev \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
RUN mkdir -p logs captures

ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

EXPOSE 6407

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:6407/api/v1/capture/health || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "6407"]
```

### Docker Compose
```yaml
version: '3.8'

services:
  vision-capture-service:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: microplate-vision-capture
    ports:
      - "${PORT:-6407}:${PORT:-6407}"
    env_file:
      - .env
    environment:
      - HOST=${HOST:-0.0.0.0}
      - PORT=${PORT:-6407}
      - JWT_SECRET=${JWT_SECRET}
      - JWT_ISSUER=${JWT_ISSUER}
      - JWT_AUDIENCE=${JWT_AUDIENCE}
      - CAMERA_DEVICE_ID=${CAMERA_DEVICE_ID:-0}
    volumes:
      - ./${CAPTURE_DIR:-captures}:/app/${CAPTURE_DIR:-captures}
      - ./logs:/app/logs
    networks:
      - microplate-network
    restart: unless-stopped
    privileged: true
    devices:
      - /dev/video${CAMERA_DEVICE_ID:-0}:/dev/video${CAMERA_DEVICE_ID:-0}
```

## Frontend Integration

### Service Implementation
```typescript
class CaptureService {
  private baseUrl = 'http://localhost:6407';
  private wsUrl = 'ws://localhost:6407';

  async captureImage(sampleNo: string, submissionNo?: string): Promise<CaptureResponse> {
    const token = this.getAuthToken();
    
    const response = await fetch(`${this.baseUrl}/api/v1/capture/image`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sample_no: sampleNo,
        submission_no: submissionNo,
        description: 'Captured image',
        quality: 95
      })
    });

    return response.json();
  }

  async getCameraStatus(): Promise<CameraStatus> {
    const token = this.getAuthToken();
    
    const response = await fetch(`${this.baseUrl}/api/v1/capture/status`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    return response.json();
  }

  connectWebSocket(): WebSocket {
    const ws = new WebSocket(`${this.wsUrl}/ws/capture`);
    
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.handleWebSocketMessage(message);
    };

    return ws;
  }

  private handleWebSocketMessage(message: any) {
    switch (message.type) {
      case 'capture_progress':
        this.onCaptureProgress?.(message.data);
        break;
      case 'capture_result':
        this.onCaptureResult?.(message.data);
        break;
      case 'status_update':
        this.onStatusUpdate?.(message.data);
        break;
    }
  }
}
```

## Error Handling

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "CAPTURE_FAILED",
    "message": "Image capture failed"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Common Error Codes
- `CAMERA_NOT_INITIALIZED`: Camera not initialized
- `CAMERA_NOT_AVAILABLE`: Camera not available
- `CAPTURE_FAILED`: Image capture failed
- `CAPTURE_IN_PROGRESS`: Capture already in progress
- `INVALID_TOKEN`: Invalid JWT token
- `TOKEN_EXPIRED`: JWT token expired
- `AUTH_ERROR`: Authentication error

## Performance Optimization

### Camera Management
- Asynchronous camera operations
- Efficient OpenCV usage
- Memory management for image processing
- Error recovery mechanisms

### WebSocket Management
- Connection pooling
- Heartbeat monitoring
- Automatic cleanup of disconnected clients
- Efficient message broadcasting

### Image Processing
- Efficient JPEG encoding
- Memory management
- File system optimization
- Background cleanup tasks

## Monitoring and Metrics

### Key Metrics
- Capture success/failure rates
- Camera availability status
- WebSocket connection count
- Image processing time
- Service uptime

### Health Checks
- `/api/v1/capture/health`: Basic health check
- `/api/v1/capture/status`: Camera status check
- WebSocket heartbeat monitoring

### Logging
- Camera operations
- Capture events
- WebSocket connections
- Error tracking
- Performance metrics

## Security Considerations

### Authentication
- JWT token validation
- Token expiration handling
- Secure token storage

### Camera Access
- Privileged container mode
- Device access control
- Permission validation

### Network Security
- ใช้งานผ่าน API gateway / VPN ที่องค์กรควบคุม
- WebSocket security (token validation, heartbeat)
- Input validation และ logging ฝั่งอุปกรณ์

## Deployment Guide

### Local Development
```bash
cd microplate-device/vision-capture-service
cp env.example .env
pip install -r requirements.txt
python run.py
```

### Docker Deployment
```bash
cd microplate-device/vision-capture-service
cp env.example .env
# Edit .env with your configuration
docker-compose up --build
```

### Production Considerations
- Configure proper JWT secrets
- Set up camera permissions
- Configure logging levels
- Set up monitoring
- Configure backup strategies