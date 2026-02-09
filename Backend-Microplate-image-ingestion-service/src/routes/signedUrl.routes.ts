import { Router, Request, Response } from 'express';
import { logger } from '../utils/logger';
import { pvcStorageService } from '../services/pvc-storage.service';
import { databaseService } from '../services/database.service';

export const signedUrlRoutes = (): Router => {
  const router = Router();


  router.post('/', async (req: Request, res: Response) => {
    try {
      const { bucket, objectKey, expiresIn } = req.body;

      if (!bucket || !objectKey) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_REQUIRED_FIELDS',
            message: 'bucket and objectKey are required'
          }
        });
      }


      if (!['raw-images', 'annotated-images'].includes(bucket)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_BUCKET',
            message: 'bucket must be either "raw-images" or "annotated-images"'
          }
        });
      }

      // Query database for file with this objectKey
      const prisma = databaseService.getClient();
      const imageFile = await prisma.imageFile.findFirst({
        where: {
          objectKey: objectKey,
          bucketName: bucket
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      if (!imageFile) {
        logger.warn('File not found in database', { bucket, objectKey });
        return res.status(404).json({
          success: false,
          error: {
            code: 'FILE_NOT_FOUND',
            message: 'File not found in database'
          }
        });
      }

      // Generate signed URL from database record
      const { signedUrl, expiresAt } = pvcStorageService.generateSignedUrl(
        imageFile.id.toString(),
        imageFile.filePath,
        expiresIn
      );

      res.json({
        success: true,
        data: {
          signedUrl,
          expiresAt,
          bucket,
          objectKey
        }
      });
    } catch (error) {
      logger.error('Error generating signed URL', { error, body: req.body });
      res.status(500).json({
        success: false,
        error: {
          code: 'SIGNED_URL_ERROR',
          message: 'Failed to generate signed URL'
        }
      });
    }
  });


  router.post('/batch', async (req: Request, res: Response) => {
    try {
      const { images, expiresIn } = req.body;

      if (!Array.isArray(images) || images.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'images must be a non-empty array'
          }
        });
      }


      for (const img of images) {
        if (!img.bucket || !img.objectKey) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'MISSING_REQUIRED_FIELDS',
              message: 'Each image must have bucket and objectKey'
            }
          });
        }

        if (!['raw-images', 'annotated-images'].includes(img.bucket)) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_BUCKET',
              message: 'bucket must be either "raw-images" or "annotated-images"'
            }
          });
        }
      }


      const prisma = databaseService.getClient();
      const results = await Promise.all(
        images.map(async (img) => {
          try {
            // Query database for file
            const imageFile = await prisma.imageFile.findFirst({
              where: {
                objectKey: img.objectKey,
                bucketName: img.bucket
              },
              orderBy: {
                createdAt: 'desc'
              }
            });

            if (!imageFile) {
              return {
                error: 'File not found in database',
                bucket: img.bucket,
                objectKey: img.objectKey
              };
            }

            // Generate signed URL
            const { signedUrl, expiresAt } = pvcStorageService.generateSignedUrl(
              imageFile.id.toString(),
              imageFile.filePath,
              expiresIn
            );

            return {
              signedUrl,
              expiresAt,
              bucket: img.bucket,
              objectKey: img.objectKey
            };
          } catch (error: any) {
            return {
              error: error.message,
              bucket: img.bucket,
              objectKey: img.objectKey
            };
          }
        })
      );

      res.json({
        success: true,
        data: results
      });
    } catch (error) {
      logger.error('Error generating batch signed URLs', { error, body: req.body });
      res.status(500).json({
        success: false,
        error: {
          code: 'BATCH_SIGNED_URL_ERROR',
          message: 'Failed to generate signed URLs'
        }
      });
    }
  });

  return router;
};

