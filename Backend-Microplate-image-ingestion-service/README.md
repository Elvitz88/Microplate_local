# Image Ingestion Service

บริการสำหรับรับ-จัดเก็บ-ให้ลิงก์เข้าถึงรูปภาพของระบบ Microplate โดยเก็บลง MinIO (S3-compatible) และส่งเหตุการณ์ความคืบหน้า/ข้อผิดพลาดไปยัง Redis (ตัวเลือก)

## คุณสมบัติหลัก
- อัปโหลดไฟล์ภาพแบบ multipart (`POST /api/v1/images`)
- แยกเก็บตามประเภทไฟล์: `raw`, `annotated` (รองรับ `thumbnail` ไว้แล้ว)
- อัปโหลดเข้า MinIO โดยตรง และตั้งชื่อไฟล์ด้วย `timestamp + uuid`
- คืนค่า Presigned URL จาก MinIO เพื่อเข้าถึงไฟล์ชั่วคราว (`SIGNED_URL_EXPIRY`)
- สร้างบัคเก็ตอัตโนมัติเมื่อเริ่มงาน/ตรวจ readiness ผ่าน `ensureBuckets()`
- Health/Readiness checks: `/healthz`, `/readyz`
- Worker จัดการ retention: ย้ายไฟล์เก่า >30 วันไป backup และลบไฟล์ backup >90 วัน (ตั้งค่าได้)
- ส่ง log ไป Redis เป็น progress_log และ error_log (ตั้งค่าได้)

## โครงสร้างโค้ด (ย่อ)
```
src/
  config/storage.ts            # ค่าคอนฟิกเส้นทาง/URL และ ensureStorageDirectories
  routes/image.routes.ts       # เส้นทาง API อัปโหลด + health/ready
  services/upload.service.ts   # ลอจิกบันทึกไฟล์/ตั้งชื่อ/คืน URL
  services/event-bus.service.ts
  workers/retention.worker.ts  # worker จัดการ retention
  server.ts                    # bootstrap Fastify และลงทะเบียนปลั๊กอิน/เส้นทาง
```

## การตั้งค่า (Environment)
คัดลอกไฟล์ตัวอย่างแล้วปรับค่าตามต้องการ:
```bash
copy env.example .env
```

ตัวแปรสำคัญใน `.env`:

### Service Configuration
- `PORT=6402`
- `MAX_FILE_SIZE_BYTES=52428800`
- `ALLOWED_MIME_TYPES=image/jpeg,image/png,image/webp,image/tiff`

### MinIO Object Storage
- `OBJECT_STORAGE_ENDPOINT=http://minio:9000` - Internal endpoint (for Docker services)
- `OBJECT_STORAGE_EXTERNAL_ENDPOINT=http://localhost:9000` - **External endpoint for signed URLs** (accessible from browser)
- `OBJECT_STORAGE_ACCESS_KEY=minioadmin`
- `OBJECT_STORAGE_SECRET_KEY=minioadmin123`
- `OBJECT_STORAGE_BUCKET_RAW=raw-images`
- `OBJECT_STORAGE_BUCKET_ANNOTATED=annotated-images`
- `SIGNED_URL_EXPIRY=3600` - Signed URL expiration in seconds (1 hour)

### Database
- `DATABASE_URL=postgresql://postgres:password@localhost:5432/microplates`

### JWT Authentication
- `JWT_ACCESS_SECRET=your-secret-key`
- `JWT_ISSUER=microplate-auth-service`
- `JWT_AUDIENCE=microplate-api`

### Retention Worker
- `MINIO_RETENTION_CHECK_INTERVAL_MS=86400000` - Check interval (24 hours)
- `MINIO_RETENTION_DELETE_DAYS=60` - Delete files older than X days
- `MINIO_RETENTION_DRY_RUN=false` - Set to `true` for testing

**หมายเหตุ:** 
- `OBJECT_STORAGE_ENDPOINT` ใช้สำหรับ upload ภาพจาก services (Docker internal)
- `OBJECT_STORAGE_EXTERNAL_ENDPOINT` ใช้สำหรับ generate signed URLs (browser accessible)

## การติดตั้งและรัน (โหมดพัฒนา)
```
# ภายในโฟลเดอร์บริการนี้
npm install
npm run dev       # start API ที่พอร์ต 6402
# (ตัวเลือก) รัน worker เฝ้าระบบ retention
npm run worker:dev
```

