# Microplate Device Services

> Camera control and image capture services for the Microplate AI System

---

## 📋 Table of Contents

- [Overview](#overview)
- [Vision Capture Service](#vision-capture-service)
- [Hardware Requirements](#hardware-requirements)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [API Endpoints](#api-endpoints)
- [WebSocket Integration](#websocket-integration)
- [Camera Setup](#camera-setup)
- [Troubleshooting](#troubleshooting)
- [Development](#development)

---

## 🎯 Overview

The **Microplate Device Services** directory contains services that interact directly with hardware devices, primarily the **Vision Capture Service** for camera control and image capture.

### Components

```
microplate-device/
└── vision-capture-service/      # Camera control service (Port 6407)
    ├── app/                     # FastAPI application
    │   ├── api/                 # API routes
    │   │   ├── capture.py       # Capture endpoints
    │   │   ├── health.py        # Health checks
    │   │   └── websocket.py     # WebSocket endpoints
    │   ├── core/                # Core functionality
    │   │   ├── auth.py          # JWT authentication
    │   │   ├── config.py        # Configuration
    │   │   └── websocket_manager.py
    │   ├── models/              # Data models
    │   │   └── schemas.py       # Pydantic schemas
    │   └── services/            # Business logic
    │       ├── camera_service.py
    │       └── status_service.py
    ├── config/                  # Configuration files
    ├── logs/                    # Log files
    ├── tests/                   # Unit tests
    ├── docker-compose.yml       # Service deployment
    ├── Dockerfile               # Docker image
    ├── requirements.txt         # Python dependencies
    ├── main.py                  # Application entry
    ├── run.py                   # Development runner
    └── README.md                # This file
```

---

## 📸 Vision Capture Service

### Overview

The Vision Capture Service controls USB/CSI cameras for microplate image capture with real-time preview and status monitoring.

**Technology Stack:**
- Python 3.11+
- FastAPI + Uvicorn
- OpenCV (cv2)
- Pillow (PIL)
- WebSocket support
- JWT authentication

**Port:** 6407

**Protocols:** HTTP + WebSocket

### Key Features

- ✅ USB/CSI camera support
- ✅ Real-time image capture
- ✅ Live preview streaming (MJPEG)
- ✅ WebSocket status updates
- ✅ JWT authentication
- ✅ Configurable camera settings
- ✅ Health monitoring
- ✅ Capture statistics

---

## 🖥️ Hardware Requirements

### Supported Cameras

#### USB Cameras (Recommended)
- Logitech C920/C922/C930e
- Microsoft LifeCam Studio
- Generic UVC-compatible webcams

#### CSI Cameras (Raspberry Pi)
- Raspberry Pi Camera Module V2
- Raspberry Pi Camera Module V3
- Raspberry Pi HQ Camera

#### Industrial Cameras
- USB3 Vision cameras
- GigE Vision cameras (with adapter)

### System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **CPU** | Dual-core | Quad-core |
| **RAM** | 2 GB | 4 GB |
| **Storage** | 10 GB | 50 GB SSD |
| **USB** | USB 2.0 | USB 3.0 |
| **OS** | Linux, Windows 10, macOS | Ubuntu 22.04 LTS |

### Camera Specifications

| Specification | Minimum | Recommended |
|---------------|---------|-------------|
| **Resolution** | 1280x720 (HD) | 1920x1080 (Full HD) |
| **Frame Rate** | 15 fps | 30 fps |
| **Focus** | Fixed | Auto or Manual |
| **Connection** | USB 2.0 | USB 3.0 |
| **Lens** | 60° FOV | 90° FOV |

---

## 🚀 Quick Start

### 1. Prerequisites

```bash
# Check Python version (3.11+ required)
python --version

# Check camera is detected
# Linux
ls -la /dev/video*

# Windows
ffmpeg -list_devices true -f dshow -i dummy

# macOS
system_profiler SPCameraDataType
```

### 2. Installation

**Without Docker:**

```bash
cd vision-capture-service

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Linux/macOS:
source venv/bin/activate
# Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp env.example .env

# Edit .env with your configuration
nano .env
```

**With Docker:**

```bash
cd vision-capture-service

# Copy environment file
cp env.example .env

# Build and start service
docker-compose up --build -d

# View logs
docker-compose logs -f
```

### 3. Configuration

Edit `.env` file:

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
CAMERA_DEVICE_ID=0              # 0 for first camera, 1 for second, etc.
CAMERA_WIDTH=1920
CAMERA_HEIGHT=1080
CAMERA_FPS=30

# Image Capture Settings
CAPTURE_TIMEOUT=30
IMAGE_QUALITY=95                # JPEG quality (0-100)
IMAGE_FORMAT=JPEG               # JPEG or PNG

# File Storage
CAPTURE_DIR=captures            # Directory for captured images
MAX_CAPTURE_AGE_HOURS=24        # Auto-cleanup old images

```

> **Production tip:** ตั้งค่า endpoint ของระบบกลางผ่าน gateway (เช่น `https://api.example.com/api/v1/capture/...`) และปล่อยให้ gateway จัดการ CORS/Rate limiting ส่วนบริการนี้ไม่ต้องตั้ง `ALLOWED_ORIGINS`

### 4. Run Service

**Development Mode:**

```bash
# Using run.py (recommended for development)
python run.py

# Or using uvicorn directly
uvicorn main:app --host 0.0.0.0 --port 6407 --reload
```

**Production Mode:**

```bash
# Using Docker
docker-compose up -d

# Or using systemd
sudo systemctl start microplate-capture
```

### 5. Verify Installation

```bash
# Check health
curl http://localhost:6407/api/v1/capture/health

# Expected response:
# {
#   "success": true,
#   "status": "healthy",
#   "details": {
#     "uptime_seconds": 60,
#     "camera_connected": true,
#     "version": "1.0.0"
#   }
# }
```

---

## 📖 API Endpoints

### Health & Status

#### GET /api/v1/capture/health
Returns service health status (no authentication required).

```bash
curl http://localhost:6407/api/v1/capture/health
```

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
Get camera status (requires authentication).

```bash
curl http://localhost:6407/api/v1/capture/status \
  -H "Authorization: Bearer $TOKEN"
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

### Image Capture

#### POST /api/v1/capture/image
Capture image from camera (requires authentication).

```bash
curl -X POST http://localhost:6407/api/v1/capture/image \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sample_no": "TEST005",
    "submission_no": "SUB001",
    "description": "Microplate capture",
    "quality": 95
  }'
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
  }
}
```

#### POST /api/v1/capture/test
Test camera functionality (requires authentication).

```bash
curl -X POST http://localhost:6407/api/v1/capture/test \
  -H "Authorization: Bearer $TOKEN"
```

#### GET /api/v1/capture/stats
Get capture statistics.

```bash
curl http://localhost:6407/api/v1/capture/stats \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🔌 WebSocket Integration

### Connection

```javascript
// JavaScript/TypeScript
const ws = new WebSocket('ws://localhost:6407/ws/capture');

ws.onopen = () => {
  console.log('Connected to capture service');
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Received:', message);
  
  switch (message.type) {
    case 'initial_status':
      console.log('Camera status:', message.data);
      break;
    
    case 'capture_progress':
      console.log('Capture progress:', message.data.progress + '%');
      break;
    
    case 'capture_result':
      console.log('Capture completed:', message.data);
      break;
    
    case 'status_update':
      console.log('Status update:', message.data);
      break;
    
    case 'heartbeat':
      // Keep-alive message
      break;
  }
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};

ws.onclose = () => {
  console.log('Disconnected from capture service');
};
```

### Message Types

**Server → Client Messages:**

```typescript
// Initial connection status
{
  "type": "initial_status",
  "data": {
    "is_connected": true,
    "is_capturing": false,
    "device_id": 0
  }
}

// Capture progress update
{
  "type": "capture_progress",
  "data": {
    "progress": 50,
    "message": "Processing image..."
  }
}

// Capture result
{
  "type": "capture_result",
  "data": {
    "success": true,
    "filename": "capture_TEST005_20240115.jpg",
    "sample_no": "TEST005"
  }
}

// Camera status update
{
  "type": "status_update",
  "data": {
    "is_connected": true,
    "resolution": "1920x1080"
  }
}

// Heartbeat (every 30 seconds)
{
  "type": "heartbeat",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**Client → Server Messages:**

```typescript
// Ping to check connection
{
  "type": "ping"
}

// Server responds with:
{
  "type": "pong",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

## 📷 Camera Setup

### Linux (Ubuntu/Debian)

```bash
# Install v4l-utils
sudo apt-get update
sudo apt-get install v4l-utils

# List available cameras
v4l2-ctl --list-devices

# Check camera capabilities
v4l2-ctl -d /dev/video0 --all

# Test camera
ffplay /dev/video0

# Set camera permissions
sudo usermod -aG video $USER
# Logout and login for changes to take effect
```

### Windows

```bash
# List cameras using ffmpeg
ffmpeg -list_devices true -f dshow -i dummy

# Test camera
ffplay -f dshow -i video="Camera Name"
```

### macOS

```bash
# List cameras
system_profiler SPCameraDataType

# Test camera using ffmpeg
ffplay -f avfoundation -i "0"  # 0 is camera index
```

### Raspberry Pi (CSI Camera)

```bash
# Enable camera
sudo raspi-config
# Select: Interface Options > Camera > Enable

# Test camera
raspistill -o test.jpg

# Use with OpenCV
# Add to requirements.txt:
# opencv-python-headless  # For Raspberry Pi
```

### Docker Camera Access

```yaml
# docker-compose.yml
services:
  vision-capture-service:
    devices:
      - /dev/video0:/dev/video0  # Map camera device
    privileged: true             # May be needed for camera access
    environment:
      - CAMERA_DEVICE_ID=0
```

**Troubleshooting Docker Camera Access:**

```bash
# Check camera device inside container
docker exec -it vision-capture-service ls -la /dev/video*

# Test camera inside container
docker exec -it vision-capture-service python -c "
import cv2
cap = cv2.VideoCapture(0)
print('Camera opened:', cap.isOpened())
cap.release()
"
```

---

## ⚙️ Configuration

### Camera Settings

```python
# In camera_service.py
class CameraConfig:
    device_id: int = 0           # Camera device ID
    width: int = 1920            # Image width
    height: int = 1080           # Image height
    fps: int = 30                # Frames per second
    
    # Advanced settings
    brightness: int = 128        # 0-255
    contrast: int = 128          # 0-255
    saturation: int = 128        # 0-255
    exposure: int = -6           # -13 to -1 (auto), or manual value
    autofocus: bool = True       # Enable autofocus
    
    # Capture settings
    capture_timeout: int = 30    # Seconds
    retry_attempts: int = 3
    retry_delay: float = 1.0     # Seconds
```

### Image Quality Settings

```bash
# JPEG quality (0-100)
IMAGE_QUALITY=95                 # High quality (larger files)
IMAGE_QUALITY=85                 # Good quality (balanced)
IMAGE_QUALITY=75                 # Medium quality (smaller files)

# Image format
IMAGE_FORMAT=JPEG                # JPEG (lossy compression)
IMAGE_FORMAT=PNG                 # PNG (lossless, larger files)
```

### Performance Tuning

```bash
# For high-speed capture
CAMERA_FPS=60
CAPTURE_TIMEOUT=10

# For high-quality capture
CAMERA_WIDTH=3840                # 4K resolution
CAMERA_HEIGHT=2160
IMAGE_QUALITY=98

# For low-resource devices (Raspberry Pi)
CAMERA_WIDTH=1280
CAMERA_HEIGHT=720
CAMERA_FPS=15
IMAGE_QUALITY=85
```

---

## 🔌 API Integration

### Frontend Integration Example

```typescript
// services/capture.service.ts
class CaptureService {
  private baseUrl = 'http://localhost:6407';
  private wsUrl = 'ws://localhost:6407';
  private ws: WebSocket | null = null;

  // Capture image
  async captureImage(
    sampleNo: string,
    submissionNo?: string
  ): Promise<CaptureResponse> {
    const token = this.getAuthToken();
    
    const response = await fetch(`${this.baseUrl}/api/v1/capture/image`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sample_no: sampleNo,
        submission_no: submissionNo,
        description: 'Captured from web interface',
        quality: 95,
      }),
    });

    if (!response.ok) {
      throw new Error(`Capture failed: ${response.statusText}`);
    }

    return response.json();
  }

  // Get camera status
  async getCameraStatus(): Promise<CameraStatus> {
    const token = this.getAuthToken();
    
    const response = await fetch(`${this.baseUrl}/api/v1/capture/status`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    return response.json();
  }

  // Connect to WebSocket
  connectWebSocket(
    onMessage: (message: any) => void,
    onError?: (error: Event) => void
  ): void {
    this.ws = new WebSocket(`${this.wsUrl}/ws/capture`);
    
    this.ws.onopen = () => {
      console.log('WebSocket connected');
    };
    
    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      onMessage(message);
    };
    
    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      onError?.(error);
    };
    
    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      // Attempt reconnection after 5 seconds
      setTimeout(() => this.connectWebSocket(onMessage, onError), 5000);
    };
  }

  // Disconnect WebSocket
  disconnectWebSocket(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private getAuthToken(): string {
    return localStorage.getItem('accessToken') || '';
  }
}

export const captureService = new CaptureService();
```

### React Hook Example

```typescript
// hooks/useCapture.ts
import { useState, useEffect } from 'react';
import { captureService } from '../services/capture.service';

export function useCapture() {
  const [status, setStatus] = useState<CameraStatus | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Connect to WebSocket for real-time updates
    captureService.connectWebSocket(
      (message) => {
        if (message.type === 'status_update') {
          setStatus(message.data);
        }
      },
      (error) => {
        setError('WebSocket connection failed');
      }
    );

    // Cleanup on unmount
    return () => {
      captureService.disconnectWebSocket();
    };
  }, []);

  const captureImage = async (sampleNo: string, submissionNo?: string) => {
    setIsCapturing(true);
    setError(null);

    try {
      const result = await captureService.captureImage(sampleNo, submissionNo);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Capture failed');
      throw err;
    } finally {
      setIsCapturing(false);
    }
  };

  return {
    status,
    isCapturing,
    error,
    captureImage,
  };
}
```

---

## 🐛 Troubleshooting

### Camera Not Detected

**Issue:** Camera not found or not opening

**Solutions:**

```bash
# 1. Check camera is connected
# Linux
ls -la /dev/video*

# 2. Check camera permissions
ls -l /dev/video0
# Should show: crw-rw---- 1 root video

# 3. Add user to video group
sudo usermod -aG video $USER
# Logout and login

# 4. Test camera directly
python -c "
import cv2
cap = cv2.VideoCapture(0)
print('Camera opened:', cap.isOpened())
ret, frame = cap.read()
print('Frame captured:', ret)
cap.release()
"

# 5. Check Docker device mapping
docker-compose config | grep devices
```

### Poor Image Quality

**Issue:** Blurry, dark, or low-quality images

**Solutions:**

```bash
# 1. Increase JPEG quality
IMAGE_QUALITY=98

# 2. Increase resolution
CAMERA_WIDTH=1920
CAMERA_HEIGHT=1080

# 3. Adjust camera settings
# In camera_service.py:
cap.set(cv2.CAP_PROP_BRIGHTNESS, 140)  # Increase brightness
cap.set(cv2.CAP_PROP_CONTRAST, 140)    # Increase contrast
cap.set(cv2.CAP_PROP_SATURATION, 150)  # Increase saturation
cap.set(cv2.CAP_PROP_EXPOSURE, -5)     # Adjust exposure

# 4. Check lighting conditions
# - Ensure adequate lighting
# - Avoid glare and reflections
# - Use diffused lighting
```

### Capture Timeout

**Issue:** Image capture takes too long or times out

**Solutions:**

```bash
# 1. Increase timeout
CAPTURE_TIMEOUT=60

# 2. Reduce resolution
CAMERA_WIDTH=1280
CAMERA_HEIGHT=720

# 3. Check USB connection
# - Use USB 3.0 port
# - Use shorter USB cable
# - Avoid USB hubs

# 4. Check system resources
top
# Ensure adequate CPU and memory available
```

### WebSocket Connection Issues

**Issue:** WebSocket connections fail or disconnect frequently

**Solutions:**

```bash
# 1. Check WebSocket endpoint
curl -i -N -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: $(openssl rand -base64 16)" \
  http://localhost:6407/ws/capture

# 2. Check firewall
# Ensure port 6407 is open

# 3. Enable WebSocket logging
DEBUG=true python run.py

# 4. Implement reconnection logic
# See frontend integration example above
```

### Docker-Specific Issues

**Issue:** Camera not accessible in Docker container

```bash
# 1. Add privileged mode
privileged: true

# 2. Map device correctly
devices:
  - /dev/video0:/dev/video0

# 3. Check device inside container
docker exec -it vision-capture-service ls -la /dev/video*

# 4. Test camera inside container
docker exec -it vision-capture-service python -c "
import cv2
print('Cameras:', [cv2.VideoCapture(i).isOpened() for i in range(4)])
"
```

---

## 💻 Development

### Project Structure

```python
vision-capture-service/
├── app/
│   ├── __init__.py
│   ├── api/
│   │   ├── __init__.py
│   │   ├── routes/
│   │   │   ├── __init__.py
│   │   │   ├── capture.py      # Capture endpoints
│   │   │   ├── health.py       # Health checks
│   │   │   └── websocket.py    # WebSocket handlers
│   ├── core/
│   │   ├── __init__.py
│   │   ├── auth.py              # JWT validation
│   │   ├── config.py            # Configuration
│   │   └── websocket_manager.py # WebSocket manager
│   ├── models/
│   │   ├── __init__.py
│   │   └── schemas.py           # Pydantic models
│   └── services/
│       ├── __init__.py
│       ├── camera_service.py    # Camera operations
│       └── status_service.py    # Status monitoring
├── config/                      # Config files
├── logs/                        # Log files
├── tests/                       # Unit tests
│   ├── __init__.py
│   └── test_camera_service.py
├── main.py                      # FastAPI app
├── run.py                       # Development runner
├── requirements.txt             # Dependencies
├── pytest.ini                   # Pytest config
├── Dockerfile
└── docker-compose.yml
```

### Installing Development Dependencies

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Install development dependencies
pip install -r requirements-dev.txt

# Or install individually
pip install pytest pytest-asyncio pytest-cov
pip install black flake8 mypy
pip install ipython ipdb
```

### Running Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/test_camera_service.py

# Run with verbose output
pytest -v

# Run with debugging
pytest --pdb
```

### Code Quality

```bash
# Format code with Black
black app/ tests/

# Lint with flake8
flake8 app/ tests/

# Type checking with mypy
mypy app/

# Run all quality checks
black app/ && flake8 app/ && mypy app/ && pytest
```

---

## 🔬 Advanced Features

### Custom Camera Settings

```python
# app/services/camera_service.py

class CameraService:
    def configure_camera(self, settings: dict):
        """Apply custom camera settings"""
        if 'brightness' in settings:
            self.camera.set(cv2.CAP_PROP_BRIGHTNESS, settings['brightness'])
        
        if 'contrast' in settings:
            self.camera.set(cv2.CAP_PROP_CONTRAST, settings['contrast'])
        
        if 'exposure' in settings:
            # Disable auto-exposure
            self.camera.set(cv2.CAP_PROP_AUTO_EXPOSURE, 0.25)
            # Set manual exposure
            self.camera.set(cv2.CAP_PROP_EXPOSURE, settings['exposure'])
        
        if 'focus' in settings:
            # Disable autofocus
            self.camera.set(cv2.CAP_PROP_AUTOFOCUS, 0)
            # Set manual focus
            self.camera.set(cv2.CAP_PROP_FOCUS, settings['focus'])
```

### Multi-Camera Support

```python
# Support for multiple cameras
class MultiCameraService:
    def __init__(self):
        self.cameras = {}
        self.detect_cameras()
    
    def detect_cameras(self):
        """Detect all available cameras"""
        for i in range(10):  # Check first 10 device IDs
            cap = cv2.VideoCapture(i)
            if cap.isOpened():
                self.cameras[i] = {
                    'id': i,
                    'name': f'Camera {i}',
                    'capture': cap,
                }
                cap.release()
    
    async def capture_from_camera(self, camera_id: int, **kwargs):
        """Capture from specific camera"""
        if camera_id not in self.cameras:
            raise ValueError(f"Camera {camera_id} not found")
        
        # ... capture logic ...
```

---

## 📊 Monitoring

### Service Metrics

```bash
# Check service health
curl http://localhost:6407/api/v1/capture/health

# Get capture statistics
curl http://localhost:6407/api/v1/capture/stats \
  -H "Authorization: Bearer $TOKEN"
```

### Logs

```bash
# View logs
tail -f logs/vision-capture.log

# Filter errors only
tail -f logs/vision-capture.log | grep ERROR

# Docker logs
docker-compose logs -f vision-capture-service
```

---

## 🚢 Deployment

### Docker Deployment

```bash
# Build image
docker build -t microplate/vision-capture:latest .

# Run container
docker run -d \
  --name vision-capture \
  -p 6407:6407 \
  --device /dev/video0:/dev/video0 \
  --env-file .env \
  microplate/vision-capture:latest

# View logs
docker logs -f vision-capture
```

### Systemd Service (Linux)

Create `/etc/systemd/system/microplate-capture.service`:

```ini
[Unit]
Description=Microplate Vision Capture Service
After=network.target

[Service]
Type=simple
User=microplate
WorkingDirectory=/opt/microplate/vision-capture-service
Environment="PATH=/opt/microplate/vision-capture-service/venv/bin"
ExecStart=/opt/microplate/vision-capture-service/venv/bin/python run.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**Enable and start:**

```bash
sudo systemctl daemon-reload
sudo systemctl enable microplate-capture
sudo systemctl start microplate-capture
sudo systemctl status microplate-capture
```

---

## 📞 Support

### Camera Hardware Issues

- Check camera compatibility: https://www.ideasonboard.org/uvc/
- Verify USB bandwidth is sufficient
- Test with different USB ports
- Update camera firmware if available

### Software Issues

- Check [Troubleshooting Guide](../../docs/16-Troubleshooting-Guide.md)
- Review [API Documentation](../../docs/08-Vision-Capture-Service.md)
- Search GitHub Issues
- Contact support: support@microplate-ai.com

---

## 📄 License

This project is part of the Microplate AI System and is licensed under the MIT License.

---

<div align="center">

**Vision Capture Service** - Part of Microplate Device Services

[Main README](../../README.md) • [Backend Services](../microplate-be/) • [Frontend](../microplate-fe/)

</div>

