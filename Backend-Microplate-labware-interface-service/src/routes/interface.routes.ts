import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { interfaceService } from '../services/interface.service';
import { logger } from '../utils/logger';

const router = Router();


const generateInterfaceSchema = z.object({
  sampleNo: z.string().min(1, 'Sample number is required'),
  testNumber: z.string().optional(), 
});

const getInterfaceFilesSchema = z.object({
  sampleNo: z.string().optional(),
});


router.post('/generate', async (req: Request, res: Response): Promise<void> => {
  try {
    
    const validation = generateInterfaceSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: validation.error.errors,
        },
      });
      return;
    }

    const { sampleNo, testNumber } = validation.data;
    const createdBy = (req as any).user?.id;

    
    const result = await interfaceService.generateInterfaceFile({
      sampleNo,
      testNumber,
      createdBy,
    });

    if (!result.success) {
      const statusCode = result.error?.code === 'SAMPLE_NOT_FOUND' ? 404 : 500;
      res.status(statusCode).json(result);
      return;
    }

    res.json(result);
  } catch (error) {
    logger.error('Generate interface file error', { error, body: req.body });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    });
  }
});


router.get('/files', async (req: Request, res: Response): Promise<void> => {
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

    const { sampleNo } = validation.data;

    
    const result = await interfaceService.getInterfaceFiles(sampleNo);

    if (!result.success) {
      res.status(500).json(result);
      return;
    }

    res.json(result);
  } catch (error) {
    logger.error('Get interface files error', { error, query: req.query });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    });
  }
});


router.get('/files/:id', async (req: Request, res: Response): Promise<void> => {
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

    
    const result = await interfaceService.getInterfaceFile(id);

    if (!result.success) {
      const statusCode = result.error?.code === 'FILE_NOT_FOUND' ? 404 : 500;
      res.status(statusCode).json(result);
      return;
    }

    res.json(result);
  } catch (error) {
    logger.error('Get interface file error', { error, params: req.params });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    });
  }
});


router.delete('/files/:id', async (req: Request, res: Response): Promise<void> => {
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

    
    const result = await interfaceService.deleteInterfaceFile(id);

    if (!result.success) {
      const statusCode = result.error?.code === 'FILE_NOT_FOUND' ? 404 : 500;
      res.status(statusCode).json(result);
      return;
    }

    res.json(result);
  } catch (error) {
    logger.error('Delete interface file error', { error, params: req.params });
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