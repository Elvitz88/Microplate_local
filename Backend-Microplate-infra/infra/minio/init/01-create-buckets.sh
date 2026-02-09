#!/bin/sh
# MinIO Bucket Initialization Script
# Creates required buckets for Image Ingestion Service

set -e

MINIO_ALIAS="local"
MINIO_ENDPOINT="http://minio:9000"
MINIO_USER="${MINIO_ROOT_USER:-minioadmin}"
MINIO_PASS="${MINIO_ROOT_PASSWORD:-minioadmin}"

# Wait for MinIO to be ready
until mc alias set "$MINIO_ALIAS" "$MINIO_ENDPOINT" "$MINIO_USER" "$MINIO_PASS" >/dev/null 2>&1; do
  echo "Waiting for MinIO to be ready..."
  sleep 2
done

echo "MinIO is ready. Creating buckets..."

# Required buckets
mc mb -p "$MINIO_ALIAS/raw-images" || true
mc mb -p "$MINIO_ALIAS/annotated-images" || true

# Set CORS policy for frontend access
mc anonymous set download "$MINIO_ALIAS/raw-images" || true
mc anonymous set download "$MINIO_ALIAS/annotated-images" || true

# Keep default private policy; presigned URLs are used for access

echo "Buckets created successfully:"
mc ls "$MINIO_ALIAS"

echo "MinIO initialization completed!"
