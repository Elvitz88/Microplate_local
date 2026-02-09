# Labware Interface Service - Complete Specification

## Overview

The Labware Interface Service handles CSV file generation and delivery for external labware systems. It transforms prediction results into standardized CSV formats and manages file delivery to shared folders.

## Technology Stack

- **Runtime**: Node.js 18+
- **Framework**: Fastify 4.x
- **Language**: TypeScript
- **ORM**: Prisma 5.x
- **Database**: PostgreSQL 17
- **CSV Processing**: csv-writer, csv-parser
- **File System**: fs-extra
- **Validation**: Zod
- **Documentation**: OpenAPI 3.0

## Service Architecture

```typescript
// Project structure
labware-interface-service/
├── src/
│   ├── config/
│   │   ├── database.ts
│   │   ├── storage.ts
│   │   └── csv.ts
│   ├── controllers/
│   │   ├── interface.controller.ts
│   │   └── file.controller.ts
│   ├── services/
│   │   ├── csv.service.ts
│   │   ├── file.service.ts
│   │   ├── delivery.service.ts
│   │   └── template.service.ts
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   └── validation.middleware.ts
│   ├── routes/
│   │   ├── interface.routes.ts
│   │   └── file.routes.ts
│   ├── schemas/
│   │   └── interface.schemas.ts
│   ├── templates/
│   │   ├── standard.csv.template
│   │   ├── detailed.csv.template
│   │   └── summary.csv.template
│   ├── utils/
│   │   ├── csv.util.ts
│   │   ├── file.util.ts
│   │   └── validation.util.ts
│   ├── types/
│   │   └── interface.types.ts
│   └── app.ts
├── prisma/
├── tests/
├── package.json
└── .env.example
```

## API Endpoints

### Interface Generation Endpoints

#### POST /api/v1/interface/generate
Generate CSV file for a specific sample.

**Request Body:**
```json
{
  "sample_no": "S123456",
  "format": "standard", // standard, detailed, summary
  "include_metadata": true,
  "delivery_options": {
    "delivery_method": "folder", // folder, email, api
    "folder_path": "/mnt/labshare/inbox",
    "email_address": "lab@example.com"
  },
  "options": {
    "include_confidence": true,
    "include_bbox": false,
    "date_format": "ISO8601",
    "decimal_places": 2
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "file_id": "uuid",
    "sample_no": "S123456",
    "file_name": "S123456_20240115_103000.csv",
    "file_path": "/mnt/labshare/inbox/S123456_20240115_103000.csv",
    "file_size": 2048,
    "format": "standard",
    "status": "generated",
    "generated_at": "2024-01-15T10:30:00Z",
    "delivery_status": "pending",
    "download_url": "https://api.example.com/api/v1/interface/files/uuid/download"
  }
}
```

#### GET /api/v1/interface/files/:fileId
Get file information and status.

**Response:**
```json
{
  "success": true,
  "data": {
    "file_id": "uuid",
    "sample_no": "S123456",
    "file_name": "S123456_20240115_103000.csv",
    "file_path": "/mnt/labshare/inbox/S123456_20240115_103000.csv",
    "file_size": 2048,
    "format": "standard",
    "status": "delivered",
    "generated_at": "2024-01-15T10:30:00Z",
    "delivered_at": "2024-01-15T10:30:05Z",
    "delivery_method": "folder",
    "download_url": "https://api.example.com/api/v1/interface/files/uuid/download"
  }
}
```

#### GET /api/v1/interface/files/:fileId/download
Download the generated CSV file.

**Response:**
```
Content-Type: text/csv
Content-Disposition: attachment; filename="S123456_20240115_103000.csv"

sample_no,well,label,class,confidence,detection_time
S123456,A1,positive,positive,0.95,2024-01-15T10:30:00Z
S123456,A2,negative,negative,0.87,2024-01-15T10:30:00Z
...
```

#### GET /api/v1/interface/samples/:sampleNo/files
Get all generated files for a specific sample.

**Query Parameters:**
- `format`: Filter by format
- `status`: Filter by status
- `limit`: Number of files to return (default: 10)
- `offset`: Number of files to skip (default: 0)

