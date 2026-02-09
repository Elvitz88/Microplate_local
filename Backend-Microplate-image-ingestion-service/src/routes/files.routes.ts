import { Router, Request, Response } from 'express';
import multer from 'multer';
import { pvcStorageService } from '../services/pvc-storage.service';
import type { ImageFile } from '@prisma/client';
import { databaseService } from '../services/database.service';
import { logger } from '../utils/logger';

const router = Router();
const prisma = databaseService.getClient();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB
  }
});

/**
 * Upload file (images or CSV)
 * POST /api/v1/files/upload
 */
router.post('/upload', upload.single('file'), async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: {
          code: 'NO_FILE',
          message: 'No file provided'
        }
      });
      return;
    }

    const { type, sampleNo, runId, description } = req.body;
    const metadata = req.body.metadata ? JSON.parse(req.body.metadata) : {};

    // Validate required fields
    if (!type || !sampleNo) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required fields: type and sampleNo'
        }
      });
      return;
    }

    // Validate file type
    const validTypes = ['raw', 'annotated', 'csv', 'thumbnail'];
    if (!validTypes.includes(type)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_TYPE',
          message: `Invalid file type. Must be one of: ${validTypes.join(', ')}`
        }
      });
      return;
    }

    logger.info('Uploading file', {
      type,
      sampleNo,
      runId,
      filename: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    });

    // Save file to PVC storage
    const fileMetadata = await pvcStorageService.saveFile({
      sampleNo,
      runId,
      fileType: type,
      filename: req.file.originalname,
      buffer: req.file.buffer,
      mimeType: req.file.mimetype,
      description: description || metadata.description || ''
    });

    // Generate signed URL
    const { signedUrl, expiresAt } = pvcStorageService.generateSignedUrl(
      fileMetadata.fileId,
      fileMetadata.filePath
    );

    // Save metadata to database
    const imageFile = await prisma.imageFile.create({
      data: {
        fileName: fileMetadata.fileName,
        filePath: fileMetadata.filePath,
        fileSize: BigInt(fileMetadata.fileSize),
        mimeType: fileMetadata.mimeType,
        fileType: type,
        bucketName: type === 'csv' ? 'interface-files' :
                    type === 'annotated' ? 'annotated-images' : 'raw-images',
        objectKey: fileMetadata.filePath,
        sampleNo: fileMetadata.sampleNo,
        runId: fileMetadata.runId,
        description: fileMetadata.description
      }
    });

    logger.info('File uploaded successfully', {
      fileId: fileMetadata.fileId,
      imageFileId: imageFile.id,
      filePath: fileMetadata.filePath,
      size: fileMetadata.fileSize
    });

    res.json({
      success: true,
      data: {
        fileId: fileMetadata.fileId,
        id: imageFile.id,
        fileName: fileMetadata.fileName,
        filePath: fileMetadata.filePath,
        fileSize: fileMetadata.fileSize,
        fileType: fileMetadata.fileType,
        sampleNo: fileMetadata.sampleNo,
        runId: fileMetadata.runId,
        downloadUrl: signedUrl,
        signedUrl: signedUrl,
        urlExpiresAt: expiresAt,
        bucketName: imageFile.bucketName,
        objectKey: imageFile.objectKey,
        createdAt: imageFile.createdAt
      }
    });
  } catch (error) {
    logger.error('File upload error', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      body: req.body
    });

    res.status(500).json({
      success: false,
      error: {
        code: 'UPLOAD_FAILED',
        message: error instanceof Error ? error.message : 'File upload failed',
        details: error instanceof Error ? error.stack : undefined
      }
    });
  }
});

/**
 * Direct download by filePath (internal service-to-service, no token required)
 * GET /api/v1/files/download-by-path?path=raw-images/SP131/SP131_xxx.jpg
 */
router.get('/download-by-path', async (req: Request, res: Response): Promise<void> => {
  try {
    const { path: filePath } = req.query;

    if (!filePath || typeof filePath !== 'string') {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Missing required query parameter: path' }
      });
      return;
    }

    logger.debug('Direct download by path', { filePath });

    const { buffer, mimeType } = await pvcStorageService.getFile(filePath);

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Content-Disposition', `inline; filename="${filePath.split('/').pop()}"`);
    res.send(buffer);
  } catch (error) {
    logger.error('Direct download error', {
      error: error instanceof Error ? error.message : error,
      path: req.query.path
    });

    res.status(404).json({
      success: false,
      error: {
        code: 'FILE_NOT_FOUND',
        message: error instanceof Error ? error.message : 'File not found'
      }
    });
  }
});

/**
 * Download file
 * GET /api/v1/files/:fileId/download?token=...
 */
