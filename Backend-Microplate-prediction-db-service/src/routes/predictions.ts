import { Router, Request, Response } from 'express';
import { prisma } from '../server';
import { logger } from '../utils/logger';
import { notificationService } from '../services/notification.service';

export function predictionRoutes(): Router {
  const router = Router();

  
  router.post('/', async (request: Request, response: Response) => {
    const body = request.body;
    if (!body?.sampleNo) {
      return response.status(400).json({ error: 'sampleNo is required' });
    }

    try {
      const run = await prisma.predictionRun.create({
        data: {
          sampleNo: body.sampleNo,
          submissionNo: body.submissionNo ?? null,
          description: body.description || null,
          rawImagePath: body.rawImagePath || null,
          modelVersion: body.modelVersion || null,
          status: body.status || 'pending',
          confidenceThreshold: body.confidenceThreshold ?? null,
          createdBy: body.createdBy || null,
        },
      });

      
      notificationService.notifyResultApiService(run.sampleNo, run.id);

      return response.status(201).json({ success: true, data: { id: run.id, sampleNo: run.sampleNo } });
    } catch (error) {
      logger.error('Failed to create prediction run:', String(error));
      return response.status(500).json({ error: 'Failed to create prediction run' });
    }
  });

  
  router.post('/runs', async (request: Request, response: Response) => {
    const body = request.body;
    if (!body?.sampleNo) {
      return response.status(400).json({ error: 'sampleNo is required' });
    }

    try {
      const run = await prisma.predictionRun.create({
        data: {
          sampleNo: body.sampleNo,
          submissionNo: body.submissionNo ?? null,
          description: body.description || null,
          rawImagePath: body.rawImagePath || null,
          modelVersion: body.modelVersion || null,
          status: body.status || 'pending',
          confidenceThreshold: body.confidenceThreshold ?? null,
          createdBy: body.createdBy || null,
        },
      });

      
      notificationService.notifyResultApiService(run.sampleNo, run.id);

      return response.status(201).json({ success: true, data: { id: run.id, sampleNo: run.sampleNo } });
    } catch (error) {
      logger.error('Failed to create prediction run:', String(error));
      return response.status(500).json({ error: 'Failed to create prediction run' });
    }
  });

  
  router.get('/', async (request: Request, response: Response) => {
    const { 
      page = '1', 
      limit = '20', 
      status, 
      sampleNo, 
      submissionNo,
      startDate, 
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = request.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    try {
      const where: any = {};
      
      if (status) where.status = status;
      if (submissionNo) {
        where.OR = [
          { submissionNo: { contains: submissionNo, mode: 'insensitive' } },
          { sampleNo: { contains: submissionNo, mode: 'insensitive' } }
        ];
      } else if (sampleNo) {
        where.sampleNo = { contains: sampleNo, mode: 'insensitive' };
      }
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate as string);
        if (endDate) where.createdAt.lte = new Date(endDate as string);
      }

      const [runs, total] = await Promise.all([
        prisma.predictionRun.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: { [sortBy as string]: sortOrder },
          include: {
            wellPredictions: true,
            rowCounts: true,
            inferenceResults: true,
          },
        }),
        prisma.predictionRun.count({ where }),
      ]);

      response.json({
        success: true,
        data: {
          runs,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum),
            hasNext: pageNum * limitNum < total,
            hasPrev: pageNum > 1,
          },
        },
      });
    } catch (error) {
      logger.error('Failed to get prediction runs:', String(error));
      response.status(500).json({ error: 'Failed to get prediction runs' });
    }
  });

  
  router.get('/:id', async (request: Request, response: Response) => {
    const { id } = request.params;

    if (!id || isNaN(parseInt(id, 10))) {
      return response.status(400).json({ error: 'Valid ID is required' });
    }

    try {
      const run = await prisma.predictionRun.findUnique({
        where: { id: parseInt(id, 10) },
        include: {
          wellPredictions: true,
          rowCounts: true,
          inferenceResults: true,
        },
      });

      if (!run) {
        return response.status(404).json({ error: 'Prediction run not found' });
      }

      return response.json({ success: true, data: run });
    } catch (error) {
      logger.error(`Failed to get prediction run ${id}:`, String(error));
      return response.status(500).json({ error: 'Failed to get prediction run' });
    }
  });


  
  router.get('/sample/:sampleNo', async (request: Request, response: Response) => {
    const { sampleNo } = request.params;
    const { page = '1', limit = '20' } = request.query;

    if (!sampleNo) {
      return response.status(400).json({ error: 'sampleNo is required' });
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    try {
      const [runs, total] = await Promise.all([
        prisma.predictionRun.findMany({
          where: { sampleNo },
          skip,
          take: limitNum,
          orderBy: { createdAt: 'desc' },
          include: {
            wellPredictions: true,
            rowCounts: true,
            inferenceResults: true,
          },
        }),
        prisma.predictionRun.count({ where: { sampleNo } }),
      ]);

      return response.json({
        success: true,
        data: {
          runs,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum),
            hasNext: pageNum * limitNum < total,
            hasPrev: pageNum > 1,
          },
        },
      });
    } catch (error) {
      logger.error(`Failed to get prediction runs for sample ${sampleNo}:`, String(error));
      return response.status(500).json({ error: 'Failed to get prediction runs' });
    }
  });

  
  router.get('/:id/wells', async (request: Request, response: Response) => {
    const { id } = request.params;
    const { page = '1', limit = '100' } = request.query;

    if (!id || isNaN(parseInt(id, 10))) {
      return response.status(400).json({ error: 'Valid ID is required' });
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    try {
      const [wells, total] = await Promise.all([
        prisma.wellPrediction.findMany({
          where: { runId: parseInt(id, 10) },
          skip,
          take: limitNum,
          orderBy: { wellId: 'asc' },
        }),
        prisma.wellPrediction.count({ where: { runId: parseInt(id, 10) } }),
      ]);

      return response.json({
        success: true,
        data: {
          wells,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum),
            hasNext: pageNum * limitNum < total,
            hasPrev: pageNum > 1,
          },
        },
      });
    } catch (error) {
      logger.error(`Failed to get wells for run ${id}:`, String(error));
      return response.status(500).json({ error: 'Failed to get wells' });
    }
  });

  
  router.delete('/:id', async (request: Request, response: Response) => {
    const { id } = request.params;

    if (!id || isNaN(parseInt(id, 10))) {
      return response.status(400).json({ error: 'Valid ID is required' });
    }

    try {
      
      const run = await prisma.predictionRun.findUnique({
        where: { id: parseInt(id, 10) },
      });

      if (!run) {
        return response.status(404).json({ error: 'Prediction run not found' });
      }

      
      await prisma.wellPrediction.deleteMany({ where: { runId: parseInt(id, 10) } });
      await prisma.rowCounts.deleteMany({ where: { runId: parseInt(id, 10) } });
      await prisma.inferenceResult.deleteMany({ where: { runId: parseInt(id, 10) } });

      
      await prisma.predictionRun.delete({
        where: { id: parseInt(id, 10) },
      });

      return response.json({ success: true, message: 'Prediction run deleted successfully' });
    } catch (error) {
      logger.error(`Failed to delete prediction run ${id}:`, String(error));
      return response.status(500).json({ error: 'Failed to delete prediction run' });
    }
  });

  
  router.put('/runs/:id', async (request: Request, response: Response) => {
    const { id } = request.params;
    const body = request.body;

    if (!id || isNaN(parseInt(id, 10))) {
      return response.status(400).json({ error: 'Valid ID is required' });
    }

    try {
      const run = await prisma.predictionRun.findUnique({
        where: { id: parseInt(id, 10) },
      });

      if (!run) {
        return response.status(404).json({ error: 'Prediction run not found' });
      }

      const updatedRun = await prisma.predictionRun.update({
        where: { id: parseInt(id, 10) },
        data: {
          ...(body.status && { status: body.status }),
          ...(body.description && { description: body.description }),
          ...(body.modelVersion && { modelVersion: body.modelVersion }),
          ...(body.confidenceThreshold !== undefined && { confidenceThreshold: body.confidenceThreshold }),
          ...(body.rawImagePath && { rawImagePath: body.rawImagePath }),
          ...(body.annotatedImagePath && { annotatedImagePath: body.annotatedImagePath }),
          ...(body.processingTimeMs !== undefined && { processingTimeMs: body.processingTimeMs }),
          ...(body.errorMsg && { errorMsg: body.errorMsg }),
          ...(body.createdBy && { createdBy: body.createdBy }),
        },
      });

      
      if (body.status === 'completed') {
        notificationService.notifyResultApiService(updatedRun.sampleNo, updatedRun.id);
      }

      return response.json({ success: true, data: updatedRun });
    } catch (error) {
      logger.error(`Failed to update prediction run ${id}:`, String(error));
      return response.status(500).json({ error: 'Failed to update prediction run' });
    }
  });


  
  router.post('/:id/wells', async (request: Request, response: Response) => {
    const { id } = request.params;
    const { predictions } = request.body;

    if (!id || isNaN(parseInt(id, 10))) {
      return response.status(400).json({ error: 'Valid ID is required' });
    }

    if (!Array.isArray(predictions)) {
      return response.status(400).json({ error: 'predictions must be an array' });
    }

    try {
      const run = await prisma.predictionRun.findUnique({
        where: { id: parseInt(id, 10) },
      });

      if (!run) {
        return response.status(404).json({ error: 'Prediction run not found' });
      }

      const createdWells = await prisma.wellPrediction.createMany({
        data: predictions.map((pred: any) => ({
          runId: parseInt(id, 10),
          wellId: pred.wellId,
          label: pred.label,
          class_: pred.class,
          confidence: pred.confidence,
          bbox: pred.bbox || {},
        })),
      });

      return response.json({ success: true, data: { count: createdWells.count } });
    } catch (error) {
      logger.error(`Failed to add wells to run ${id}:`, String(error));
      return response.status(500).json({ error: 'Failed to add wells' });
    }
  });

  
  router.post('/:id/counts', async (request: Request, response: Response) => {
    const { id } = request.params;
    const { counts } = request.body;

    if (!id || isNaN(parseInt(id, 10))) {
      return response.status(400).json({ error: 'Valid ID is required' });
    }

    try {
      const run = await prisma.predictionRun.findUnique({
        where: { id: parseInt(id, 10) },
      });

      if (!run) {
        return response.status(404).json({ error: 'Prediction run not found' });
      }

      const createdCounts = await prisma.rowCounts.create({
        data: {
          runId: parseInt(id, 10),
          counts: counts,
        },
      });

      return response.json({ success: true, data: createdCounts });
    } catch (error) {
      logger.error(`Failed to add counts to run ${id}:`, String(error));
      return response.status(500).json({ error: 'Failed to add counts' });
    }
  });

  
  router.post('/:id/results', async (request: Request, response: Response) => {
    const { id } = request.params;
    const { results } = request.body;

    if (!id || isNaN(parseInt(id, 10))) {
      return response.status(400).json({ error: 'Valid ID is required' });
    }

    try {
      const run = await prisma.predictionRun.findUnique({
        where: { id: parseInt(id, 10) },
      });

      if (!run) {
        return response.status(404).json({ error: 'Prediction run not found' });
      }

      const createdResults = await prisma.inferenceResult.create({
        data: {
          runId: parseInt(id, 10),
          results: results,
        },
      });

      return response.json({ success: true, data: createdResults });
    } catch (error) {
      logger.error(`Failed to add results to run ${id}:`, String(error));
      return response.status(500).json({ error: 'Failed to add results' });
    }
  });

  
  router.get('/activity/recent', async (request: Request, response: Response) => {
    const { limit = '10' } = request.query;
    const limitNum = parseInt(limit as string, 10);

    try {
      const recentRuns = await prisma.predictionRun.findMany({
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          sampleNo: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return response.json({ success: true, data: recentRuns });
    } catch (error) {
      logger.error('Failed to get recent activity:', String(error));
      return response.status(500).json({ error: 'Failed to get recent activity' });
    }
  });

  return router;
}