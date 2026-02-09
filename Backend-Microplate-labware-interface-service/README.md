# Labware Interface Service

This service provides CSV file generation functionality for the Microplate AI system. It generates interface files from prediction results and stores them in Minio for download.

## Features

- Generate CSV interface files from sample summary data
- Store generated files in Minio object storage
- Track file generation status and history
- Provide download URLs for generated files
- Cleanup temporary files automatically

## API Endpoints

### Generate Interface File
```
POST /api/v1/labware/interface/generate
```

**Request Body:**
```json
{
  "sampleNo": "TEST002"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "sampleNo": "TEST002",
    "fileName": "interface_TEST002_1234567890.csv",
    "filePath": "interface-files/TEST002/interface_TEST002_1234567890.csv",
    "fileSize": 1024,
    "status": "delivered",
    "generatedAt": "2024-01-01T00:00:00.000Z",
    "downloadUrl": "https://minio.example.com/interface-file/..."
  }
}
```

### List Interface Files
```
GET /api/v1/labware/interface/files?sampleNo=TEST002
```

### Get Interface File Details
```
GET /api/v1/labware/interface/files/{id}
```

### Delete Interface File
```
DELETE /api/v1/labware/interface/files/{id}
```

## CSV Format

The generated CSV files follow the format specified in `interface_sample.csv`:

```csv
SAMPLE_NUMBER,TEST_NUMBER,REPORTED_NAME,ENTRY
TEST002,T001,1,0
TEST002,T001,2,5
TEST002,T001,3,0
...
TEST003,T001,total,40
TEST004,T001,MEAN,3.33
TEST005,T001,SD,5.37
TEST006,T001,CV,1.60963011
```

## Environment Variables

```bash
# Server Configuration
PORT=6405
NODE_ENV=development
HOST=0.0.0.0

# Database Configuration
DATABASE_URL="postgresql://microplate:microplate123@postgres:5432/microplate_db?schema=prediction_result"

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_ISSUER=microplate-auth-service
JWT_AUDIENCE=microplate-services

# CORS Configuration
CORS_ORIGIN=http://localhost:6410

# Minio Configuration
MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_USE_SSL=false
MINIO_BUCKET_INTERFACE=interface-file

# File Configuration
TEMP_DIR=/tmp/interface-files
MAX_FILE_SIZE=10485760
```

## Development

### Prerequisites
- Node.js 20+
- Yarn
- PostgreSQL
- Minio

### Setup
1. Install dependencies:
   ```bash
   yarn install
   ```

2. Copy environment file:
   ```bash
   cp env.example .env
   ```

3. Generate Prisma client:
   ```bash
   yarn prisma:generate
   ```

4. Run database migrations:
   ```bash
   yarn prisma:migrate
   ```

### Running the Service

#### Development
```bash
yarn dev
```

#### Production
```bash
yarn build
yarn start:prod
```

### Testing
```bash
yarn test
yarn test:watch
yarn test:coverage
```

## Docker

### Build
```bash
docker build -t labware-interface-service .
```

### Run
```bash
docker run -p 6405:6405 --env-file .env labware-interface-service
```

## Database Schema

The service uses the following main tables:

- `sample_summary` - Stores sample analysis results
- `interface_file` - Tracks generated interface files

## File Storage

Generated CSV files are stored in Minio with the following structure:
```
interface-file/
├── interface-files/
│   ├── TEST002/
│   │   └── interface_TEST002_1234567890.csv
│   └── TEST003/
│       └── interface_TEST003_1234567891.csv
```

## Error Handling

The service includes comprehensive error handling:
- Validation errors for invalid requests
- Database connection errors
- Minio storage errors
- File generation errors

## Monitoring

Health check endpoints:
- `GET /health` - Basic health check
- `GET /ready` - Readiness check (includes database connectivity)

## Security

- JWT authentication required for all endpoints
- Rate limiting (100 requests per 15 minutes per IP)
- CORS protection
- Input validation using Zod schemas

---

# Interface Service Integration Guide

