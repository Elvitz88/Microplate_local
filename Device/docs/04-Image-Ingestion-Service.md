# Image Ingestion Service - Complete Specification

## Overview

The Image Ingestion Service handles all image storage, management, and delivery for the Microplate AI System. It provides secure storage, signed URL generation, and metadata management for both raw and annotated images.

## Technology Stack

- **Runtime**: Node.js 18+
- **Framework**: Fastify 4.x
- **Language**: TypeScript
- **ORM**: Prisma 5.x
- **Database**: PostgreSQL 17
- **Object Storage**: MinIO/S3 compatible
- **Image Processing**: Sharp
- **Validation**: Zod
- **Documentation**: OpenAPI 3.0

## Service Architecture

```typescript
// Project structure
image-ingestion-service/
├── src/
│   ├── config/
│   │   ├── database.ts
│   │   ├── storage.ts
│   │   └── image.ts
│   ├── controllers/
│   │   ├── image.controller.ts
│   │   └── upload.controller.ts
│   ├── services/
│   │   ├── image.service.ts
│   │   ├── storage.service.ts
│   │   ├── processing.service.ts
│   │   └── metadata.service.ts
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   ├── upload.middleware.ts
│   │   └── validation.middleware.ts
│   ├── routes/
│   │   ├── image.routes.ts
│   │   └── upload.routes.ts
│   ├── schemas/
│   │   └── image.schemas.ts
│   ├── utils/
│   │   ├── storage.util.ts
│   │   ├── image.util.ts
│   │   └── validation.util.ts
│   ├── types/
│   │   └── image.types.ts
│   └── app.ts
├── prisma/
├── tests/
├── package.json
└── .env.example
```

## API Endpoints

### Image Management Endpoints

#### POST /api/v1/images
Upload and store an image.

