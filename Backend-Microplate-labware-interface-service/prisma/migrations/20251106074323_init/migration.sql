-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "labware_interface";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "prediction_result";

-- CreateTable
CREATE TABLE IF NOT EXISTS "labware_interface"."interface_file" (
    "id" UUID NOT NULL,
    "sample_no" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "file_size" BIGINT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "generated_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "error_msg" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interface_file_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "public"."health_checks" (
    "id" UUID NOT NULL,
    "service" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "message" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "health_checks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "interface_file_sample_no_idx" ON "labware_interface"."interface_file"("sample_no");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "interface_file_status_idx" ON "labware_interface"."interface_file"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "health_checks_service_idx" ON "public"."health_checks"("service");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "health_checks_timestamp_idx" ON "public"."health_checks"("timestamp");