This guide explains how other services can integrate with the Labware Interface Service to access InterfaceFile data.

## Overview

The Labware Interface Service is now the **single source of truth** for InterfaceFile data. Other services can access this data through:

1. **Shared API endpoints** (recommended)
2. **Client library** (for TypeScript services)
3. **Direct database queries** (if needed)

## Integration Methods

### 1. Shared API Endpoints (Recommended)

Use the shared API endpoints for read-only access to InterfaceFile data:

```bash
# Get all interface files
GET /api/v1/labware/shared/interface-files

# Get interface files with filters
GET /api/v1/labware/shared/interface-files?sampleNo=TEST002&status=delivered

# Get specific interface file
GET /api/v1/labware/shared/interface-files/{id}

# Get interface files by sample
GET /api/v1/labware/shared/interface-files/sample/{sampleNo}

# Get statistics
GET /api/v1/labware/shared/interface-files/statistics
```

### 2. Client Library (TypeScript Services)

For TypeScript services, use the provided client library:

```typescript
import { createInterfaceClient, defaultInterfaceClientConfig } from './clients/interface-client';

// Create client
const interfaceClient = createInterfaceClient({
  ...defaultInterfaceClientConfig,
  token: 'your-jwt-token',
});

// Get interface files
const files = await interfaceClient.getInterfaceFiles({
  sampleNo: 'TEST002',
  status: 'delivered',
  limit: 10
});

// Get specific file
const file = await interfaceClient.getInterfaceFile('file-id');

// Get files by sample
const sampleFiles = await interfaceClient.getInterfaceFilesBySample('TEST002');

// Get statistics
const stats = await interfaceClient.getStatistics();
```

### 3. Direct Database Access

If you need direct database access, you can query the `prediction_result.interface_file` table:

```sql
-- Get interface files
SELECT * FROM prediction_result.interface_file 
WHERE sample_no = 'TEST002' 
  AND status = 'delivered'
ORDER BY created_at DESC;

-- Get statistics
SELECT 
  status,
  COUNT(*) as count
FROM prediction_result.interface_file 
GROUP BY status;
```

## Service Integration Examples

### Result API Service Integration

```typescript
// In result-api-service
import { createInterfaceClient } from '@labware-interface/client';

class ResultService {
  private interfaceClient = createInterfaceClient({
    baseUrl: process.env.LABWARE_INTERFACE_SERVICE_URL,
    token: process.env.SERVICE_TOKEN,
  });

  async getSampleWithInterfaceFiles(sampleNo: string) {
    // Get sample data
    const sample = await this.getSample(sampleNo);
    
    // Get interface files
    const interfaceFiles = await this.interfaceClient.getInterfaceFilesBySample(sampleNo);
    
    return {
      ...sample,
      interfaceFiles,
    };
  }
}
```

### Prediction DB Service Integration

```typescript
// In prediction-db-service
import { createInterfaceClient } from '@labware-interface/client';

class PredictionService {
  private interfaceClient = createInterfaceClient({
    baseUrl: process.env.LABWARE_INTERFACE_SERVICE_URL,
    token: process.env.SERVICE_TOKEN,
  });

  async getPredictionWithInterfaceFiles(predictionId: string) {
    // Get prediction data
    const prediction = await this.getPrediction(predictionId);
    
    // Get interface files for the sample
    const interfaceFiles = await this.interfaceClient.getInterfaceFilesBySample(
      prediction.sampleNo
    );
    
    return {
      ...prediction,
      interfaceFiles,
    };
  }
}
```

## Environment Variables

Add these environment variables to your service:

```bash
# Labware Interface Service URL
LABWARE_INTERFACE_SERVICE_URL=http://labware-interface-service:6405

# Service token for authentication
SERVICE_TOKEN=your-service-jwt-token
```

## Error Handling

The client library provides proper error handling:

