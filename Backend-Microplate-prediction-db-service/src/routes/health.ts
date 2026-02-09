import { Router, Request, Response } from 'express';
import { prisma } from '../server';
import { logger } from '../utils/logger';
import packageJson from '../../package.json';

export function healthRoutes(): Router {
  const router = Router();

  
  router.get('/', async (_request: Request, response: Response) => {
    response.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'prediction-db-service',
      version: packageJson.version,
    });
  });

  
  router.get('/detailed', async (_request: Request, response: Response) => {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'prediction-db-service',
      version: packageJson.version,
      checks: {
        database: 'unknown',
      },
    };

    try {
      
      await prisma.$queryRaw`SELECT 1`;
      health.checks.database = 'healthy';
    } catch (error) {
      logger.error('Database health check failed:', String(error));
      health.checks.database = 'unhealthy';
      health.status = 'unhealthy';
    }

    const statusCode = health.status === 'healthy' ? 200 : 503;
    response.status(statusCode).json(health);
  });

  
  router.get('/ready', async (_request: Request, response: Response) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      response.status(200).json({
        status: 'ready',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Readiness check failed:', String(error));
      response.status(503).json({
        status: 'not_ready',
        timestamp: new Date().toISOString(),
        error: 'Database connection failed',
      });
    }
  });

  
  router.get('/live', async (_request: Request, response: Response) => {
    response.status(200).json({
      status: 'alive',
      timestamp: new Date().toISOString(),
    });
  });

  return router;
}