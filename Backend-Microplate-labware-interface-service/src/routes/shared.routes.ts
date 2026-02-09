

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { sharedInterfaceService } from '../services/shared-interface.service';
import { logger } from '../utils/logger';

const router = Router();


const getInterfaceFilesSchema = z.object({
  sampleNo: z.string().optional(),
  status: z.string().optional(),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 100),
  offset: z.string().optional().transform(val => val ? parseInt(val) : 0),
});


router.get('/interface-files', async (req: Request, res: Response): Promise<void> => {
  try {
    
    const validation = getInterfaceFilesSchema.safeParse(req.query);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          details: validation.error.errors,
        },
      });
      return;
    }

    const query = validation.data;
    const files = await sharedInterfaceService.getInterfaceFiles(query as any);

    res.json({
      success: true,
      data: files,
    });
  } catch (error) {
    logger.error('Get shared interface files error', { error, query: req.query });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    });
  }
});


router.get('/interface-files/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Interface file ID is required',
        },
      });
      return;
    }

    const file = await sharedInterfaceService.getInterfaceFile(id);

    if (!file) {
      res.status(404).json({
        success: false,
        error: {
          code: 'FILE_NOT_FOUND',
          message: 'Interface file not found',
        },
      });
      return;
    }

    res.json({
      success: true,
      data: file,
    });
  } catch (error) {
    logger.error('Get shared interface file error', { error, params: req.params });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    });
  }
});


router.get('/interface-files/sample/:sampleNo', async (req: Request, res: Response): Promise<void> => {
  try {
    const { sampleNo } = req.params;

    if (!sampleNo) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Sample number is required',
        },
      });
      return;
    }

    const files = await sharedInterfaceService.getInterfaceFilesBySample(sampleNo);

    res.json({
      success: true,
      data: files,
    });
  } catch (error) {
    logger.error('Get shared interface files by sample error', { error, params: req.params, query: req.query });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    });
  }
});


router.get('/interface-files/statistics', async (req: Request, res: Response): Promise<void> => {
  try {
    const statistics = await sharedInterfaceService.getStatistics();

    res.json({
      success: true,
      data: statistics,
    });
  } catch (error) {
    logger.error('Get shared interface statistics error', { error, query: req.query });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    });
  }
});

export default router;