**Request Body (multipart/form-data):**
```
sample_no: string
run_id?: number
file_type: "raw" | "annotated" | "thumbnail"
file: File
description?: string
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 123,
    "sampleNo": "S123456",
    "runId": 456,
    "fileType": "raw",
    "fileName": "S123456_20240115_103000.jpg",
    "filePath": "raw-images/S123456/456/20240115_103000_uuid.jpg",
    "fileSize": 2048576,
    "mimeType": "image/jpeg",
    "width": 1920,
    "height": 1080,
    "bucketName": "raw-images",
    "objectKey": "S123456/456/20240115_103000_uuid.jpg",
    "signedUrl": "http://minio:9000/raw-images/S123456/456/20240115_103000_uuid.jpg?X-Amz-Algorithm=...",
    "urlExpiresAt": "2024-01-15T11:00:00Z",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

#### POST /api/v1/images/presign
Generate presigned URL for direct upload.

**Request Body:**
```json
{
  "sample_no": "S123456",
  "file_type": "raw",
  "mime_type": "image/jpeg",
  "file_size": 2048576,
  "run_id": 456
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "uploadUrl": "https://storage.example.com/raw-images/S123456/456/20240115_103000_uuid.jpg?signature=...",
    "filePath": "raw-images/S123456/456/20240115_103000_uuid.jpg",
    "objectKey": "S123456/456/20240115_103000_uuid.jpg",
    "expiresAt": "2024-01-15T11:00:00Z"
  }
}
```

#### GET /api/v1/images/:id
Get image metadata and signed URL.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 123,
    "sampleNo": "S123456",
    "runId": 456,
    "fileType": "raw",
    "fileName": "S123456_20240115_103000.jpg",
    "filePath": "raw-images/S123456/456/20240115_103000_uuid.jpg",
    "fileSize": 2048576,
    "mimeType": "image/jpeg",
    "width": 1920,
    "height": 1080,
    "signedUrl": "http://minio:9000/raw-images/S123456/456/20240115_103000_uuid.jpg?X-Amz-Algorithm=...",
    "urlExpiresAt": "2024-01-15T11:00:00Z",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

#### GET /api/v1/images/by-run/:runId
Get all images for a specific run.

**Query Parameters:**
- `file_type`: Filter by file type
- `include_expired`: Include expired signed URLs (default: false)

**Response:**
```json
{
  "success": true,
  "data": {
    "images": [
      {
        "id": 123,
        "fileType": "raw",
        "fileName": "S123456_20240115_103000.jpg",
        "signedUrl": "http://minio:9000/raw-images/S123456/456/20240115_103000_uuid.jpg?X-Amz-Algorithm=...",
        "urlExpiresAt": "2024-01-15T11:00:00Z",
        "createdAt": "2024-01-15T10:30:00Z"
      },
      {
        "id": 124,
        "fileType": "annotated",
        "fileName": "S123456_20240115_103000_annotated.jpg",
        "signedUrl": "http://minio:9000/annotated-images/S123456/456/20240115_103000_uuid.jpg?X-Amz-Algorithm=...",
        "urlExpiresAt": "2024-01-15T11:00:00Z",
        "createdAt": "2024-01-15T10:30:00Z"
      }
    ],
    "runId": 456,
    "totalCount": 2
  }
}
```

#### GET /api/v1/images/by-sample/:sampleNo
Get all images for a specific sample.

**Query Parameters:**
- `file_type`: Filter by file type
- `limit`: Number of images to return (default: 50)
- `offset`: Number of images to skip (default: 0)
- `sort_by`: Sort field (created_at, file_type)
- `sort_order`: Sort order (asc, desc)

**Response:**
```json
{
  "success": true,
  "data": {
    "images": [
      {
        "id": 123,
        "runId": 456,
        "fileType": "raw",
        "fileName": "S123456_20240115_103000.jpg",
        "signedUrl": "http://minio:9000/raw-images/S123456/456/20240115_103000_uuid.jpg?X-Amz-Algorithm=...",
        "urlExpiresAt": "2024-01-15T11:00:00Z",
        "createdAt": "2024-01-15T10:30:00Z"
      }
    ],
    "sampleNo": "S123456",
    "pagination": {
      "limit": 50,
      "offset": 0,
      "total": 1,
      "hasMore": false
    }
  }
}
```

#### POST /api/v1/signed-urls (NEW!)
Generate signed URL for an existing image in MinIO.

**Request Body:**
```json
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

#### POST /api/v1/signed-urls/batch (NEW!)
Generate signed URLs for multiple images at once.

**Request Body:**
```json
{
  "images": [
    {"bucket": "raw-images", "objectKey": "TEST006/14/image1.jpg"},
    {"bucket": "annotated-images", "objectKey": "TEST006/14/image2.jpg"}
  ],
  "expiresIn": 3600
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "signedUrl": "http://localhost:9000/raw-images/...",
      "expiresAt": "2025-10-01T12:00:00.000Z",
      "bucket": "raw-images",
      "objectKey": "TEST006/14/image1.jpg"
    },
    {
      "signedUrl": "http://localhost:9000/annotated-images/...",
      "expiresAt": "2025-10-01T12:00:00.000Z",
      "bucket": "annotated-images",
      "objectKey": "TEST006/14/image2.jpg"
    }
  ]
}
```

