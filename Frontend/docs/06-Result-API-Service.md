# Result API Service - Complete Specification

## Overview

The Result API Service provides data aggregation, querying, and real-time updates for the Microplate AI System. It handles sample summaries, prediction history, and provides WebSocket connections for real-time data updates.

## Technology Stack

- **Runtime**: Node.js 18+
- **Framework**: Fastify 4.x
- **Language**: TypeScript
- **ORM**: Prisma 5.x
- **Database**: PostgreSQL 17
- **WebSocket**: @fastify/websocket
- **Validation**: Zod
- **Documentation**: OpenAPI 3.0

## Service Architecture

```typescript
// Project structure
result-api-service/
├── src/
│   ├── config/
│   │   ├── database.ts
│   │   ├── websocket.ts
│   │   └── cache.ts
│   ├── controllers/
│   │   ├── result.controller.ts
│   │   ├── sample.controller.ts
│   │   └── websocket.controller.ts
│   ├── services/
│   │   ├── result.service.ts
│   │   ├── sample.service.ts
│   │   ├── aggregation.service.ts
│   │   ├── websocket.service.ts
│   │   └── cache.service.ts
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   ├── validation.middleware.ts
│   │   └── websocket.middleware.ts
│   ├── routes/
│   │   ├── result.routes.ts
│   │   ├── sample.routes.ts
│   │   └── websocket.routes.ts
│   ├── schemas/
│   │   └── result.schemas.ts
│   ├── utils/
│   │   ├── aggregation.util.ts
│   │   ├── cache.util.ts
│   │   └── validation.util.ts
│   ├── types/
│   │   └── result.types.ts
│   └── app.ts
├── prisma/
├── tests/
├── package.json
└── .env.example
```

## API Endpoints

### Sample Management Endpoints

#### GET /api/v1/results/samples
Get list of samples with pagination and filtering.

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `search`: Search by sample_no or submission_no
- `status`: Filter by status (active, completed, failed)
- `date_from`: Filter by date range (ISO 8601)
- `date_to`: Filter by date range (ISO 8601)
- `sort_by`: Sort field (sample_no, last_run_at, total_runs)
- `sort_order`: Sort order (asc, desc)

**Response:**
```json
{
  "success": true,
  "data": {
    "samples": [
      {
        "sample_no": "S123456",
        "submission_no": "SUB789",
        "total_runs": 3,
        "last_run_at": "2024-01-15T10:30:00Z",
        "last_run_id": 456,
        "status": "active",
        "summary": {
          "distribution": {
            "positive": 37,
            "negative": 59,
            "invalid": 0
          }
        },
        "created_at": "2024-01-15T09:00:00Z",
        "updated_at": "2024-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "total_pages": 1,
      "has_next": false,
      "has_prev": false
    }
  }
}
```

#### GET /api/v1/results/samples/:sampleNo
Get detailed information about a specific sample.

**Response:**
```json
{
  "success": true,
  "data": {
    "sample_no": "S123456",
    "submission_no": "SUB789",
    "total_runs": 3,
    "first_run_at": "2024-01-15T09:00:00Z",
    "last_run_at": "2024-01-15T10:30:00Z",
    "status": "active",
    "summary": {
      "distribution": {
        "positive": 37,
        "negative": 59,
        "invalid": 0
      },
      "concentration": {
        "positive_percentage": 38.54,
        "negative_percentage": 61.46
      },
      "quality_metrics": {
        "average_confidence": 0.87,
        "high_confidence_percentage": 85.2
      }
    },
    "runs": [
      {
        "run_id": 456,
        "predict_at": "2024-01-15T10:30:00Z",
        "model_version": "v1.2.0",
        "status": "completed",
        "processing_time_ms": 1250,
        "statistics": {
          "total_detections": 96,
          "positive_count": 37,
          "negative_count": 59,
          "average_confidence": 0.87
        }
      }
    ]
  }
}
```

