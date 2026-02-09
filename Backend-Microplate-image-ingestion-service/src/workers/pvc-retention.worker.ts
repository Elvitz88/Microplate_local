/**
 * PVC Retention Worker
 * ลบภาพที่เก่ากว่าที่กำหนด (default 30 วัน) จาก PVC storage และ DB อัตโนมัติ
 */
import { databaseService } from '../services/database.service';
import { pvcStorageService } from '../services/pvc-storage.service';
import { logger } from '../utils/logger';

const RETENTION_DAYS = Number(process.env.PVC_RETENTION_DAYS || '30');
const CHECK_INTERVAL_MS = Number(
  process.env.PVC_RETENTION_CHECK_INTERVAL_MS || String(24 * 60 * 60 * 1000)
);
const DRY_RUN = process.env.PVC_RETENTION_DRY_RUN === 'true';

function daysToMs(days: number): number {
  return days * 24 * 60 * 60 * 1000;
}

async function runRetentionCheck(): Promise<void> {
  const cutoff = new Date(Date.now() - daysToMs(RETENTION_DAYS));
  logger.info('[pvc-retention] Starting retention check', {
    deleteAfterDays: RETENTION_DAYS,
    cutoff: cutoff.toISOString(),
    dryRun: DRY_RUN
  });

  if (DRY_RUN) {
    logger.info('[pvc-retention] DRY RUN - No files will be deleted');
  }

  let deleted = 0;
  let errors = 0;

  try {
    const oldFiles = await databaseService.getImageFilesOlderThan(cutoff);
    logger.info('[pvc-retention] Found files to process', { count: oldFiles.length });

    for (const row of oldFiles) {
      try {
        if (DRY_RUN) {
          logger.info('[pvc-retention] DRY RUN: would delete', {
            id: row.id,
            filePath: row.filePath
          });
          deleted++;
          continue;
        }

        await pvcStorageService.deleteFile(row.filePath);
        await databaseService.deleteImageFile(row.id);
        deleted++;
        logger.info('[pvc-retention] Deleted', { id: row.id, filePath: row.filePath });
      } catch (err) {
        errors++;
        logger.error('[pvc-retention] Error deleting', {
          id: row.id,
          filePath: row.filePath,
          error: err instanceof Error ? err.message : err
        });
      }
    }

    logger.info('[pvc-retention] Retention check completed', {
      totalDeleted: deleted,
      totalErrors: errors
    });
  } catch (error) {
    logger.error('[pvc-retention] Fatal error during retention check', {
      error: error instanceof Error ? error.message : error
    });
    throw error;
  }
}

async function main(): Promise<void> {
  logger.info('[pvc-retention] PVC retention worker started', {
    retentionDays: RETENTION_DAYS,
    checkIntervalMs: CHECK_INTERVAL_MS,
    checkIntervalHours: CHECK_INTERVAL_MS / 1000 / 60 / 60,
    dryRun: DRY_RUN
  });

  await databaseService.connect();
  await runRetentionCheck();
  setInterval(runRetentionCheck, CHECK_INTERVAL_MS);

  logger.info('[pvc-retention] Worker scheduled', {
    intervalHours: CHECK_INTERVAL_MS / 1000 / 60 / 60
  });
}

process.on('SIGINT', async () => {
  logger.info('[pvc-retention] SIGINT, shutting down');
  await databaseService.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('[pvc-retention] SIGTERM, shutting down');
  await databaseService.disconnect();
  process.exit(0);
});

main().catch((error) => {
  logger.error('[pvc-retention] Fatal error', { error });
  process.exit(1);
});