#### DELETE /api/v1/images/:id
Soft delete an image (mark as deleted, don't remove from storage).

**Response:**
```json
{
  "success": true,
  "message": "Image deleted successfully"
}
```

### Image Processing Endpoints

#### POST /api/v1/images/:id/process
Process an image (resize, optimize, generate thumbnail).

**Request Body:**
```json
{
  "operations": [
    {
      "type": "resize",
      "width": 800,
      "height": 600,
      "fit": "contain"
    },
    {
      "type": "optimize",
      "quality": 85
    },
    {
      "type": "thumbnail",
      "size": 200
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "processedImages": [
      {
        "id": 125,
        "fileType": "thumbnail",
        "fileName": "S123456_20240115_103000_thumb.jpg",
        "signedUrl": "http://minio:9000/thumbnails/S123456/456/20240115_103000_uuid_thumb.jpg?X-Amz-Algorithm=...",
        "width": 200,
        "height": 150
      }
    ]
  }
}
```

## Storage Configuration

### Bucket Structure
```
raw-images/
├── {sample_no}/
│   └── {run_id}/
│       └── {timestamp}_{uuid}.{ext}

annotated-images/
├── {sample_no}/
│   └── {run_id}/
│       └── {timestamp}_{uuid}_annotated.{ext}

thumbnails/
├── {sample_no}/
│   └── {run_id}/
│       └── {timestamp}_{uuid}_thumb.{ext}
```

### File Naming Convention
- **Raw images**: `{sample_no}_{timestamp}_{uuid}.{ext}`
- **Annotated images**: `{sample_no}_{timestamp}_{uuid}_annotated.{ext}`
- **Thumbnails**: `{sample_no}_{timestamp}_{uuid}_thumb.{ext}`

## Implementation Details

### Storage Service
```typescript
export class StorageService {
  private client: S3Client;
  private buckets: {
    raw: string;
    annotated: string;
    thumbnails: string;
  };

  async uploadFile(
    bucket: string,
    key: string,
    file: Buffer,
    metadata: Record<string, string>
  ): Promise<UploadResult> {
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: file,
      Metadata: metadata,
      ContentType: metadata.mimeType,
      ServerSideEncryption: 'AES256'
    });

    await this.client.send(command);
    
    return {
      bucket,
      key,
      url: `https://${bucket}.s3.amazonaws.com/${key}`
    };
  }

  async generateSignedUrl(
    bucket: string,
    key: string,
    expiresIn: number = 3600
  ): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key
    });

    return getSignedUrl(this.client, command, { expiresIn });
  }

  async deleteFile(bucket: string, key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key
    });

    await this.client.send(command);
  }
}
```

### Image Processing Service
```typescript
export class ImageProcessingService {
  async processImage(
    inputBuffer: Buffer,
    operations: ImageOperation[]
  ): Promise<ProcessedImage[]> {
    const results: ProcessedImage[] = [];
    
    for (const operation of operations) {
      let image = sharp(inputBuffer);
      
      switch (operation.type) {
        case 'resize':
          image = image.resize(operation.width, operation.height, {
            fit: operation.fit || 'contain'
          });
          break;
          
        case 'optimize':
          image = image.jpeg({ quality: operation.quality || 85 });
          break;
          
        case 'thumbnail':
          image = image.resize(operation.size, operation.size, {
            fit: 'cover'
          });
          break;
      }
      
      const processedBuffer = await image.toBuffer();
      const metadata = await sharp(processedBuffer).metadata();
      
      results.push({
        buffer: processedBuffer,
        width: metadata.width!,
        height: metadata.height!,
        size: processedBuffer.length
      });
    }
    
    return results;
  }
}
```

### Metadata Service
```typescript
export class MetadataService {
  async extractImageMetadata(file: Buffer): Promise<ImageMetadata> {
    const metadata = await sharp(file).metadata();
    
    return {
      width: metadata.width!,
      height: metadata.height!,
      format: metadata.format!,
      size: file.length,
      mimeType: `image/${metadata.format}`,
      hasAlpha: metadata.hasAlpha || false,
      density: metadata.density || 72,
      orientation: metadata.orientation || 1
    };
  }

  async generateThumbnail(
    inputBuffer: Buffer,
    size: number = 200
  ): Promise<Buffer> {
    return sharp(inputBuffer)
      .resize(size, size, { fit: 'cover' })
      .jpeg({ quality: 80 })
      .toBuffer();
  }
}
```

## Environment Configuration

```bash
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/microplates"

