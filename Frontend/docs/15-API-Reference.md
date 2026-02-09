# API Reference - Microplate System

## Overview
This document provides a comprehensive reference for all APIs used in the Microplate system. All APIs are accessed directly through individual service endpoints.

## Authentication

### Register User
```http
POST http://localhost:6401/api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "username": "username",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe"
}
```

### Login User
```http
POST http://localhost:6401/api/v1/auth/login
Content-Type: application/json

{
  "username": "username",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "Bearer",
    "expires_in": 900
  }
}
```

## Vision Capture Service

### Health Check
```http
GET http://localhost:6407/api/v1/capture/health
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

### Get Camera Status
```http
GET http://localhost:6407/api/v1/capture/status
Authorization: Bearer {token}
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

### Capture Image
```http
POST http://localhost:6407/api/v1/capture/image
Authorization: Bearer {token}
Content-Type: application/json

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

### Test Camera
```http
POST http://localhost:6407/api/v1/capture/test
Authorization: Bearer {token}
```

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

### WebSocket Connection
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

## Image Management

### Upload Image
```http
POST http://localhost:6402/api/v1/images
Authorization: Bearer {token}
Content-Type: multipart/form-data

Fields:
- sample_no: string (required)
- run_id: string (optional)
- file_type: "raw" | "annotated" | "thumbnail" (default: "raw")
- description: string (optional)
- file: File (required)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "sampleNo": "sample_01",
    "fileType": "raw",
    "fileName": "image.jpg",
    "filePath": "/uploads/image.jpg",
    "fileSize": 12345,
    "mimeType": "image/jpeg",
    "width": 1920,
    "height": 1080,
    "bucketName": "microplate-images",
    "objectKey": "raw/sample_01/image.jpg",
    "signedUrl": "https://minio...",
    "urlExpiresAt": "2025-09-25T12:00:00Z",
    "createdAt": "2025-09-25T11:00:00Z"
  }
}
```

## Vision Inference

### Run Prediction
```http
POST http://localhost:6403/api/v1/inference/predict
Authorization: Bearer {token}
Content-Type: multipart/form-data

Fields:
- sample_no: string (required)
- submission_no: string (optional)
- file: File (required)
- model_version: string (optional, default: "v1.2.0")
- confidence_threshold: number (optional, default: 0.5)
- description: string (optional)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "run_id": 53,
    "sample_no": "sample_04",
    "status": "completed",
    "processing_time_ms": 1500,
    "model_version": "v1.2.0",
    "confidence_threshold": 0.5,
    "well_predictions": [
      {
        "well_id": "A1",
        "class": "positive",
        "confidence": 0.95,
        "bbox": [100, 150, 200, 250],
        "label": "cell"
      }
    ],
    "row_counts": {
      "A": 8,
      "B": 7,
      "C": 9
    },
    "inference_results": {
      "total_wells": 96,
      "positive_wells": 45,
      "negative_wells": 51,
      "confidence_scores": [0.95, 0.87, 0.92]
    },
    "raw_image_path": "/uploads/raw_image.jpg",
    "annotated_image_path": "/uploads/annotated_image.jpg",
    "created_at": "2025-09-25T11:00:00Z",
    "updated_at": "2025-09-25T11:00:15Z"
  }
}
```

## Prediction Data

### Get Prediction Run
```http
GET http://localhost:6406/api/v1/predictions/{run_id}
Authorization: Bearer {token}
```

**Response:**
```json
{
  "run": {
    "id": 53,
    "sampleNo": "sample_04",
    "submissionNo": null,
    "description": null,
    "predictAt": "2025-09-25T11:00:00Z",
    "annotatedImagePath": "/uploads/annotated_image.jpg",
    "rawImagePath": "/uploads/raw_image.jpg",
    "modelVersion": "v1.2.0",
    "status": "completed",
    "errorMsg": null,
    "processingTimeMs": 1500,
    "confidenceThreshold": 0.5,
    "createdBy": null,
    "createdAt": "2025-09-25T11:00:00Z",
    "updatedAt": "2025-09-25T11:00:15Z",
    "wellPredictions": [
      {
        "id": 1,
        "wellId": "A1",
        "class": "positive",
        "confidence": 0.95,
        "bbox": [100, 150, 200, 250],
        "label": "cell",
        "runId": 53,
        "createdAt": "2025-09-25T11:00:10Z"
      }
    ],
    "rowCounts": [
      {
        "id": 1,
        "runId": 53,
        "counts": {
          "A": 8,
          "B": 7,
          "C": 9
        },
        "createdAt": "2025-09-25T11:00:12Z"
      }
    ],
    "inferenceResults": [
      {
        "id": 1,
        "runId": 53,
        "results": {
          "total_wells": 96,
          "positive_wells": 45,
          "negative_wells": 51
        },
        "createdAt": "2025-09-25T11:00:14Z"
      }
    ],
    "imageFiles": [
      {
        "id": 1,
        "runId": 53,
        "sampleNo": "sample_04",
        "fileType": "raw",
        "fileName": "raw_image.jpg",
        "filePath": "/uploads/raw_image.jpg",
        "fileSize": 12345,
        "mimeType": "image/jpeg",
        "width": 1920,
        "height": 1080,
        "bucketName": "microplate-images",
        "objectKey": "raw/sample_04/raw_image.jpg",
        "signedUrl": "https://minio...",
        "urlExpiresAt": "2025-09-25T12:00:00Z",
        "createdAt": "2025-09-25T11:00:05Z"
      }
    ]
  },
  "timestamp": "2025-09-25T11:00:15Z"
}
```

### List All Prediction Runs
```http
GET http://localhost:6406/api/v1/predictions
Authorization: Bearer {token}
```

## Image Signed URLs (NEW!)

### Generate Signed URL
```http
POST http://localhost:6402/api/v1/signed-urls
Authorization: Bearer {token}
Content-Type: application/json