```typescript
try {
  const files = await interfaceClient.getInterfaceFiles();
  // Handle success
} catch (error) {
  if (error.response?.status === 404) {
    // Handle not found
  } else if (error.response?.status === 401) {
    // Handle unauthorized
  } else {
    // Handle other errors
    console.error('Interface service error:', error);
  }
}
```

## Migration from Direct Database Access

If you were previously accessing InterfaceFile data directly:

### Before (Direct Database)
```typescript
// OLD: Direct database access
const files = await prisma.interfaceFile.findMany({
  where: { sampleNo: 'TEST002' }
});
```

### After (Client Library)
```typescript
// NEW: Client library access
const files = await interfaceClient.getInterfaceFilesBySample('TEST002');
```

## Benefits

1. **Single Source of Truth**: All InterfaceFile data managed in one place
2. **Type Safety**: TypeScript client provides type safety
3. **Error Handling**: Consistent error handling across services
4. **Caching**: Client can implement caching strategies
5. **Monitoring**: Centralized logging and monitoring
6. **Versioning**: API versioning for backward compatibility

## Monitoring

Monitor the integration:

- **API Response Times**: Track shared endpoint performance
- **Error Rates**: Monitor 4xx/5xx responses
- **Usage Patterns**: Track which services use which endpoints
- **Data Consistency**: Ensure data integrity across services

## Troubleshooting

### Common Issues

1. **Authentication Errors**: Check JWT token validity
2. **Connection Timeouts**: Verify service URL and network connectivity
3. **Data Not Found**: Check if InterfaceFile exists and is accessible
4. **Permission Errors**: Ensure service has proper permissions

### Debug Mode

Enable debug logging:

```typescript
const interfaceClient = createInterfaceClient({
  ...config,
  debug: true, // Enable debug logging
});
```

## Support

For issues or questions:
1. Check the service logs
2. Verify API endpoint responses
3. Test with the provided test scripts
4. Contact the development team

---

# Sample Summary Integration Guide

This document explains how the Labware Interface Service integrates with SampleSummary data from the Result API Service.

## Overview

The Labware Interface Service needs access to `prediction_result.sample_summary` data to generate CSV files. Since this data is primarily managed by the Result API Service, we use a hybrid approach:

1. **Primary**: Call Result API Service to get SampleSummary data
2. **Fallback**: Direct database access if API is unavailable
3. **Caching**: Optional caching for performance

## Architecture

```
┌─────────────────────┐    API Call    ┌─────────────────────┐
│ labware-interface   │ ──────────────► │ result-api-service  │
│ service             │                │                     │
└─────────────────────┘                └─────────────────────┘
         │                                       │
         │ Direct DB Access (Fallback)          │
         ▼                                       ▼
┌─────────────────────────────────────────────────────────────┐
│                PostgreSQL Database                          │
│                prediction_result.sample_summary             │
└─────────────────────────────────────────────────────────────┘
```

## Implementation

### 1. Sample Summary Service

The `SampleSummaryService` handles communication with the Result API Service:

```typescript
// Get sample summary via API
const sampleSummary = await sampleSummaryService.getSampleSummary('TEST002');

// With fallback to direct database access
const sampleSummary = await sampleSummaryService.getSampleSummaryWithFallback('TEST002');
```

### 2. CSV Generation

The CSV service uses SampleSummary data to generate interface files:

```typescript
// In csv.service.ts
const sampleSummary = await this.sampleSummaryService.getSampleSummary(sampleNo);
const distribution = sampleSummary.summary.distribution;
const csvData = this.generateCsvData(sampleNo, distribution);
```

### 3. Error Handling

The service includes robust error handling:

- **API Unavailable**: Falls back to direct database access
- **Sample Not Found**: Returns appropriate error message
- **Network Timeout**: Retries with exponential backoff
- **Invalid Data**: Validates and transforms data

## Configuration

### Environment Variables

```bash
# Result API Service URL
RESULT_API_SERVICE_URL=http://result-api-service:6403

# Service authentication token
SERVICE_TOKEN=your-service-jwt-token

# Timeout settings
SAMPLE_SUMMARY_TIMEOUT=10000
```