router.get('/:fileId/download', async (req: Request, res: Response): Promise<void> => {
  try {
    const { fileId } = req.params;
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing or invalid token'
        }
      });
      return;
    }

    // Verify token
    const { filePath } = pvcStorageService.verifySignedUrl(token);

    logger.debug('Downloading file', { fileId, filePath });

    // Get file from storage
    const { buffer, mimeType } = await pvcStorageService.getFile(filePath);

    // Set headers
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Content-Disposition', `inline; filename="${fileId}"`);

    res.send(buffer);
  } catch (error) {
    logger.error('File download error', {
      error: error instanceof Error ? error.message : error,
      fileId: req.params.fileId
    });

    const statusCode = error instanceof Error && error.message.includes('expired') ? 401 : 404;

    res.status(statusCode).json({
      success: false,
      error: {
        code: statusCode === 401 ? 'EXPIRED_TOKEN' : 'FILE_NOT_FOUND',
        message: error instanceof Error ? error.message : 'File not found'
      }
    });
  }
});

/**
 * Get file URL (generate new signed URL)
 * GET /api/v1/files/:fileId/url
 */
router.get('/:fileId/url', async (req: Request, res: Response): Promise<void> => {
  try {
    const { fileId } = req.params;
    const { expiresIn } = req.query;

    // Get file metadata from database by ID (exact match only)
    const imageFile = await prisma.imageFile.findUnique({
      where: {
        id: parseInt(fileId)
      }
    });

    if (!imageFile) {
      res.status(404).json({
        success: false,
        error: {
          code: 'FILE_NOT_FOUND',
          message: 'File not found'
        }
      });
      return;
    }

    // Generate new signed URL
    const { signedUrl, expiresAt } = pvcStorageService.generateSignedUrl(
      fileId,
      imageFile.filePath,
      expiresIn ? parseInt(expiresIn as string) : undefined
    );

    res.json({
      success: true,
      data: {
        fileId,
        fileName: imageFile.fileName,
        downloadUrl: signedUrl,
        signedUrl: signedUrl,
        expiresAt
      }
    });
  } catch (error) {
    logger.error('Get file URL error', {
      error: error instanceof Error ? error.message : error,
      fileId: req.params.fileId
    });

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to generate URL'
      }
    });
  }
});

/**
 * List files
 * GET /api/v1/files?type=raw&sampleNo=SAMPLE001
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { type, sampleNo } = req.query;

    // Validate type
    const validTypes = ['raw', 'annotated', 'csv', 'thumbnail'];
    if (type && !validTypes.includes(type as string)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_TYPE',
          message: `Invalid file type. Must be one of: ${validTypes.join(', ')}`
        }
      });
      return;
    }

    // Query database
    const where: any = {};
    if (sampleNo) where.sampleNo = sampleNo;
    if (type) {
      where.bucketName = type === 'csv' ? 'interface-files' :
                         type === 'annotated' ? 'annotated-images' : 'raw-images';
    }

    const files = await prisma.imageFile.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    res.json({
      success: true,
      data: files.map((file: ImageFile) => ({
        id: file.id,
        fileName: file.fileName,
        filePath: file.filePath,
        fileSize: file.fileSize?.toString(),
        mimeType: file.mimeType,
        sampleNo: file.sampleNo,
        runId: file.runId,
        bucketName: file.bucketName,
        createdAt: file.createdAt
      }))
    });
  } catch (error) {
    logger.error('List files error', {
      error: error instanceof Error ? error.message : error,
      query: req.query
    });

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to list files'
      }
    });
  }
});

/**
 * Delete file
 * DELETE /api/v1/files/:fileId
 */
router.delete('/:fileId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { fileId } = req.params;

    // Get file metadata
    const imageFile = await prisma.imageFile.findUnique({
      where: { id: parseInt(fileId) }
    });

    if (!imageFile) {
      res.status(404).json({
        success: false,
        error: {
          code: 'FILE_NOT_FOUND',
          message: 'File not found'
        }
      });
      return;
    }

    // Delete from PVC storage
    await pvcStorageService.deleteFile(imageFile.filePath);

    // Delete from database
    await prisma.imageFile.delete({
      where: { id: parseInt(fileId) }
    });

    logger.info('File deleted successfully', {
      fileId,
      filePath: imageFile.filePath
    });

    res.json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    logger.error('Delete file error', {
      error: error instanceof Error ? error.message : error,
      fileId: req.params.fileId
    });

    res.status(500).json({
      success: false,
      error: {
        code: 'DELETE_FAILED',
        message: error instanceof Error ? error.message : 'Failed to delete file'
      }
    });
  }
});

export default router;
