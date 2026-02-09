-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "image_storage";

-- CreateTable
CREATE TABLE "image_storage"."image_file" (
    "id" SERIAL NOT NULL,
    "run_id" INTEGER,
    "sample_no" TEXT NOT NULL,
    "file_type" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "file_size" BIGINT,
    "mime_type" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "bucket_name" TEXT,
    "object_key" TEXT,
    "signed_url" TEXT,
    "url_expires_at" TIMESTAMP(3),
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "image_file_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."health_checks" (
    "id" UUID NOT NULL,
    "service" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "message" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "health_checks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "image_file_run_id_idx" ON "image_storage"."image_file"("run_id");

-- CreateIndex
CREATE INDEX "image_file_sample_no_idx" ON "image_storage"."image_file"("sample_no");

-- CreateIndex
CREATE INDEX "image_file_file_type_idx" ON "image_storage"."image_file"("file_type");

-- CreateIndex
CREATE INDEX "image_file_created_at_idx" ON "image_storage"."image_file"("created_at");

-- CreateIndex
CREATE INDEX "health_checks_service_idx" ON "public"."health_checks"("service");

-- CreateIndex
CREATE INDEX "health_checks_timestamp_idx" ON "public"."health_checks"("timestamp");