**Response:**
```json
{
  "success": true,
  "data": {
    "files": [
      {
        "file_id": "uuid",
        "file_name": "S123456_20240115_103000.csv",
        "format": "standard",
        "status": "delivered",
        "generated_at": "2024-01-15T10:30:00Z",
        "file_size": 2048
      }
    ],
    "sample_no": "S123456",
    "total_count": 1
  }
}
```

#### DELETE /api/v1/interface/files/:fileId
Delete a generated file.

**Response:**
```json
{
  "success": true,
  "message": "File deleted successfully"
}
```

### Template Management Endpoints

#### GET /api/v1/interface/templates
Get available CSV templates.

**Response:**
```json
{
  "success": true,
  "data": {
    "templates": [
      {
        "name": "standard",
        "description": "Standard format with basic detection data",
        "fields": [
          "sample_no",
          "well",
          "label",
          "class",
          "confidence",
          "detection_time"
        ],
        "is_default": true
      },
      {
        "name": "detailed",
        "description": "Detailed format with bounding box coordinates",
        "fields": [
          "sample_no",
          "well",
          "label",
          "class",
          "confidence",
          "xmin",
          "ymin",
          "xmax",
          "ymax",
          "detection_time"
        ],
        "is_default": false
      }
    ]
  }
}
```

#### POST /api/v1/interface/templates
Create a new CSV template (admin only).

**Request Body:**
```json
{
  "name": "custom",
  "description": "Custom template for specific labware",
  "fields": [
    "sample_no",
    "well",
    "result",
    "confidence_score"
  ],
  "template_content": "sample_no,well,result,confidence_score\n{{sample_no}},{{well}},{{class}},{{confidence}}"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "template_id": "uuid",
    "name": "custom",
    "description": "Custom template for specific labware",
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

## CSV Format Specifications

### Standard Format
```csv
sample_no,well,label,class,confidence,detection_time
S123456,A1,positive,positive,0.95,2024-01-15T10:30:00Z
S123456,A2,negative,negative,0.87,2024-01-15T10:30:00Z
S123456,A3,positive,positive,0.92,2024-01-15T10:30:00Z
```

### Detailed Format
```csv
sample_no,well,label,class,confidence,xmin,ymin,xmax,ymax,detection_time
S123456,A1,positive,positive,0.95,12,34,56,78,2024-01-15T10:30:00Z
S123456,A2,negative,negative,0.87,15,38,59,82,2024-01-15T10:30:00Z
S123456,A3,positive,positive,0.92,18,42,62,86,2024-01-15T10:30:00Z
```

### Summary Format
```csv
sample_no,total_wells,positive_count,negative_count,invalid_count,positive_percentage,negative_percentage,analysis_time
S123456,96,37,59,0,38.54,61.46,2024-01-15T10:30:00Z
```

## Implementation Details

### CSV Service
```typescript
export class CsvService {
  constructor(
    private prisma: PrismaClient,
    private fileService: FileService,
    private templateService: TemplateService
  ) {}

  async generateCsv(
    sampleNo: string,
    format: string,
    options: CsvGenerationOptions
  ): Promise<CsvFile> {
    // Get sample data
    const sampleData = await this.getSampleData(sampleNo);
    
    // Get template
    const template = await this.templateService.getTemplate(format);
    
    // Generate CSV content
    const csvContent = await this.generateCsvContent(sampleData, template, options);
    
    // Save file
    const fileName = this.generateFileName(sampleNo, format);
    const filePath = await this.fileService.saveFile(fileName, csvContent);
    
    // Create database record
    const fileRecord = await this.prisma.interfaceFile.create({
      data: {
        sampleNo,
        fileName,
        filePath,
        fileSize: csvContent.length,
        status: 'generated'
      }
    });

    // Deliver file if requested
    if (options.deliveryOptions) {
      await this.deliverFile(fileRecord, options.deliveryOptions);
    }

    return fileRecord;
  }

