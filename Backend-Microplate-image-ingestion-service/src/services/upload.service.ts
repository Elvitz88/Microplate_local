import path from 'path';
import { randomUUID } from 'crypto';
import { storageConfig } from '../config/storage';
// import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'; // Disabled: Using PVC instead
// import { getSignedUrl } from '@aws-sdk/s3-request-presigner'; // Disabled: Using PVC instead
// import { GetObjectCommand } from '@aws-sdk/client-s3'; // Disabled: Using PVC instead
import { logger } from '../utils/logger';
import { pvcStorageService } from './pvc-storage.service';

type FileType = 'raw' | 'annotated' | 'thumbnail';

const MIME_EXTENSION_MAP: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/tiff': 'tiff'
};

const EXTENSION_MIME_MAP: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  tif: 'image/tiff',
  tiff: 'image/tiff'
};

const ALLOWED_MIME_SET = new Set(
  storageConfig.allowedMimeTypes.map((mime) => mime.trim().toLowerCase())
);

function resolveMimeType(
  filename?: string,
  providedMime?: string
): { mimeType: string; extension: string } {
  const normalizedProvided = providedMime?.trim().toLowerCase();
  const ext = filename ? path.extname(filename).toLowerCase().replace('.', '') : '';
  const inferredFromExt = ext ? EXTENSION_MIME_MAP[ext] : undefined;
  const mimeType = normalizedProvided || inferredFromExt || 'application/octet-stream';

  if (!ALLOWED_MIME_SET.has(mimeType)) {
    throw new Error(`Unsupported mime type: ${mimeType}`);
  }

  const extension = MIME_EXTENSION_MAP[mimeType] || ext || 'bin';
  return { mimeType, extension };
}

interface UploadParams {
  sampleNo: string;
  runId?: string;
  fileType: FileType;
  filename?: string;
  buffer: Buffer;
  mimeType?: string;
  description?: string;
}

export async function saveImage(params: UploadParams) {
  const { mimeType, extension } = resolveMimeType(params.filename, params.mimeType);

  const timestamp = new Date().toISOString().replace(/[-:TZ]/g, '').slice(0, 14);
  const uuid = randomUUID();
  const fileName = `${params.sampleNo}_${timestamp}_${uuid}${
    params.fileType === 'thumbnail' ? '_thumb' : ''
  }.${extension}`;

  // Use PVC Storage instead of MinIO
  logger.info('Uploading image to PVC', {
    size: params.buffer.length,
    sampleNo: params.sampleNo,
    runId: params.runId,
    fileType: params.fileType,
  });

  const result = await pvcStorageService.saveFile({
    sampleNo: params.sampleNo,
    runId: params.runId,
    fileType: params.fileType,
    filename: fileName,
    buffer: params.buffer,
    mimeType,
    description: params.description
  });

  logger.info('Successfully uploaded image to PVC', {
    filePath: result.filePath,
    sampleNo: params.sampleNo,
    runId: params.runId,
    fileType: params.fileType,
  });

  // Generate signed URL
  const signedUrlData = pvcStorageService.generateSignedUrl(
    result.fileId,
    result.filePath
  );

  return {
    sampleNo: params.sampleNo,
    runId: params.runId ? Number(params.runId) : null,
    fileType: params.fileType,
    fileName: result.fileName,
    filePath: result.filePath,
    fileSize: params.buffer.length,
    mimeType,
    bucketName: params.fileType === 'annotated' ? 'annotated-images' : 'raw-images',
    objectKey: result.filePath,
    signedUrl: signedUrlData.signedUrl,
    urlExpiresAt: signedUrlData.expiresAt,
    description: params.description || ''
  };
}

/**
 * Generate a signed URL for an existing file in PVC storage
 * @param bucket - Bucket name (legacy parameter, not used in PVC)
 * @param objectKey - File path in PVC storage
 * @param expiresIn - URL expiration time in seconds (default: from config)
 *
 * Note: This function is for backward compatibility with S3/MinIO API.
 * For PVC storage, we need fileId from database, so this may not work correctly
 * for all use cases. Prefer using files.routes.ts for new implementations.
 */
export async function generateSignedUrl(bucket: string, objectKey: string, expiresIn?: number) {
  logger.warn('generateSignedUrl called with legacy S3 API - this may not work correctly with PVC storage', {
    bucket,
    objectKey
  });

  // For legacy compatibility, generate a temporary fileId from the path
  // This is a workaround and may not work for all cases
  const fileId = randomUUID(); // Generate temporary ID

  const result = pvcStorageService.generateSignedUrl(
    fileId,
    objectKey,
    expiresIn || storageConfig.s3.signedUrlExpiry
  );

  return {
    signedUrl: result.signedUrl,
    expiresAt: result.expiresAt,
    bucket,
    objectKey
  };
}