## การรันด้วย Docker
บริการนี้มี Dockerfile ให้แล้ว และรวมใน `docker-compose.apps.yml` (service: `image-ingesion`)
```
docker compose -f microplate-be/docker-compose.apps.yml build image-ingesion
docker compose -f microplate-be/docker-compose.apps.yml up image-ingesion
```

## เอ็นด์พอยน์ต์

### Health & Readiness
- `GET /healthz` → สถานะสุขภาพ
- `GET /readyz` → ความพร้อมใช้งาน (ตรวจสอบ MinIO buckets)

### Image Upload
- `POST /api/v1/images` → อัปโหลดไฟล์ภาพ (multipart)
  - ฟิลด์ที่รองรับ:
    - `sample_no` (จำเป็น)
    - `run_id` (ไม่จำเป็น)
    - `file_type` = `raw` | `annotated` | `thumbnail` (ค่าเริ่มต้น `raw`)
    - `file` = ไฟล์รูปภาพ (JPEG/PNG/WebP/TIFF)
    - `description` (ไม่จำเป็น)
  - ตัวอย่าง curl:
```bash
curl -X POST http://localhost:6402/api/v1/images \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "sample_no=S123456" \
  -F "file_type=raw" \
  -F "file=@/path/to/image.jpg"
```

### Signed URL Generation (New!)
- `POST /api/v1/signed-urls` → สร้าง signed URL สำหรับภาพที่มีอยู่แล้วใน MinIO
  - Body:
    ```json
    {
      "bucket": "raw-images",
      "objectKey": "TEST006/14/TEST006_xxx.jpg",
      "expiresIn": 3600
    }
    ```
  - Response:
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

- `POST /api/v1/signed-urls/batch` → สร้าง signed URLs หลายไฟล์พร้อมกัน
  - Body:
    ```json
    {
      "images": [
        {"bucket": "raw-images", "objectKey": "TEST006/14/image1.jpg"},
        {"bucket": "annotated-images", "objectKey": "TEST006/14/image2.jpg"}
      ],
      "expiresIn": 3600
    }
    ```

### Image File Management
- `POST /api/v1/image-files` → สร้างบันทึกข้อมูลไฟล์ภาพ
- `GET /api/v1/image-files/:id` → ดูข้อมูลไฟล์ภาพ
- `GET /api/v1/image-files/run/:runId` → ดูไฟล์ภาพตาม run ID
- `GET /api/v1/image-files/sample/:sampleNo` → ดูไฟล์ภาพตาม sample number
- `PUT /api/v1/image-files/:id` → อัปเดตข้อมูลไฟล์ภาพ
- `DELETE /api/v1/image-files/:id` → ลบบันทึกข้อมูลไฟล์ภาพ

## Logging
ระบบใช้ logger กลางของ service นี้ (winston) สำหรับเขียน log ทั้งหมด

## ความปลอดภัย
- ใน production แนะนำให้เข้าถึงบริการนี้ผ่าน Gateway เท่านั้น
- ตั้ง `DISABLE_AUTH=true` (ค่าเริ่มต้น) เพื่อปิดการตรวจสิทธิ์ซ้ำในบริการนี้ เพราะ Gateway ตรวจ JWT ให้แล้ว
- จำกัดขนาดไฟล์/ชนิดไฟล์ผ่าน ENV

## บัคเก็ตที่ต้องมีใน MinIO
- `raw-images`
- `annotated-images`

## หมายเหตุด้านความปลอดภัยของ MinIO
- หากยังไม่ตั้งค่า SSE/KMS ให้ปิด `ServerSideEncryption` ในคำสั่งอัปโหลด (ได้ปิดไว้แล้วในโค้ด)
- ใช้ presigned URL เพื่อการเข้าถึงแบบชั่วคราวแทนการเปิด bucket public
- ตั้ง Lifecycle (ILM) บน MinIO เพื่อลบไฟล์เก่ากว่า N วัน (แนะนำ 45 วัน)

## การทดสอบด่วน
```
# Health
curl http://localhost:6402/healthz
# Ready
curl http://localhost:6402/readyz
# Upload
curl -X POST http://localhost:6402/api/v1/images \
  -F "sample_no=S123456" \
  -F "file_type=raw" \
  -F "file=@/path/to/image.jpg"
```