### Service Configuration

```typescript
const sampleSummaryService = createSampleSummaryService({
  resultApiServiceUrl: process.env.RESULT_API_SERVICE_URL,
  token: process.env.SERVICE_TOKEN,
  timeout: parseInt(process.env.SAMPLE_SUMMARY_TIMEOUT || '10000'),
});
```

## Data Flow

### 1. Generate Interface File Request

```
1. User requests interface file generation
2. labware-interface-service receives request
3. Service calls result-api-service for SampleSummary
4. If API fails, falls back to direct database access
5. Service generates CSV from SampleSummary data
6. Service uploads CSV to Minio
7. Service returns download URL
```

### 2. Sample Summary Data Structure

```typescript
interface SampleSummaryData {
  sampleNo: string;
  summary: {
    distribution: {
      positive: number;
      negative: number;
      invalid: number;
    };
    concentration?: {
      positive_percentage: number;
      negative_percentage: number;
    };
    quality_metrics?: {
      average_confidence: number;
      high_confidence_percentage: number;
    };
  };
  totalRuns: number;
  lastRunAt: Date | null;
  lastRunId: number | null;
  createdAt: Date;
  updatedAt: Date;
}
```

## API Endpoints

### Result API Service Endpoints

The labware-interface-service calls these endpoints:

```bash
# Get sample summary
GET /api/v1/result/samples/{sampleNo}/summary

# Response
{
  "success": true,
  "data": {
    "sampleNo": "TEST002",
    "summary": {
      "distribution": {
        "positive": 37,
        "negative": 59,
        "invalid": 0
      }
    },
    "totalRuns": 5,
    "lastRunAt": "2024-01-01T00:00:00.000Z",
    "lastRunId": 123,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

## Fallback Strategy

### 1. API First Approach

```typescript
try {
  // Try API first
  const sampleSummary = await this.sampleSummaryService.getSampleSummary(sampleNo);
} catch (apiError) {
  // Fallback to direct database access
  const dbSummary = await prisma.sampleSummary.findUnique({
    where: { sampleNo },
  });
}
```

### 2. Benefits of Fallback

- **Resilience**: Service continues working if Result API is down
- **Performance**: Direct database access can be faster
- **Independence**: Reduces dependency on external services
- **Reliability**: Ensures interface file generation always works

## Monitoring

### Key Metrics

1. **API Success Rate**: Percentage of successful API calls
2. **Fallback Usage**: How often fallback is used
3. **Response Times**: API vs database response times
4. **Error Rates**: API errors vs database errors

### Logging

```typescript
// API call success
console.log('Sample summary retrieved via API:', { sampleNo, responseTime });

// Fallback usage
console.warn('API call failed, using database fallback:', { sampleNo, error });

// Error logging
console.error('Failed to get sample summary:', { sampleNo, error });
```

## Testing

### Unit Tests

```typescript
describe('SampleSummaryService', () => {
  it('should get sample summary via API', async () => {
    const service = createSampleSummaryService(mockConfig);
    const result = await service.getSampleSummary('TEST002');
    expect(result.sampleNo).toBe('TEST002');
  });

  it('should fallback to database when API fails', async () => {
    // Mock API failure
    mockApiCall.mockRejectedValue(new Error('API Error'));
    
    const service = createSampleSummaryService(mockConfig);
    const result = await service.getSampleSummaryWithFallback('TEST002');
    expect(result.sampleNo).toBe('TEST002');
  });
});
```

### Integration Tests

```typescript
describe('CSV Generation Integration', () => {
  it('should generate CSV with sample summary data', async () => {
    const csvService = new CsvService();
    const result = await csvService.generateInterfaceFile('TEST002');
    
    expect(result.fileName).toContain('TEST002');
    expect(result.fileSize).toBeGreaterThan(0);
  });
});
```

## Troubleshooting

### Common Issues

1. **API Timeout**: Increase timeout or check network connectivity
2. **Authentication Error**: Verify SERVICE_TOKEN is valid
3. **Sample Not Found**: Check if sample exists in database
4. **Data Format Error**: Validate SampleSummary data structure

### Debug Mode

```typescript
// Enable debug logging
const sampleSummaryService = createSampleSummaryService({
  ...config,
  debug: true,
});
```

## Performance Optimization

### 1. Caching

```typescript
// Add caching layer
const cachedSummary = await cache.get(`sample:${sampleNo}:summary`);
if (cachedSummary) {
  return cachedSummary;
}