#### GET /api/v1/results/samples/:sampleNo/summary
Get aggregated summary for a sample.

**Response:**
```json
{
  "success": true,
  "data": {
    "sample_no": "S123456",
    "distribution": {
      "positive": 37,
      "negative": 59,
      "invalid": 0
    },
    "total_runs": 3,
    "last_run_at": "2024-01-15T10:30:00Z",
    "last_run_id": 456,
    "updated_at": "2024-01-15T10:30:00Z"
  }
}
```

### Prediction Run Endpoints

#### GET /api/v1/results/runs/:runId
Get detailed information about a specific prediction run.

**Response:**
```json
{
  "success": true,
  "data": {
    "run_id": 456,
    "sample_no": "S123456",
    "submission_no": "SUB789",
    "description": "Microplate analysis run",
    "predict_at": "2024-01-15T10:30:00Z",
    "model_version": "v1.2.0",
    "status": "completed",
    "processing_time_ms": 1250,
    "error_msg": null,
    "raw_image_url": "https://storage.example.com/raw-images/S123456/456/20240115_103000_uuid.jpg",
    "annotated_image_url": "https://storage.example.com/annotated-images/S123456/456/20240115_103000_uuid_annotated.jpg",
    "statistics": {
      "total_detections": 96,
      "positive_count": 37,
      "negative_count": 59,
      "invalid_count": 0,
      "average_confidence": 0.87
    },
    "row_counts": {
      "positive": 37,
      "negative": 59,
      "invalid": 0
    },
    "interface_results": {
      "distribution": {
        "positive": 37,
        "negative": 59,
        "invalid": 0
      },
      "concentration": {
        "positive_percentage": 38.54,
        "negative_percentage": 61.46
      },
      "quality_metrics": {
        "image_quality_score": 0.92,
        "well_detection_accuracy": 0.98,
        "overall_confidence": 0.87
      }
    },
    "well_predictions": [
      {
        "well_id": "A1",
        "label": "positive",
        "class": "positive",
        "confidence": 0.95,
        "bbox": {
          "xmin": 12,
          "ymin": 34,
          "xmax": 56,
          "ymax": 78
        }
      }
    ]
  }
}
```

#### GET /api/v1/results/samples/:sampleNo/runs
Get all prediction runs for a specific sample.

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `status`: Filter by status
- `date_from`: Filter by date range
- `date_to`: Filter by date range
- `sort_by`: Sort field (predict_at, run_id)
- `sort_order`: Sort order (asc, desc)

**Response:**
```json
{
  "success": true,
  "data": {
    "runs": [
      {
        "run_id": 456,
        "predict_at": "2024-01-15T10:30:00Z",
        "model_version": "v1.2.0",
        "status": "completed",
        "processing_time_ms": 1250,
        "statistics": {
          "total_detections": 96,
          "positive_count": 37,
          "negative_count": 59,
          "average_confidence": 0.87
        }
      }
    ],
    "sample_no": "S123456",
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "total_pages": 1,
      "has_next": false,
      "has_prev": false
    }
  }
}
```

#### GET /api/v1/results/samples/:sampleNo/last
Get the most recent prediction run for a sample.

**Response:**
```json
{
  "success": true,
  "data": {
    "run_id": 456,
    "sample_no": "S123456",
    "predict_at": "2024-01-15T10:30:00Z",
    "model_version": "v1.2.0",
    "status": "completed",
    "processing_time_ms": 1250,
    "annotated_image_url": "https://storage.example.com/annotated-images/S123456/456/20240115_103000_uuid_annotated.jpg",
    "statistics": {
      "total_detections": 96,
      "positive_count": 37,
      "negative_count": 59,
      "average_confidence": 0.87
    }
  }
}
```

### Statistics and Analytics Endpoints

#### GET /api/v1/results/statistics/overview
Get system-wide statistics and analytics.

**Query Parameters:**
- `date_from`: Filter by date range
- `date_to`: Filter by date range
- `group_by`: Group by (day, week, month)