{
  "bucket": "raw-images",
  "objectKey": "TEST006/14/TEST006_xxx.jpg",
  "expiresIn": 3600
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "signedUrl": "http://localhost:9000/raw-images/TEST006/14/...?X-Amz-Signature=...",
    "expiresAt": "2025-10-01T12:00:00.000Z",
    "bucket": "raw-images",
    "objectKey": "TEST006/14/..."
  }
}
```

### Generate Batch Signed URLs
```http
POST http://localhost:6402/api/v1/signed-urls/batch
Authorization: Bearer {token}
Content-Type: application/json

{
  "images": [
    {"bucket": "raw-images", "objectKey": "TEST006/14/image1.jpg"},
    {"bucket": "annotated-images", "objectKey": "TEST006/14/image2.jpg"}
  ],
  "expiresIn": 3600
}
```

## Results API

### Get Sample Summary
```http
GET http://localhost:6404/api/v1/results/samples/{sampleNo}/summary
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sampleNo": "sample_04",
    "totalRuns": 1,
    "latestRun": {
      "id": 53,
      "status": "completed",
      "createdAt": "2025-09-25T11:00:00Z",
      "processingTimeMs": 1500
    },
    "statistics": {
      "totalWells": 96,
      "positiveWells": 45,
      "negativeWells": 51,
      "averageConfidence": 0.87
    }
  }
}
```

### Get Run Details
```http
GET http://localhost:6404/api/v1/results/runs/{runId}
Authorization: Bearer {token}
```

### Get Sample Runs
```http
GET http://localhost:6404/api/v1/results/samples/{sampleNo}/runs
Authorization: Bearer {token}
```

### Direct Database Access (Optimized)

#### Get All Samples (Direct)
```http
GET http://localhost:6404/api/v1/results/direct/samples
Authorization: Bearer {token}
```

#### Get Sample Runs (Direct)
```http
GET http://localhost:6404/api/v1/results/direct/samples/{sampleNo}/runs?page=1&limit=50
Authorization: Bearer {token}
```

#### Delete Run and Recalculate Summary (NEW!)
```http
DELETE http://localhost:6404/api/v1/results/direct/runs/{runId}
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "message": "Run deleted and sample summary recalculated",
    "sampleNo": "TEST006"
  }
}
```

**Features:**
- Deletes all run-related data (predictions, counts, inference results)
- Automatically recalculates sample summary from remaining runs
- Updates distribution and statistics
- Removes sample summary if no runs remain

## Health Checks

### Service Health
```http
GET http://localhost:6401/healthz  # Auth Service
GET http://localhost:6402/healthz  # Image Ingestion
GET http://localhost:6403/api/v1/inference/health  # Vision Inference
GET http://localhost:6404/api/v1/results/health  # Result API
GET http://localhost:6405/healthz  # Labware Interface
GET http://localhost:6406/health  # Prediction DB
GET http://localhost:6407/api/v1/capture/health  # Vision Capture
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": 1758800129.781865,
    "services": {
      "auth": {
        "status": "healthy",
        "responseTime": 45
      },
      "images": {
        "status": "healthy",
        "responseTime": 32
      },
      "inference": {
        "status": "healthy",
        "responseTime": 28
      },
      "results": {
        "status": "healthy",
        "responseTime": 38
      }
    }
  }
}
```

## Error Responses

### Standard Error Format
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {
      "field": "Additional error details"
    }
  }
}
```