## Troubleshooting
- 415/400 Unsupported mime type → ตรวจ `ALLOWED_MIME_TYPES` และ content-type ของไฟล์
- 400 sample_no is required → ต้องส่ง `sample_no`
- 500 multipart already present → อย่าลงทะเบียน `@fastify/multipart` ซ้ำทั้งใน `server.ts` และ `routes`
- Container เริ่มไม่ขึ้น (ESM/CJS) → ปัจจุบันคอมไพล์เป็น CommonJS (`tsconfig.json: module=CommonJS`, `package.json: type=commonjs`)

---

# MinIO Retention Worker

Worker สำหรับลบไฟล์เก่าใน MinIO ที่มีอายุเกิน 60 วัน (ตั้งค่าได้)

## คุณสมบัติ

- **อัตโนมัติ**: ตรวจสอบและลบไฟล์เก่าทุก 24 ชั่วโมง (ตั้งค่าได้)
- **ปลอดภัย**: รองรับ Dry Run mode สำหรับทดสอบ
- **ครบถ้วน**: ลบทั้งไฟล์ใน MinIO และข้อมูลในฐานข้อมูล
-- **ติดตาม**: เขียน log ผ่าน logger กลางสำหรับ monitoring

## การตั้งค่า

### Environment Variables

```bash
# MinIO Retention Worker
MINIO_RETENTION_CHECK_INTERVAL_MS=86400000  # 24 hours (milliseconds)
MINIO_RETENTION_DELETE_DAYS=60              # ลบไฟล์ที่เก่ากว่า 60 วัน
MINIO_RETENTION_DRY_RUN=false               # true = ทดสอบ, false = ลบจริง
```

### การรัน

#### Development
```bash
npm run worker:retention:dev
```

#### Production
```bash
npm run worker:retention
```

#### Docker
```bash
# รัน worker แยกต่างหาก
docker-compose -f docker-compose.worker.yml up minio-retention-worker

# หรือรันพร้อมกับ service หลัก
docker-compose -f docker-compose.apps.yml up image-ingesion minio-retention-worker
```

## การทำงาน

1. **ตรวจสอบไฟล์**: ดูไฟล์ใน buckets `raw-images` และ `annotated-images`
2. **ตรวจสอบอายุ**: เปรียบเทียบ `LastModified` กับ threshold
3. **ลบไฟล์**: ลบไฟล์ใน MinIO และข้อมูลในฐานข้อมูล
4. **บันทึก log**: เขียน log ผ่าน logger กลาง

## Dry Run Mode

ตั้งค่า `MINIO_RETENTION_DRY_RUN=true` เพื่อทดสอบ:

```bash
# ดูว่ามีไฟล์อะไรที่จะถูกลบ (ไม่ลบจริง)
MINIO_RETENTION_DRY_RUN=true npm run worker:retention:dev
```

## Monitoring

Worker ส่ง log events ไป Redis:

- `minio_retention_started` - เริ่มการทำงาน
- `minio_retention_deleted` - ลบไฟล์สำเร็จ
- `minio_retention_error` - เกิดข้อผิดพลาด
- `minio_retention_completed` - เสร็จสิ้นการทำงาน

## ตัวอย่าง Log

```
[minio-retention] MinIO retention worker started
[minio-retention] Settings: { checkIntervalMs: 86400000, deleteAfterDays: 60, dryRun: false }
[minio-retention] Starting retention check (delete files older than 60 days)
[minio-retention] Processing bucket: raw-images
[minio-retention] Deleted from MinIO: raw-images/SAMPLE001/123/image.jpg
[minio-retention] Deleted database record ID: 456
[minio-retention] Retention check completed. Deleted: 5, Errors: 0
```

## การแก้ไขปัญหา

### ไฟล์ไม่ถูกลบ
- ตรวจสอบ `MINIO_RETENTION_DELETE_DAYS`
- ตรวจสอบ `MINIO_RETENTION_DRY_RUN`
- ตรวจสอบ MinIO credentials

### Worker ไม่ทำงาน
- ตรวจสอบ database connection
- ตรวจสอบ MinIO connection

---

หากต้องการเพิ่ม GET endpoints (เช่น list by sample/run) หรือเชื่อมต่อฐานข้อมูลเพื่อเก็บเมทาดาทา แจ้งได้ครับ