  private async generateCsvContent(
    sampleData: SampleData,
    template: CsvTemplate,
    options: CsvGenerationOptions
  ): Promise<string> {
    const rows: any[] = [];

    if (template.name === 'standard') {
      for (const prediction of sampleData.wellPredictions) {
        rows.push({
          sample_no: sampleData.sampleNo,
          well: prediction.wellId,
          label: prediction.label,
          class: prediction.class_,
          confidence: options.includeConfidence ? prediction.confidence : null,
          detection_time: this.formatDate(prediction.createdAt, options.dateFormat)
        });
      }
    } else if (template.name === 'detailed') {
      for (const prediction of sampleData.wellPredictions) {
        rows.push({
          sample_no: sampleData.sampleNo,
          well: prediction.wellId,
          label: prediction.label,
          class: prediction.class_,
          confidence: prediction.confidence,
          xmin: prediction.bbox.xmin,
          ymin: prediction.bbox.ymin,
          xmax: prediction.bbox.xmax,
          ymax: prediction.bbox.ymax,
          detection_time: this.formatDate(prediction.createdAt, options.dateFormat)
        });
      }
    } else if (template.name === 'summary') {
      const summary = sampleData.summary;
      rows.push({
        sample_no: sampleData.sampleNo,
        total_wells: sampleData.totalWells,
        positive_count: summary.distribution.positive,
        negative_count: summary.distribution.negative,
        invalid_count: summary.distribution.invalid || 0,
        positive_percentage: summary.concentration.positive_percentage,
        negative_percentage: summary.concentration.negative_percentage,
        analysis_time: this.formatDate(sampleData.lastRunAt, options.dateFormat)
      });
    }

    return this.convertToCsv(rows, template.fields);
  }

  private convertToCsv(rows: any[], fields: string[]): string {
    const csvWriter = createCsvWriter({
      path: '', // We'll return the content directly
      header: fields.map(field => ({ id: field, title: field }))
    });

    return csvWriter.stringifyRecords(rows);
  }
}
```

### File Service
```typescript
export class FileService {
  constructor(private config: FileConfig) {}

  async saveFile(fileName: string, content: string): Promise<string> {
    const filePath = path.join(this.config.outputDirectory, fileName);
    
    // Ensure directory exists
    await fs.ensureDir(path.dirname(filePath));
    
    // Write file
    await fs.writeFile(filePath, content, 'utf8');
    
    return filePath;
  }

  async deleteFile(filePath: string): Promise<void> {
    if (await fs.pathExists(filePath)) {
      await fs.remove(filePath);
    }
  }

  async getFileContent(filePath: string): Promise<string> {
    return fs.readFile(filePath, 'utf8');
  }

  async getFileStats(filePath: string): Promise<fs.Stats> {
    return fs.stat(filePath);
  }

  private generateFileName(sampleNo: string, format: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `${sampleNo}_${timestamp}.csv`;
  }
}
```

### Delivery Service
```typescript
export class DeliveryService {
  constructor(
    private fileService: FileService,
    private emailService: EmailService
  ) {}

  async deliverFile(
    file: InterfaceFile,
    options: DeliveryOptions
  ): Promise<void> {
    switch (options.deliveryMethod) {
      case 'folder':
        await this.deliverToFolder(file, options.folderPath);
        break;
      case 'email':
        await this.deliverToEmail(file, options.emailAddress);
        break;
      case 'api':
        await this.deliverToApi(file, options.apiEndpoint);
        break;
      default:
        throw new Error(`Unsupported delivery method: ${options.deliveryMethod}`);
    }
  }

  private async deliverToFolder(file: InterfaceFile, folderPath: string): Promise<void> {
    const sourcePath = file.filePath;
    const targetPath = path.join(folderPath, file.fileName);
    
    // Ensure target directory exists
    await fs.ensureDir(folderPath);
    
    // Copy file to target location
    await fs.copy(sourcePath, targetPath);
    
    // Update file status
    await this.updateFileStatus(file.id, 'delivered');
  }

  private async deliverToEmail(file: InterfaceFile, emailAddress: string): Promise<void> {
    const fileContent = await this.fileService.getFileContent(file.filePath);
    
    await this.emailService.sendEmail({
      to: emailAddress,
      subject: `Microplate Analysis Results - ${file.sampleNo}`,
      attachments: [{
        filename: file.fileName,
        content: fileContent,
        contentType: 'text/csv'
      }]
    });
    
    await this.updateFileStatus(file.id, 'delivered');
  }