**Response:**
```json
{
  "success": true,
  "data": {
    "total_samples": 150,
    "total_runs": 450,
    "active_samples": 120,
    "completed_runs": 420,
    "failed_runs": 30,
    "average_processing_time_ms": 1200,
    "success_rate": 0.93,
    "daily_stats": [
      {
        "date": "2024-01-15",
        "samples_processed": 25,
        "runs_completed": 75,
        "average_confidence": 0.87
      }
    ],
    "model_performance": {
      "v1.2.0": {
        "total_runs": 300,
        "success_rate": 0.95,
        "average_confidence": 0.88
      }
    }
  }
}
```

#### GET /api/v1/results/statistics/samples/:sampleNo/trends
Get trend analysis for a specific sample.

**Response:**
```json
{
  "success": true,
  "data": {
    "sample_no": "S123456",
    "trends": {
      "confidence_trend": [
        {
          "run_id": 456,
          "predict_at": "2024-01-15T10:30:00Z",
          "average_confidence": 0.87
        }
      ],
      "distribution_trend": [
        {
          "run_id": 456,
          "predict_at": "2024-01-15T10:30:00Z",
          "positive_count": 37,
          "negative_count": 59
        }
      ]
    }
  }
}
```

### Direct Database Access Endpoints (Optimized)

These endpoints provide direct access to the database for improved performance.

#### GET /api/v1/results/direct/samples
Get all samples directly from database.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "sampleNo": "TEST006",
      "summary": {
        "distribution": {"1": 0, "2": 2, "3": 0, "4": 4, "5": 6, "6": 4, "total": 16}
      },
      "totalRuns": 2,
      "lastRunAt": "2025-09-29T01:48:59.780Z",
      "lastRunId": 14,
      "createdAt": "2025-09-25T04:48:59.780Z",
      "updatedAt": "2025-09-29T01:48:59.780Z"
    }
  ]
}
```

#### GET /api/v1/results/direct/samples/:sampleNo/runs
Get all runs for a sample with full inference results included.

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `sortBy`: Sort field (default: createdAt)
- `sortOrder`: Sort order (asc, desc)

**Response:**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": 14,
        "sampleNo": "TEST006",
        "predictAt": "2025-09-29T01:48:59.780Z",
        "status": "completed",
        "rawImagePath": "TEST006/14/TEST006_xxx.jpg",
        "annotatedImagePath": "TEST006/14/TEST006_xxx_annotated.jpg",
        "inferenceResults": [
          {
            "id": 13,
            "runId": 14,
            "results": {
              "distribution": {"1": 0, "2": 1, "3": 0, "4": 2, "5": 3, "6": 2, "total": 8}
            }
          }
        ]
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 2,
      "totalPages": 1,
      "hasNext": false,
      "hasPrev": false
    }
  }
}
```

#### DELETE /api/v1/results/direct/runs/:runId (NEW!)
Delete a prediction run and automatically recalculate sample summary.

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
- Deletes run data (prediction_run, well_predictions, row_counts, inference_results)
- Automatically recalculates sample summary from remaining runs
- Updates distribution, total runs, and last run information
- Deletes sample summary if no runs remain

### WebSocket Endpoints

#### WebSocket /api/v1/results/ws
Real-time updates for prediction results.

**Connection:**
```javascript
const ws = new WebSocket('ws://localhost:6404/api/v1/results/ws?token=access-token');
```

**Message Types:**

**Subscribe to sample updates:**
```json
{
  "type": "subscribe",
  "channel": "sample",
  "sample_no": "S123456"
}
```

**Subscribe to run updates:**
```json
{
  "type": "subscribe",
  "channel": "run",
  "run_id": 456
}
```

**Unsubscribe:**
```json
{
  "type": "unsubscribe",
  "channel": "sample",
  "sample_no": "S123456"
}
```

**Server Messages:**

