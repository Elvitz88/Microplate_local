import { Router, Request, Response } from 'express';
import { prisma } from '../server';
import { logger } from '../utils/logger';

export function databaseRoutes(): Router {
  const router = Router();

  
  router.get('/status', async (_request: Request, response: Response) => {
    try {
      const result = await prisma.$queryRaw`
        SELECT 
          schemaname,
          tablename,
          tableowner
        FROM pg_tables 
        WHERE schemaname IN ('prediction_result', 'public')
        ORDER BY schemaname, tablename;
      `;

      response.json({
        status: 'connected',
        schemas: {
          prediction_result: (result as any[]).filter(r => r.schemaname === 'prediction_result'),
          public: (result as any[]).filter(r => r.schemaname === 'public'),
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Database status check failed:', String(error));
      response.status(500).json({
        status: 'error',
        error: 'Failed to get database status',
        timestamp: new Date().toISOString(),
      });
    }
  });

 
  router.get('/tables/:schema', async (request: Request, response: Response) => {
    const { schema } = request.params;

    if (!schema || !['prediction_result', 'public'].includes(schema)) {
      return response.status(400).json({
        error: 'Invalid schema. Must be "prediction_result" or "public"',
      });
    }

    try {
      const tables = await prisma.$queryRaw`
        SELECT 
          table_name,
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM information_schema.columns 
        WHERE table_schema = ${schema}
        ORDER BY table_name, ordinal_position;
      `;

      return response.json({
        schema,
        tables,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error(`Failed to get tables for schema ${schema}:`, String(error));
      return response.status(500).json({
        error: 'Failed to get table information',
        timestamp: new Date().toISOString(),
      });
    }
  });

  
  router.get('/stats/predictions', async (_request: Request, response: Response) => {
    try {
      const stats = await prisma.predictionRun.groupBy({
        by: ['status'],
        _count: {
          id: true,
        },
      });

      const totalRuns = await prisma.predictionRun.count();
      const recentRuns = await prisma.predictionRun.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), 
          },
        },
      });

      response.json({
        totalRuns,
        recentRuns,
        statusBreakdown: stats,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Failed to get prediction stats:', String(error));
      response.status(500).json({
        error: 'Failed to get prediction statistics',
        timestamp: new Date().toISOString(),
      });
    }
  });

  
  router.get('/stats/samples', async (_request: Request, response: Response) => {
    response.status(501).json({
      error: 'Endpoint moved to result-api-service',
      hint: 'Use result-api-service /api/v1/... endpoints for sample summaries',
      timestamp: new Date().toISOString(),
    });
  });

  
  router.post('/maintenance/cleanup', async (_request: Request, response: Response) => {
    try {
      
      const healthCheckResult = await prisma.healthCheck.deleteMany({
        where: {
          timestamp: {
            lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      });

      
      const failedRunsResult = await prisma.predictionRun.deleteMany({
        where: {
          status: 'failed',
          createdAt: {
            lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      });

      response.json({
        message: 'Database cleanup completed',
        results: {
          healthChecksDeleted: healthCheckResult.count,
          failedRunsDeleted: failedRunsResult.count,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Database cleanup failed:', String(error));
      response.status(500).json({
        error: 'Database cleanup failed',
        timestamp: new Date().toISOString(),
      });
    }
  });

  return router;
}