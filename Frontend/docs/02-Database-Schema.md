# Database Schema Design

## Overview

This document defines the complete database schema for the Microplate AI System using PostgreSQL 17 with multiple schemas for better organization and security.

## Schema Organization

- **`auth`**: Authentication and user management
- **`microplates`**: Core business data and predictions
- **`public`**: Shared utilities and system tables

## Complete Prisma Schema

```prisma
// schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  schemas  = ["public", "auth", "microplates"]
}

// =========================
// AUTH SCHEMA
// =========================

model User {
  id                    String   @id @default(uuid()) @db.Uuid
  email                 String   @unique
  username              String   @unique
  password              String
  firstName             String?
  lastName              String?
  isActive              Boolean  @default(true)
  emailVerified         Boolean  @default(false)
  lastLoginAt           DateTime?
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  
  // Relations
  roles                 UserRole[]
  refreshTokens         RefreshToken[]
  passwordResetTokens   PasswordResetToken[]
  emailVerificationTokens EmailVerificationToken[]
  auditLogs             AuditLog[]
  
  @@map("users")
  @@schema("auth")
}

model Role {
  id          Int       @id @default(autoincrement())
  name        String    @unique
  description String?
  permissions String[]  // Array of permission strings
  isActive    Boolean   @default(true)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  
  // Relations
  users       UserRole[]
  
  @@map("roles")
  @@schema("auth")
}

model UserRole {
  userId    String @db.Uuid
  roleId    Int
  assignedAt DateTime @default(now())
  assignedBy String? @db.Uuid
  
  // Relations
  user      User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  role      Role   @relation(fields: [roleId], references: [id], onDelete: Cascade)
  
  @@id([userId, roleId])
  @@map("user_roles")
  @@schema("auth")
}

model RefreshToken {
  id           String   @id @default(uuid()) @db.Uuid
  userId       String   @db.Uuid
  token        String   @unique
  family       String   // For token rotation
  deviceInfo   String?  // Device fingerprint
  ipAddress    String?
  userAgent    String?
  issuedAt     DateTime @default(now())
  expiresAt    DateTime
  revokedAt    DateTime?
  revokedBy    String?  @db.Uuid
  reused       Boolean  @default(false)
  
  // Relations
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@map("refresh_tokens")
  @@schema("auth")
}

model PasswordResetToken {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String   @db.Uuid
  token     String   @unique
  expiresAt DateTime
  usedAt    DateTime?
  ipAddress String?
  userAgent String?
  createdAt DateTime @default(now())
  
  // Relations
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@map("password_reset_tokens")
  @@schema("auth")
}

model EmailVerificationToken {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String   @db.Uuid
  token     String   @unique
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime @default(now())
  
  // Relations
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@map("email_verification_tokens")
  @@schema("auth")
}

model AuditLog {
  id          String   @id @default(uuid()) @db.Uuid
  userId      String?  @db.Uuid
  action      String   // LOGIN, LOGOUT, CREATE, UPDATE, DELETE, etc.
  resource    String?  // Table or resource name
  resourceId  String?  // ID of the affected resource
  details     Json?    // Additional details
  ipAddress   String?
  userAgent   String?
  createdAt   DateTime @default(now())
  
  // Relations
  user        User?    @relation(fields: [userId], references: [id])
  
  @@map("audit_logs")
  @@schema("auth")
}

// =========================
// MICROPLATES SCHEMA
// =========================

model PredictionRun {
  id                   Int       @id @default(autoincrement())
  sampleNo             String    @map("sample_no")
  submissionNo         String?   @map("submission_no")
  description          String?
  predictAt            DateTime  @default(now()) @map("predict_at")
  annotatedImagePath   String?   @map("annotated_image_path")
  rawImagePath         String?   @map("raw_image_path")
  modelVersion         String?   @map("model_version")
  status               String    @default("pending") // pending, processing, completed, failed
  errorMsg             String?   @map("error_msg")
  processingTimeMs     Int?      @map("processing_time_ms")
  confidenceThreshold  Float?    @map("confidence_threshold")
  createdBy            String?   @db.Uuid @map("created_by")
  createdAt            DateTime  @default(now()) @map("created_at")
  updatedAt            DateTime  @updatedAt @map("updated_at")
  
  // Relations
  rowCounts            RowCounts[]
  interfaceResults     InterfaceResults[]
  wellPredictions      WellPrediction[]
  imageFiles           ImageFile[]
  
  @@map("prediction_run")
  @@schema("microplates")
  @@index([sampleNo])
  @@index([predictAt])
  @@index([status])
}

model RowCounts {
  id        Int      @id @default(autoincrement())
  runId     Int      @map("run_id")
  counts    Json     @map("counts") // {"positive": 37, "negative": 59, "invalid": 0}
  createdAt DateTime @default(now()) @map("created_at")
  
  // Relations
  run       PredictionRun @relation(fields: [runId], references: [id], onDelete: Cascade)
  
  @@map("row_counts")
  @@schema("microplates")
  @@index([runId])
}

model InterfaceResults {
  id        Int      @id @default(autoincrement())
  runId     Int      @map("run_id")
  results   Json     @map("results") // Complete analysis results
  createdAt DateTime @default(now()) @map("created_at")
  
  // Relations
  run       PredictionRun @relation(fields: [runId], references: [id], onDelete: Cascade)
  
  @@map("interface_results")
  @@schema("microplates")
  @@index([runId])
}

model WellPrediction {
  id         Int      @id @default(autoincrement())
  runId      Int      @map("run_id")
  wellId     String   @map("well_id") // A1, B2, etc.
  label      String   @map("label")
  class_     String   @map("class")
  confidence Float    @map("confidence")
  bbox       Json     @map("bbox") // {"xmin": 12, "ymin": 34, "xmax": 56, "ymax": 78}
  createdAt  DateTime @default(now()) @map("created_at")
  
  // Relations
  run        PredictionRun @relation(fields: [runId], references: [id], onDelete: Cascade)
  
  @@map("well_prediction")
  @@schema("microplates")
  @@index([runId])
  @@index([wellId])
  @@index([class_])
}

model ImageFile {
  id           Int      @id @default(autoincrement())
  runId        Int      @map("run_id")
  sampleNo     String   @map("sample_no")
  fileType     String   @map("file_type") // raw, annotated, thumbnail
  fileName     String   @map("file_name")
  filePath     String   @map("file_path")
  fileSize     BigInt?  @map("file_size")
  mimeType     String?  @map("mime_type")
  width        Int?
  height       Int?
  bucketName   String?  @map("bucket_name")
  objectKey    String?  @map("object_key")
  signedUrl    String?  @map("signed_url")
  urlExpiresAt DateTime? @map("url_expires_at")
  createdAt    DateTime @default(now()) @map("created_at")
  
  // Relations
  run          PredictionRun @relation(fields: [runId], references: [id], onDelete: Cascade)
  
  @@map("image_file")
  @@schema("microplates")
  @@index([runId])
  @@index([sampleNo])
  @@index([fileType])
}

model SampleSummary {
  sampleNo     String @id @map("sample_no")
  summary      Json   @map("summary") // {"distribution": {"positive": 37, "negative": 59}}
  totalRuns    Int    @default(0) @map("total_runs")
  lastRunAt    DateTime? @map("last_run_at")
  lastRunId    Int?    @map("last_run_id")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")
  
  @@map("sample_summary")
  @@schema("microplates")
  @@index([lastRunAt])
}

model InterfaceFile {
  id           String   @id @default(uuid()) @db.Uuid
  sampleNo     String   @map("sample_no")
  fileName     String   @map("file_name")
  filePath     String   @map("file_path")
  fileSize     BigInt?  @map("file_size")
  status       String   @default("pending") // pending, generated, delivered, failed
  generatedAt  DateTime? @map("generated_at")
  deliveredAt  DateTime? @map("delivered_at")
  errorMsg     String?  @map("error_msg")
  createdBy    String?  @db.Uuid @map("created_by")
  createdAt    DateTime @default(now()) @map("created_at")
  
  @@map("interface_file")
  @@schema("microplates")
  @@index([sampleNo])
  @@index([status])
}

model SystemConfig {
  id          String   @id @default(uuid()) @db.Uuid
  key         String   @unique
  value       Json
  description String?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@map("system_config")
  @@schema("microplates")
}

// =========================
// PUBLIC SCHEMA (Utilities)
// =========================

model HealthCheck {
  id        String   @id @default(uuid()) @db.Uuid
  service   String
  status    String   // healthy, unhealthy, degraded
  message   String?
  timestamp DateTime @default(now())
  
  @@map("health_checks")
  @@schema("public")
  @@index([service])
  @@index([timestamp])
}
```