### Common Error Codes
- `UNAUTHORIZED` - Missing or invalid authentication token
- `FORBIDDEN` - Insufficient permissions
- `NOT_FOUND` - Resource not found
- `VALIDATION_ERROR` - Invalid request data
- `INFERENCE_FAILED` - Model inference failed
- `INTERNAL_ERROR` - Server internal error

## Rate Limiting

- **Default:** 100 requests per minute per IP
- **Authentication:** 10 requests per minute per IP
- **Inference:** 5 requests per minute per user

## CORS

- Production: จัดการโดย API gateway / reverse proxy (ระบุ origin ที่อนุญาตใน gateway)
- Development: webpack-dev-server proxy (`http://localhost:6410`) ส่ง header CORS ให้โดยอัตโนมัติ
- Backend servicesจึงไม่ต้องเปิด `@fastify/cors` หรือ middleware เพิ่มเติม

## WebSocket Support

### Real-time Updates
```javascript
// Result API WebSocket
const ws = new WebSocket('ws://localhost:6404/ws/results');

// Vision Capture WebSocket
const wsCapture = new WebSocket('ws://localhost:6407/ws/capture');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Real-time update:', data);
};
```

**Message Types:**
- `inference_progress` - Inference processing updates
- `prediction_complete` - Prediction completion notifications
- `system_status` - System health updates

## File Upload Limits

- **Maximum file size:** 50MB
- **Supported formats:** JPG, JPEG, PNG, TIFF
- **Minimum resolution:** 640x480
- **Maximum resolution:** 8192x8192

## Authentication Token

- **Type:** JWT (JSON Web Token)
- **Expiration:** 15 minutes
- **Refresh:** Use login endpoint to get new token
- **Header:** `Authorization: Bearer {token}`

## Example Frontend Integration

### React/JavaScript Example
```javascript
// Login
const login = async (username, password) => {
  const response = await fetch('http://localhost:6401/api/v1/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password })
  });
  const data = await response.json();
  localStorage.setItem('token', data.data.access_token);
  return data;
};

// Upload and Predict
const predictImage = async (sampleNo, file) => {
  const token = localStorage.getItem('token');
  const formData = new FormData();
  formData.append('sample_no', sampleNo);
  formData.append('file', file);
  
  const response = await fetch('http://localhost:6403/api/v1/inference/predict', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });
  
  return await response.json();
};

// Get Results
const getResults = async (runId) => {
  const token = localStorage.getItem('token');
  const response = await fetch(`http://localhost:6404/api/v1/results/runs/${runId}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  return await response.json();
};
```

## Notes

1. All timestamps are in ISO 8601 format (UTC)
2. File paths are relative to the service's upload directory
3. Signed URLs expire after 1 hour
4. Confidence scores range from 0.0 to 1.0
5. Well IDs follow the format: A1, A2, ..., H12 (8 rows x 12 columns)
6. Bounding boxes are in format: [x, y, width, height]
7. All services support graceful degradation and health checks