**Sample updated:**
```json
{
  "type": "sample_updated",
  "data": {
    "sample_no": "S123456",
    "summary": {
      "distribution": {
        "positive": 37,
        "negative": 59,
        "invalid": 0
      }
    },
    "updated_at": "2024-01-15T10:30:00Z"
  }
}
```

**Run completed:**
```json
{
  "type": "run_completed",
  "data": {
    "run_id": 456,
    "sample_no": "S123456",
    "status": "completed",
    "statistics": {
      "total_detections": 96,
      "positive_count": 37,
      "negative_count": 59
    }
  }
}
```

## Implementation Details

### Result Service
```typescript
export class ResultService {
  constructor(
    private prisma: PrismaClient,
    private cacheService: CacheService,
    private websocketService: WebSocketService
  ) {}

  async getSampleSummary(sampleNo: string): Promise<SampleSummary> {
    // Check cache first
    const cached = await this.cacheService.get(`sample:${sampleNo}:summary`);
    if (cached) {
      return cached;
    }

    // Query database
    const summary = await this.prisma.sampleSummary.findUnique({
      where: { sampleNo }
    });

    if (!summary) {
      throw new NotFoundError(`Sample ${sampleNo} not found`);
    }

    // Cache result
    await this.cacheService.set(`sample:${sampleNo}:summary`, summary, 300);

    return summary;
  }

  async getSampleRuns(
    sampleNo: string,
    options: PaginationOptions
  ): Promise<PaginatedResult<PredictionRun>> {
    const { page, limit, sortBy, sortOrder } = options;
    const skip = (page - 1) * limit;

    const [runs, total] = await Promise.all([
      this.prisma.predictionRun.findMany({
        where: { sampleNo },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
        include: {
          imageFiles: {
            where: { fileType: 'annotated' },
            select: { signedUrl: true, urlExpiresAt: true }
          }
        }
      }),
      this.prisma.predictionRun.count({
        where: { sampleNo }
      })
    ]);

    return {
      data: runs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    };
  }

  async getRunDetails(runId: number): Promise<PredictionRunDetails> {
    const run = await this.prisma.predictionRun.findUnique({
      where: { id: runId },
      include: {
        wellPredictions: true,
        rowCounts: true,
        interfaceResults: true,
        imageFiles: {
          select: {
            fileType: true,
            signedUrl: true,
            urlExpiresAt: true
          }
        }
      }
    });

    if (!run) {
      throw new NotFoundError(`Run ${runId} not found`);
    }

    return this.transformRunDetails(run);
  }
}
```

### Aggregation Service
```typescript
export class AggregationService {
  constructor(private prisma: PrismaClient) {}

  async updateSampleSummary(sampleNo: string): Promise<void> {
    // Get all interface results for the sample
    const interfaceResults = await this.prisma.interfaceResults.findMany({
      where: {
        run: { sampleNo }
      },
      include: { run: true }
    });

    // Calculate aggregated distribution
    const distribution = this.calculateDistribution(interfaceResults);

    // Get run statistics
    const runStats = await this.prisma.predictionRun.aggregate({
      where: { sampleNo },
      _count: { id: true },
      _max: { predictAt: true }
    });

    // Update or create sample summary
    await this.prisma.sampleSummary.upsert({
      where: { sampleNo },
      update: {
        summary: { distribution },
        totalRuns: runStats._count.id,
        lastRunAt: runStats._max.predictAt
      },
      create: {
        sampleNo,
        summary: { distribution },
        totalRuns: runStats._count.id,
        lastRunAt: runStats._max.predictAt
      }
    });
  }

  private calculateDistribution(interfaceResults: any[]): Record<string, number> {
    const distribution: Record<string, number> = {};

    for (const result of interfaceResults) {
      const dist = result.results.distribution;
      for (const [key, value] of Object.entries(dist)) {
        distribution[key] = (distribution[key] || 0) + (value as number);
      }
    }

    return distribution;
  }
}
```