## Database Views

```sql
-- View for easy access to interface data
CREATE OR REPLACE VIEW microplates.interface_data AS
SELECT
  sample_no,
  summary->'distribution' AS distribution,
  total_runs,
  last_run_at,
  last_run_id
FROM microplates.sample_summary;

-- View for prediction run details with image URLs
CREATE OR REPLACE VIEW microplates.prediction_run_details AS
SELECT
  pr.*,
  raw_img.signed_url AS raw_image_url,
  raw_img.url_expires_at AS raw_image_expires_at,
  ann_img.signed_url AS annotated_image_url,
  ann_img.url_expires_at AS annotated_image_expires_at
FROM microplates.prediction_run pr
LEFT JOIN microplates.image_file raw_img 
  ON pr.id = raw_img.run_id AND raw_img.file_type = 'raw'
LEFT JOIN microplates.image_file ann_img 
  ON pr.id = ann_img.run_id AND ann_img.file_type = 'annotated';
```

## Database Functions and Triggers

```sql
-- Function to update sample summary when interface results change
CREATE OR REPLACE FUNCTION microplates.fn_upsert_sample_summary()
RETURNS TRIGGER AS $$
DECLARE
  s_no TEXT;
  dist JSONB;
  run_count INTEGER;
  last_run_time TIMESTAMPTZ;
  last_run_id INTEGER;
BEGIN
  -- Get sample_no from run_id
  SELECT pr.sample_no
    INTO s_no
  FROM microplates.prediction_run pr
  WHERE pr.id = NEW.run_id
  LIMIT 1;

  -- Calculate distribution from all interface_results for this sample
  SELECT jsonb_object_agg(key, total)
    INTO dist
  FROM (
    SELECT
      t.key,
      SUM((t.value::text)::int) AS total
    FROM microplates.interface_results ir
    JOIN microplates.prediction_run pr2
      ON pr2.id = ir.run_id
    CROSS JOIN LATERAL
      jsonb_each(ir.results->'distribution') AS t(key, value)
    WHERE pr2.sample_no = s_no
    GROUP BY t.key
  ) sub;

  -- Get run count and last run info
  SELECT 
    COUNT(*),
    MAX(pr.predict_at),
    MAX(pr.id)
  INTO run_count, last_run_time, last_run_id
  FROM microplates.prediction_run pr
  WHERE pr.sample_no = s_no;

  -- Upsert sample_summary
  INSERT INTO microplates.sample_summary(
    sample_no, 
    summary, 
    total_runs, 
    last_run_at, 
    last_run_id
  )
  VALUES (
    s_no,
    jsonb_build_object('distribution', COALESCE(dist, '{}'::jsonb)),
    run_count,
    last_run_time,
    last_run_id
  )
  ON CONFLICT (sample_no) DO UPDATE
    SET 
      summary = EXCLUDED.summary,
      total_runs = EXCLUDED.total_runs,
      last_run_at = EXCLUDED.last_run_at,
      last_run_id = EXCLUDED.last_run_id,
      updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update sample summary
CREATE TRIGGER trg_upsert_sample_summary
AFTER INSERT OR UPDATE ON microplates.interface_results
FOR EACH ROW EXECUTE FUNCTION microplates.fn_upsert_sample_summary();

-- Function to notify workers about new interface results
CREATE OR REPLACE FUNCTION microplates.fn_notify_interface_results()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify('interface_results_new', NEW.run_id::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to notify workers
CREATE TRIGGER trg_notify_interface_results
AFTER INSERT ON microplates.interface_results
FOR EACH ROW EXECUTE FUNCTION microplates.fn_notify_interface_results();
```