# Object Storage (MinIO/S3)
OBJECT_STORAGE_ENDPOINT="http://minio:9000"  # Internal endpoint (Docker)
OBJECT_STORAGE_EXTERNAL_ENDPOINT="http://localhost:9000"  # External endpoint (Browser)
OBJECT_STORAGE_ACCESS_KEY="minioadmin"
OBJECT_STORAGE_SECRET_KEY="minioadmin123"
OBJECT_STORAGE_BUCKET_RAW="raw-images"
OBJECT_STORAGE_BUCKET_ANNOTATED="annotated-images"
OBJECT_STORAGE_REGION="us-east-1"
OBJECT_STORAGE_FORCE_PATH_STYLE="true"

# Application
NODE_ENV="development"
PORT=6402
API_BASE_URL="http://localhost:6400"

# Image Processing
MAX_FILE_SIZE_BYTES="52428800"  # 50MB
ALLOWED_MIME_TYPES="image/jpeg,image/png,image/tiff,image/webp"

# Signed URL
SIGNED_URL_EXPIRY="3600"  # 1 hour (in seconds)

# JWT Authentication
JWT_ACCESS_SECRET="your-secret-key"
JWT_ISSUER="microplate-auth-service"
JWT_AUDIENCE="microplate-api"

# Redis (Optional)
REDIS_URL="redis://redis:6379"
REDIS_LOG_CHANNEL="microplate:image-ingestion:logs"
REDIS_ERROR_CHANNEL="microplate:image-ingestion:errors"

# MinIO Retention
MINIO_RETENTION_CHECK_INTERVAL_MS="86400000"  # 24 hours
MINIO_RETENTION_DELETE_DAYS="60"
MINIO_RETENTION_DRY_RUN="false"
```

**Important Notes:**
- `OBJECT_STORAGE_ENDPOINT` - Used by Docker services for uploading (internal network)
- `OBJECT_STORAGE_EXTERNAL_ENDPOINT` - Used for signed URL generation (accessible from browser)
- This dual-endpoint approach ensures signed URLs work correctly from the browser while maintaining internal service-to-service communication

## Error Handling

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "FILE_TOO_LARGE",
    "message": "File size exceeds maximum allowed size",
    "details": {
      "maxSize": "50MB",
      "actualSize": "75MB"
    },
    "requestId": "uuid",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### Common Error Codes
- `FILE_TOO_LARGE`: File size exceeds limit
- `INVALID_FILE_TYPE`: Unsupported file type
- `UPLOAD_FAILED`: File upload failed
- `PROCESSING_FAILED`: Image processing failed
- `STORAGE_ERROR`: Object storage error
- `FILE_NOT_FOUND`: Image not found
- `URL_EXPIRED`: Signed URL expired
- `VALIDATION_ERROR`: Input validation failed

## Security Features

### File Upload Security
- File type validation
- File size limits
- Virus scanning (optional)
- Content-type verification
- File extension validation

### Access Control
- Signed URLs with expiration
- Role-based access to images
- Audit logging for all access
- IP-based restrictions (optional)

### Data Protection
- Server-side encryption
- Secure file deletion
- Data retention policies
- Backup and recovery

## Performance Optimization

### Caching Strategy
- Redis cache for frequently accessed metadata
- CDN integration for image delivery
- Browser caching headers
- ETag support for conditional requests

### Image Optimization
- Automatic format conversion (WebP)
- Progressive JPEG encoding
- Lazy loading support
- Responsive image generation

### Storage Optimization
- Lifecycle policies for old images
- Compression for archived images
- Deduplication for identical files
- Cleanup of orphaned files

## Monitoring and Metrics

### Key Metrics
- Upload success/failure rates
- Processing time per image
- Storage usage by bucket
- Signed URL generation frequency
- Error rates by type

### Health Checks
- `/healthz`: Basic health check
- `/readyz`: Readiness check (storage connectivity)
- `/metrics`: Prometheus metrics

### Logging
- All file operations logged
- Performance metrics
- Error tracking
- Security events
