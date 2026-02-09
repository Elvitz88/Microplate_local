import { Router } from 'express';
import { DirectResultService } from '@/services/direct-result.service';
import { PrismaClient } from '@prisma/client';
import { logger } from '@/utils/logger';
import { sendSuccess, sendError } from '@/utils/errors';
import { SampleNoSchema, RunIdSchema, PaginationSchema } from '@/schemas/result.schemas';
import { authenticate } from '@/middleware/auth.middleware';

export function directResultRoutes(): Router {
  const router = Router();
  const prisma = new PrismaClient();
  const directResultService = new DirectResultService(prisma);







  router.get('/samples', async (request, response) => {
    try {
      const result = await directResultService.getAllSamples();

      logger.info('All samples retrieved directly from database', {
        requestId: (request as any).id || 'unknown'
      });

      return sendSuccess(response, result);
    } catch (error) {
      logger.error('Failed to get all samples directly', {
        requestId: (request as any).id || 'unknown',
        error
      });
      return sendError(response, error as any);
    }
  });



  router.get('/samples/:sampleNo/summary', async (request, response) => {
    try {
      const sampleNo = SampleNoSchema.parse(request.params.sampleNo);
      const result = await directResultService.getSampleSummary(sampleNo);

      logger.info('Sample summary retrieved directly from database', {
        requestId: (request as any).id || 'unknown',
        sampleNo
      });

      return sendSuccess(response, result);
    } catch (error) {
      logger.error('Failed to get sample summary directly', {
        requestId: (request as any).id || 'unknown',
        sampleNo: request.params.sampleNo,
        error
      });
      return sendError(response, error as any);
    }
  });



  router.get('/samples/:sampleNo/runs', async (request, response) => {
    try {
      const sampleNo = SampleNoSchema.parse(request.params.sampleNo);
      const paginationOptions = PaginationSchema.parse(request.query);

      const result = await directResultService.getSampleRuns(sampleNo, paginationOptions as any);

      logger.info('Sample runs retrieved directly from database', {
        requestId: (request as any).id || 'unknown',
        sampleNo,
        page: paginationOptions.page,
        limit: paginationOptions.limit
      });

      return sendSuccess(response, result);
    } catch (error) {
      logger.error('Failed to get sample runs directly', {
        requestId: (request as any).id || 'unknown',
        sampleNo: request.params.sampleNo,
        error
      });
      return sendError(response, error as any);
    }
  });







  router.get('/runs/:runId', async (request, response) => {
    try {
      const runId = RunIdSchema.parse(request.params.runId);
      const result = await directResultService.getRunDetails(runId);

      logger.info('Run details retrieved directly from database', {
        requestId: (request as any).id || 'unknown',
        runId,
        sampleNo: result.sampleNo
      });

      return sendSuccess(response, result);
    } catch (error) {
      logger.error('Failed to get run details directly', {
        requestId: (request as any).id || 'unknown',
        runId: request.params.runId,
        error
      });
      return sendError(response, error as any);
    }
  });

  router.patch('/runs/:runId/distribution', authenticate, async (request, response) => {
    try {
      const runId = RunIdSchema.parse(request.params.runId);
      const { distribution } = request.body;
      const user = (request as any).user;

      if (!distribution || typeof distribution !== 'object') {
        return response.status(400).json({
          success: false,
          error: { code: 'INVALID_INPUT', message: 'Distribution object is required' }
        });
      }

      await directResultService.updateRunDistribution(runId, distribution, user.id);

      logger.info('Run distribution updated successfully', {
        requestId: (request as any).id || 'unknown',
        runId,
        userId: user.id
      });

      return sendSuccess(response, {
        success: true,
        message: 'Run distribution updated successfully'
      });
    } catch (error) {
      logger.error('Failed to update run distribution', {
        requestId: (request as any).id || 'unknown',
        runId: request.params.runId,
        error
      });
      return sendError(response, error as any);
    }
  });



  router.delete('/runs/:runId', async (request, response) => {
    try {
      const runId = RunIdSchema.parse(request.params.runId);


      const run = await prisma.predictionRun.findUnique({
        where: { id: runId },
        select: { sampleNo: true }
      });

      if (!run) {
        return response.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Run not found' }
        });
      }

      const sampleNo = run.sampleNo;


      await prisma.wellPrediction.deleteMany({ where: { runId } });
      await prisma.rowCounts.deleteMany({ where: { runId } });
      await prisma.inferenceResult.deleteMany({ where: { runId } });


      await prisma.predictionRun.delete({ where: { id: runId } });

      logger.info('Run deleted successfully', {
        requestId: (request as any).id || 'unknown',
        runId,
        sampleNo
      });


      await directResultService.recalculateSampleSummary(sampleNo);

      logger.info('Sample summary recalculated after run deletion', {
        requestId: (request as any).id || 'unknown',
        sampleNo
      });

      return sendSuccess(response, {
        success: true,
        message: 'Run deleted and sample summary recalculated',
        sampleNo
      });
    } catch (error) {
      logger.error('Failed to delete run', {
        requestId: (request as any).id || 'unknown',
        runId: request.params.runId,
        error
      });
      return sendError(response, error as any);
    }
  });

  return router;
}