### WebSocket Service
```typescript
export class WebSocketService {
  private connections = new Map<string, Set<WebSocket>>();
  private sampleSubscriptions = new Map<string, Set<string>>();
  private runSubscriptions = new Map<number, Set<string>>();

  addConnection(connectionId: string, ws: WebSocket): void {
    if (!this.connections.has(connectionId)) {
      this.connections.set(connectionId, new Set());
    }
    this.connections.get(connectionId)!.add(ws);
  }

  removeConnection(connectionId: string, ws: WebSocket): void {
    const connections = this.connections.get(connectionId);
    if (connections) {
      connections.delete(ws);
      if (connections.size === 0) {
        this.connections.delete(connectionId);
      }
    }
  }

  subscribeToSample(connectionId: string, sampleNo: string): void {
    if (!this.sampleSubscriptions.has(sampleNo)) {
      this.sampleSubscriptions.set(sampleNo, new Set());
    }
    this.sampleSubscriptions.get(sampleNo)!.add(connectionId);
  }

  unsubscribeFromSample(connectionId: string, sampleNo: string): void {
    const subscribers = this.sampleSubscriptions.get(sampleNo);
    if (subscribers) {
      subscribers.delete(connectionId);
      if (subscribers.size === 0) {
        this.sampleSubscriptions.delete(sampleNo);
      }
    }
  }

  async broadcastSampleUpdate(sampleNo: string, data: any): Promise<void> {
    const subscribers = this.sampleSubscriptions.get(sampleNo);
    if (!subscribers) return;

    const message = JSON.stringify({
      type: 'sample_updated',
      data
    });

    for (const connectionId of subscribers) {
      const connections = this.connections.get(connectionId);
      if (connections) {
        for (const ws of connections) {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(message);
          }
        }
      }
    }
  }

  async broadcastRunUpdate(runId: number, data: any): Promise<void> {
    const subscribers = this.runSubscriptions.get(runId);
    if (!subscribers) return;

    const message = JSON.stringify({
      type: 'run_completed',
      data
    });

    for (const connectionId of subscribers) {
      const connections = this.connections.get(connectionId);
      if (connections) {
        for (const ws of connections) {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(message);
          }
        }
      }
    }
  }
}
```

## Environment Configuration

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
REDIS_URL="redis://redis:6379"
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
PREDICTION_DB_SERVICE_URL="http://prediction-db-service:6406"
IMAGE_SERVICE_URL="http://image-ingestion-service:6402"

# Gateway Integration (handled by API Gateway)
# JWT, CORS, Rate Limiting are managed by the gateway service
```

## Error Handling

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "SAMPLE_NOT_FOUND",
    "message": "Sample not found",
    "details": {
      "sample_no": "S123456"
    },
    "requestId": "uuid",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### Common Error Codes
- `SAMPLE_NOT_FOUND`: Sample does not exist
- `RUN_NOT_FOUND`: Prediction run not found
- `VALIDATION_ERROR`: Input validation failed
- `DATABASE_ERROR`: Database operation failed
- `CACHE_ERROR`: Cache operation failed
- `WEBSOCKET_ERROR`: WebSocket connection error

## Performance Optimization

### Caching Strategy
- Redis cache for frequently accessed data
- Cache invalidation on data updates
- TTL-based cache expiration
- Cache warming for popular samples

### Database Optimization
- Proper indexing for query performance
- Query optimization and analysis
- Connection pooling
- Read replicas for heavy queries

### Real-time Updates
- Efficient WebSocket message broadcasting
- Connection pooling and management
- Message queuing for high throughput
- Graceful connection handling

## Monitoring and Metrics

### Key Metrics
- Query response times
- Cache hit/miss rates
- WebSocket connection count
- Database query performance
- Error rates by endpoint

### Health Checks
- `/healthz`: Basic health check
- `/readyz`: Readiness check (database + cache)
- `/metrics`: Prometheus metrics

### Logging
- Request/response logging
- Performance metrics
- Error tracking
- WebSocket connection events
