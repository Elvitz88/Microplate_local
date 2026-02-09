import { S3Client, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { databaseService } from '../services/database.service';
import { logger } from '../utils/logger';

interface RetentionSettings {
  checkIntervalMs: number;
  deleteAfterDays: number;
  dryRun: boolean;
}

const settings: RetentionSettings = {
  checkIntervalMs: Number(process.env.MINIO_RETENTION_CHECK_INTERVAL_MS || 24 * 60 * 60 * 1000), 
  deleteAfterDays: Number(process.env.MINIO_RETENTION_DELETE_DAYS || 60), 
  dryRun: process.env.MINIO_RETENTION_DRY_RUN === 'true'
};


const s3Client = new S3Client({
  endpoint: process.env.OBJECT_STORAGE_ENDPOINT || 'http://minio:9000',
  region: process.env.OBJECT_STORAGE_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.OBJECT_STORAGE_ACCESS_KEY || 'minioadmin',
    secretAccessKey: process.env.OBJECT_STORAGE_SECRET_KEY || 'minioadmin123'
  },
  forcePathStyle: true
});

const buckets = [
  process.env.OBJECT_STORAGE_BUCKET_RAW || 'raw-images',
  process.env.OBJECT_STORAGE_BUCKET_ANNOTATED || 'annotated-images'
];

function daysToMs(days: number): number {
  return days * 24 * 60 * 60 * 1000;
}

async function listObjectsInBucket(bucketName: string, continuationToken?: string): Promise<any[]> {
  const command = new ListObjectsV2Command({
    Bucket: bucketName,
    ContinuationToken: continuationToken,
    MaxKeys: 1000
  });

  const response = await s3Client.send(command);
  let objects = response.Contents || [];

  if (response.NextContinuationToken) {
    const moreObjects = await listObjectsInBucket(bucketName, response.NextContinuationToken);
    objects = objects.concat(moreObjects);
  }

  return objects;
}

async function deleteObjectFromMinIO(bucketName: string, objectKey: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: objectKey
  });

  await s3Client.send(command);
}

async function deleteImageFileRecord(imageFileId: number): Promise<void> {
  await databaseService.deleteImageFile(imageFileId);
}

async function processBucket(bucketName: string): Promise<{ deleted: number; errors: number }> {
  let deleted = 0;
  let errors = 0;
  const threshold = Date.now() - daysToMs(settings.deleteAfterDays);

  logger.info('[minio-retention] Processing bucket', { bucketName });

  try {
    const objects = await listObjectsInBucket(bucketName);
    
    for (const object of objects) {
      if (!object.Key || !object.LastModified) continue;

      const lastModified = new Date(object.LastModified).getTime();
      
      if (lastModified <= threshold) {
        try {
          
          const imageFile = await databaseService.getImageFilesByBucketAndObjectKey(bucketName, object.Key);

          if (settings.dryRun) {
            logger.info('[minio-retention] DRY RUN: Skipping deletion', {
              bucketName,
              objectKey: object.Key,
              lastModified: object.LastModified,
              imageFileId: imageFile?.id,
            });
          } else {
            
            await deleteObjectFromMinIO(bucketName, object.Key);
            logger.info('[minio-retention] Deleted object from MinIO', {
              bucketName,
              objectKey: object.Key,
            });

            
            if (imageFile) {
              await deleteImageFileRecord(imageFile.id);
              logger.info('[minio-retention] Deleted image file record', {
                imageFileId: imageFile.id,
              });
            }

            deleted++;
          }
        } catch (error) {
          logger.error('[minio-retention] Error deleting object', {
            bucketName,
            objectKey: object.Key,
            error,
          });
          errors++;
        }
      }
    }
  } catch (error) {
    logger.error('[minio-retention] Error processing bucket', { bucketName, error });
    errors++;
  }

  return { deleted, errors };
}

async function runRetentionCheck(): Promise<void> {
  logger.info('[minio-retention] Starting retention check', {
    deleteAfterDays: settings.deleteAfterDays,
    dryRun: settings.dryRun,
  });
  
  if (settings.dryRun) {
    logger.info('[minio-retention] DRY RUN MODE - No files will be actually deleted');
  }

  let totalDeleted = 0;
  let totalErrors = 0;

  for (const bucketName of buckets) {
    const result = await processBucket(bucketName);
    totalDeleted += result.deleted;
    totalErrors += result.errors;
  }

  logger.info('[minio-retention] Retention check completed', {
    totalDeleted,
    totalErrors,
  });
}

async function main(): Promise<void> {
  logger.info('[minio-retention] MinIO retention worker started', {
    settings: {
      checkIntervalMs: settings.checkIntervalMs,
      deleteAfterDays: settings.deleteAfterDays,
      dryRun: settings.dryRun,
      checkIntervalMinutes: settings.checkIntervalMs / 1000 / 60,
    },
  });

  
  await databaseService.connect();

  
  await runRetentionCheck();

  
  setInterval(runRetentionCheck, settings.checkIntervalMs);

  logger.info('[minio-retention] Worker scheduled', {
    intervalMinutes: settings.checkIntervalMs / 1000 / 60,
  });
}


process.on('SIGINT', async () => {
  logger.info('[minio-retention] Received SIGINT, shutting down gracefully...');
  await databaseService.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('[minio-retention] Received SIGTERM, shutting down gracefully...');
  await databaseService.disconnect();
  process.exit(0);
});

main().catch(error => {
  logger.error('[minio-retention] Fatal error', { error });
  process.exit(1);
});
