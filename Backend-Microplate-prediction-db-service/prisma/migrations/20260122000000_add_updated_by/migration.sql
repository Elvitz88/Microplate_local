-- AlterTable
ALTER TABLE "prediction_result"."prediction_run" ADD COLUMN IF NOT EXISTS "updated_by" UUID;