  private async deliverToApi(file: InterfaceFile, apiEndpoint: string): Promise<void> {
    const fileContent = await this.fileService.getFileContent(file.filePath);
    
    await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.API_TOKEN}`
      },
      body: JSON.stringify({
        sample_no: file.sampleNo,
        file_name: file.fileName,
        content: fileContent,
        format: 'csv'
      })
    });
    
    await this.updateFileStatus(file.id, 'delivered');
  }
}
```

### Template Service
```typescript
export class TemplateService {
  private templates: Map<string, CsvTemplate> = new Map();

  constructor() {
    this.loadDefaultTemplates();
  }

  private loadDefaultTemplates(): void {
    // Standard template
    this.templates.set('standard', {
      name: 'standard',
      description: 'Standard format with basic detection data',
      fields: ['sample_no', 'well', 'label', 'class', 'confidence', 'detection_time'],
      template: 'standard.csv.template'
    });

    // Detailed template
    this.templates.set('detailed', {
      name: 'detailed',
      description: 'Detailed format with bounding box coordinates',
      fields: ['sample_no', 'well', 'label', 'class', 'confidence', 'xmin', 'ymin', 'xmax', 'ymax', 'detection_time'],
      template: 'detailed.csv.template'
    });

    // Summary template
    this.templates.set('summary', {
      name: 'summary',
      description: 'Summary format with aggregated data',
      fields: ['sample_no', 'total_wells', 'positive_count', 'negative_count', 'invalid_count', 'positive_percentage', 'negative_percentage', 'analysis_time'],
      template: 'summary.csv.template'
    });
  }

  async getTemplate(name: string): Promise<CsvTemplate> {
    const template = this.templates.get(name);
    if (!template) {
      throw new Error(`Template not found: ${name}`);
    }
    return template;
  }

  async getAllTemplates(): Promise<CsvTemplate[]> {
    return Array.from(this.templates.values());
  }

  async createTemplate(template: CsvTemplate): Promise<void> {
    this.templates.set(template.name, template);
  }
}
```

## Environment Configuration

```bash
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/microplates"

# Application
NODE_ENV="development"
PORT=6403
API_BASE_URL="http://localhost:6400"

# File Storage
OUTPUT_DIRECTORY="/app/generated"
TEMP_DIRECTORY="/app/temp"
MAX_FILE_SIZE="10MB"
FILE_RETENTION_DAYS=30

# Delivery Options
DEFAULT_DELIVERY_METHOD="folder"
DEFAULT_FOLDER_PATH="/mnt/labshare/inbox"
EMAIL_SERVICE_URL="http://email-service:6407"
API_DELIVERY_ENDPOINT="https://labware.example.com/api/import"

# CSV Configuration
CSV_ENCODING="utf8"
CSV_DELIMITER=","
CSV_QUOTE_CHAR='"'
CSV_ESCAPE_CHAR="\\"
DATE_FORMAT="ISO8601"
DECIMAL_PLACES=2

# Cleanup
CLEANUP_INTERVAL="0 2 * * *" # Daily at 2 AM
CLEANUP_BATCH_SIZE=100
```

## Error Handling

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "TEMPLATE_NOT_FOUND",
    "message": "CSV template not found",
    "details": {
      "template_name": "custom"
    },
    "requestId": "uuid",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### Common Error Codes
- `SAMPLE_NOT_FOUND`: Sample does not exist
- `TEMPLATE_NOT_FOUND`: CSV template not found
- `FILE_GENERATION_FAILED`: CSV file generation failed
- `DELIVERY_FAILED`: File delivery failed
- `FILE_NOT_FOUND`: Generated file not found
- `VALIDATION_ERROR`: Input validation failed
- `PERMISSION_ERROR`: Insufficient permissions

## Performance Optimization

### File Management
- Asynchronous file operations
- File compression for large datasets
- Batch processing for multiple samples
- Cleanup of old files

### CSV Generation
- Streaming for large datasets
- Memory-efficient processing
- Template caching
- Parallel processing

### Delivery Optimization
- Queue-based delivery system
- Retry mechanisms for failed deliveries
- Delivery status tracking
- Error notification system

## Monitoring and Metrics

### Key Metrics
- Files generated per day
- Delivery success rates
- File generation time
- Storage usage
- Error rates by operation

### Health Checks
- `/healthz`: Basic health check
- `/readyz`: Readiness check (database + storage)
- `/metrics`: Prometheus metrics

### Logging
- File generation events
- Delivery attempts and results
- Error tracking
- Performance metrics