const summary = await this.sampleSummaryService.getSampleSummary(sampleNo);
await cache.set(`sample:${sampleNo}:summary`, summary, 300); // 5 minutes
```

### 2. Connection Pooling

```typescript
// Configure database connection pool
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // Connection pool settings
  __internal: {
    engine: {
      connectionLimit: 10,
    },
  },
});
```

## Security

### 1. Service Authentication

- Use JWT tokens for service-to-service communication
- Implement token rotation
- Validate tokens on each request

### 2. Data Access

- Limit database access to necessary tables
- Use read-only connections where possible
- Implement proper error handling to prevent data leaks

## Future Improvements

1. **Caching Layer**: Add Redis caching for SampleSummary data
2. **Event-Driven**: Use message queues for real-time updates
3. **GraphQL**: Consider GraphQL for more efficient data fetching
4. **Monitoring**: Add comprehensive monitoring and alerting
5. **Testing**: Expand test coverage for edge cases

---

# InterfaceFile Schema Consolidation

## Overview

The `InterfaceFile` model has been consolidated from multiple services into the `labware-interface-service` to follow the Single Responsibility Principle and eliminate code duplication.

## Changes Made

### ✅ Removed InterfaceFile from:
- `result-api-service/prisma/schema.prisma`
- `prediction-db-service/prisma/schema.prisma`

### ✅ Kept InterfaceFile in:
- `labware-interface-service/prisma/schema.prisma` (primary owner)

## Database Schema

The `interface_file` table remains in the `prediction_result` schema and is accessible by all services that connect to the same database.

### Table Structure
```sql
CREATE TABLE prediction_result.interface_file (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sample_no TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT,
    status TEXT NOT NULL DEFAULT 'pending',
    generated_at TIMESTAMP(3),
    delivered_at TIMESTAMP(3),
    error_msg TEXT,
    created_by UUID,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_interface_file_sample_no ON prediction_result.interface_file(sample_no);
CREATE INDEX idx_interface_file_status ON prediction_result.interface_file(status);
```

## Service Responsibilities

### labware-interface-service
- **Primary owner** of InterfaceFile model
- Manages all CRUD operations
- Generates CSV files
- Uploads to Minio storage
- Provides API endpoints for file management

### Other Services
- Can access data through direct SQL queries if needed
- Should not have Prisma models for InterfaceFile
- Can call labware-interface-service API for file operations

## Migration Steps

1. **Deploy labware-interface-service** with the InterfaceFile model
2. **Run migration script** to verify database structure
3. **Update other services** to remove InterfaceFile references
4. **Test functionality** to ensure everything works correctly

## API Endpoints

The labware-interface-service provides these endpoints:

```
POST   /api/v1/labware/interface/generate    # Generate CSV file
GET    /api/v1/labware/interface/files       # List files
GET    /api/v1/labware/interface/files/:id   # Get file details
DELETE /api/v1/labware/interface/files/:id   # Delete file
```

## Benefits

1. **Single Source of Truth**: Only one service manages InterfaceFile
2. **Reduced Duplication**: No more duplicate model definitions
3. **Clear Responsibilities**: Each service has a focused purpose
4. **Easier Maintenance**: Changes only need to be made in one place
5. **Better Testing**: Interface file logic is centralized

## Rollback Plan

If issues arise:
1. Restore InterfaceFile model to other services
2. Revert database changes
3. Investigate and fix issues
4. Re-run migration when ready

## Monitoring

After deployment, monitor:
- Interface file generation success rate
- API response times
- Database query performance
- Error rates and logs