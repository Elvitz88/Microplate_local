import { Router, Request, Response } from 'express';
import { databaseService } from '../services/database.service';
import { logger } from '../utils/logger';

export const imageFileRoutes = (): Router => {
  const router = Router();

  
  router.post('/', async (req: Request, res: Response) => {
    try {
      const {
        runId,
        sampleNo,
        fileType,
        fileName,
        filePath,
        fileSize,
        mimeType,
        width,
        height,
        bucketName,
        objectKey,
        signedUrl,
        urlExpiresAt,
        description
      } = req.body;

      if (!sampleNo || !fileType || !fileName || !filePath) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_REQUIRED_FIELDS',
            message: 'sampleNo, fileType, fileName, and filePath are required'
          }
        });
      }

      const imageFile = await databaseService.createImageFile({
        runId: runId ? parseInt(runId, 10) : undefined,
        sampleNo,
        fileType,
        fileName,
        filePath,
        fileSize: fileSize ? BigInt(fileSize) : undefined,
        mimeType,
        width: width ? parseInt(width, 10) : undefined,
        height: height ? parseInt(height, 10) : undefined,
        bucketName,
        objectKey,
        signedUrl,
        urlExpiresAt: urlExpiresAt ? new Date(urlExpiresAt) : undefined,
        description
      });

      
      res.status(201).json({
        success: true,
        data: {
          ...imageFile,
          id: imageFile.id.toString(),
          runId: imageFile.runId?.toString() || null,
          fileSize: imageFile.fileSize?.toString() || null
        }
      });
    } catch (error) {
      logger.error('Error creating image file', { error, body: req.body });
      res.status(500).json({
        success: false,
        error: {
          code: 'CREATE_ERROR',
          message: 'Failed to create image file record'
        }
      });
    }
  });

  
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const imageFile = await databaseService.getImageFile(parseInt(id, 10));

      if (!imageFile) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Image file not found'
          }
        });
      }

      res.json({
        success: true,
        data: {
          ...imageFile,
          id: imageFile.id.toString(),
          runId: imageFile.runId?.toString() || null,
          fileSize: imageFile.fileSize?.toString() || null
        }
      });
    } catch (error) {
      logger.error('Error getting image file', { error, params: req.params });
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_ERROR',
          message: 'Failed to get image file'
        }
      });
    }
  });

  
  router.get('/run/:runId', async (req: Request, res: Response) => {
    try {
      const { runId } = req.params;
      const imageFiles = await databaseService.getImageFilesByRunId(parseInt(runId, 10));

      res.json({
        success: true,
        data: imageFiles.map(file => ({
          ...file,
          id: file.id.toString(),
          runId: file.runId?.toString() || null,
          fileSize: file.fileSize?.toString() || null
        }))
      });
    } catch (error) {
      logger.error('Error getting image files by run ID', { error, params: req.params });
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_ERROR',
          message: 'Failed to get image files'
        }
      });
    }
  });

  
  router.get('/sample/:sampleNo', async (req: Request, res: Response) => {
    try {
      const { sampleNo } = req.params;
      const imageFiles = await databaseService.getImageFilesBySampleNo(sampleNo);

      res.json({
        success: true,
        data: imageFiles.map(file => ({
          ...file,
          id: file.id.toString(),
          runId: file.runId?.toString() || null,
          fileSize: file.fileSize?.toString() || null
        }))
      });
    } catch (error) {
      logger.error('Error getting image files by sample number', { error, params: req.params });
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_ERROR',
          message: 'Failed to get image files'
        }
      });
    }
  });

  
  router.put('/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { signedUrl, urlExpiresAt, description } = req.body;

      const imageFile = await databaseService.updateImageFile(parseInt(id, 10), {
        signedUrl,
        urlExpiresAt: urlExpiresAt ? new Date(urlExpiresAt) : undefined,
        description
      });

      res.json({
        success: true,
        data: {
          ...imageFile,
          id: imageFile.id.toString(),
          runId: imageFile.runId?.toString() || null,
          fileSize: imageFile.fileSize?.toString() || null
        }
      });
    } catch (error) {
      logger.error('Error updating image file', { error, params: req.params, body: req.body });
      res.status(500).json({
        success: false,
        error: {
          code: 'UPDATE_ERROR',
          message: 'Failed to update image file'
        }
      });
    }
  });

  
  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await databaseService.deleteImageFile(parseInt(id, 10));

      res.json({
        success: true,
        message: 'Image file deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting image file', { error, params: req.params });
      res.status(500).json({
        success: false,
        error: {
          code: 'DELETE_ERROR',
          message: 'Failed to delete image file'
        }
      });
    }
  });

  
  router.delete('/run/:runId', async (req: Request, res: Response) => {
    try {
      const { runId } = req.params;
      const result = await databaseService.deleteImageFilesByRunId(parseInt(runId, 10));

      res.json({
        success: true,
        message: `Deleted ${result.count} image files for run ${runId}`
      });
    } catch (error) {
      logger.error('Error deleting image files by run ID', { error, params: req.params });
      res.status(500).json({
        success: false,
        error: {
          code: 'DELETE_ERROR',
          message: 'Failed to delete image files'
        }
      });
    }
  });

  return router;
};