## Indexes for Performance

```sql
-- Auth schema indexes
CREATE INDEX idx_users_email ON auth.users(email);
CREATE INDEX idx_users_username ON auth.users(username);
CREATE INDEX idx_users_is_active ON auth.users(is_active);
CREATE INDEX idx_refresh_tokens_user_id ON auth.refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token ON auth.refresh_tokens(token);
CREATE INDEX idx_refresh_tokens_family ON auth.refresh_tokens(family);
CREATE INDEX idx_audit_logs_user_id ON auth.audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON auth.audit_logs(created_at);

-- Microplates schema indexes
CREATE INDEX idx_prediction_run_sample_no ON microplates.prediction_run(sample_no);
CREATE INDEX idx_prediction_run_predict_at ON microplates.prediction_run(predict_at);
CREATE INDEX idx_prediction_run_status ON microplates.prediction_run(status);
CREATE INDEX idx_prediction_run_created_by ON microplates.prediction_run(created_by);

CREATE INDEX idx_row_counts_run_id ON microplates.row_counts(run_id);
CREATE INDEX idx_interface_results_run_id ON microplates.interface_results(run_id);
CREATE INDEX idx_well_prediction_run_id ON microplates.well_prediction(run_id);
CREATE INDEX idx_well_prediction_well_id ON microplates.well_prediction(well_id);
CREATE INDEX idx_well_prediction_class ON microplates.well_prediction(class_);

CREATE INDEX idx_image_file_run_id ON microplates.image_file(run_id);
CREATE INDEX idx_image_file_sample_no ON microplates.image_file(sample_no);
CREATE INDEX idx_image_file_file_type ON microplates.image_file(file_type);

CREATE INDEX idx_sample_summary_last_run_at ON microplates.sample_summary(last_run_at);
CREATE INDEX idx_interface_file_sample_no ON microplates.interface_file(sample_no);
CREATE INDEX idx_interface_file_status ON microplates.interface_file(status);

-- GIN indexes for JSONB columns
CREATE INDEX idx_row_counts_counts_gin ON microplates.row_counts USING GIN (counts jsonb_path_ops);
CREATE INDEX idx_interface_results_results_gin ON microplates.interface_results USING GIN (results jsonb_path_ops);
CREATE INDEX idx_well_prediction_bbox_gin ON microplates.well_prediction USING GIN (bbox jsonb_path_ops);
CREATE INDEX idx_sample_summary_summary_gin ON microplates.sample_summary USING GIN (summary jsonb_path_ops);
```

## Migration Strategy

1. **Phase 1**: Create schemas and basic tables
2. **Phase 2**: Add indexes and constraints
3. **Phase 3**: Create views and functions
4. **Phase 4**: Add triggers for automation
5. **Phase 5**: Seed initial data and configurations

## Security Considerations

- **Row Level Security (RLS)** for multi-tenant scenarios
- **Encrypted sensitive fields** (passwords, tokens)
- **Audit logging** for all data changes
- **Soft deletes** for critical data
- **Data retention policies** for compliance

## Performance Optimization

- **Connection pooling** with PgBouncer
- **Read replicas** for query-heavy operations
- **Partitioning** for large tables (prediction_run by date)
- **Materialized views** for complex aggregations
- **Query optimization** with EXPLAIN ANALYZE
