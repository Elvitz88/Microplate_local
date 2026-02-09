import { Request, Response } from 'express';
import { ResultService, PaginationOptions, WebSocketService } from '@/types/result.types';
import { sendSuccess, sendError, AppError } from '@/utils/errors';
import { logger } from '@/utils/logger';
import { StatisticsFilters } from '@/schemas/result.schemas';
import packageJson from '../../package.json';

type SampleQueryParams = {
  page?: string;
  limit?: string;
  sortBy?: string;
  sortOrder?: string;
  search?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
};
export class ResultController {
  constructor(
    private resultService: ResultService,
    private websocketService: WebSocketService
  ) {}

  

  

  async getSamples(request: Request, response: Response) {
    try {
      const query = request.query as SampleQueryParams;
      const sortBy = typeof query.sortBy === 'string' ? query.sortBy : undefined;
      const sortOrder =
        query.sortOrder === 'asc' || query.sortOrder === 'desc' ? query.sortOrder : undefined;

      const options: PaginationOptions = {
        page: Number.parseInt(query.page ?? '1', 10) || 1,
        limit: Number.parseInt(query.limit ?? '20', 10) || 20,
        ...(sortBy ? { sortBy } : {}),
        ...(sortOrder ? { sortOrder } : {}),
      };

      const filters = {
        search: typeof query.search === 'string' ? query.search : undefined,
        status: typeof query.status === 'string' ? query.status : undefined,
        dateFrom: typeof query.dateFrom === 'string' ? query.dateFrom : undefined,
        dateTo: typeof query.dateTo === 'string' ? query.dateTo : undefined,
      };

      const result = await this.resultService.getSamples({ ...options, filters });

      logger.info('Samples retrieved', { 
        requestId: (request as any).id || 'unknown',
        total: result.pagination.total,
        page: result.pagination.page,
        filters
      });

      return sendSuccess(response, result);
    } catch (error) {
      logger.error('Failed to get samples', { requestId: (request as any).id || 'unknown', error });
      
      
      if (error instanceof Error && 'response' in error) {
        
        const axiosError = error as any;
        const statusCode = axiosError.response?.status || 500;
        const message = axiosError.response?.data?.message || axiosError.message || 'External service error';
        
        return sendError(response, new AppError(message, statusCode, 'EXTERNAL_SERVICE_ERROR', {
          service: 'prediction-db-service',
          originalError: axiosError.message
        }));
      } else if (error instanceof AppError) {
        return sendError(response, error);
      } else {
        
        return sendError(response, new AppError(
          error instanceof Error ? error.message : 'Unknown error occurred',
          500,
          'INTERNAL_ERROR'
        ));
      }
    }
  }

  async getSampleDetails(request: Request, response: Response) {
    try {
      const { sampleNo } = request.params as { sampleNo: string };
      const result = await this.resultService.getSampleDetails(sampleNo);

      logger.info('Sample details retrieved', { 
        requestId: (request as any).id || 'unknown',
        sampleNo,
        totalRuns: result.totalRuns
      });

      return sendSuccess(response, result);
    } catch (error) {
      logger.error('Failed to get sample details', { 
        requestId: (request as any).id || 'unknown',
        sampleNo: (request.params as any)?.sampleNo,
        error 
      });
      return sendError(response, error as any);
    }
  }

  async getSampleSummary(request: Request, response: Response) {
    try {
      const { sampleNo } = request.params as { sampleNo: string };
      const result = await this.resultService.getSampleSummary(sampleNo);

      logger.info('Sample summary retrieved', { 
        requestId: (request as any).id || 'unknown',
        sampleNo
      });

      return sendSuccess(response, result);
    } catch (error) {
      logger.error('Failed to get sample summary', { 
        requestId: (request as any).id || 'unknown',
        sampleNo: (request.params as any)?.sampleNo,
        error 
      });
      return sendError(response, error as any);
    }
  }

  async getSampleRuns(request: Request, response: Response) {
    try {
      const { sampleNo } = request.params as { sampleNo: string };
      const query = request.query as any;
      
      const options: PaginationOptions = {
        page: parseInt(query.page) || 1,
        limit: parseInt(query.limit) || 20,
        ...(query.sortBy ? { sortBy: query.sortBy } : {}),
        ...(query.sortOrder ? { sortOrder: query.sortOrder } : {}),
      };

      const result = await this.resultService.getSampleRuns(sampleNo, options);

      logger.info('Sample runs retrieved', { 
        requestId: (request as any).id || 'unknown',
        sampleNo,
        total: result.pagination.total,
        page: result.pagination.page
      });

      return sendSuccess(response, result);
    } catch (error) {
      logger.error('Failed to get sample runs', { 
        requestId: (request as any).id || 'unknown',
        sampleNo: (request.params as any)?.sampleNo,
        error 
      });
      return sendError(response, error as any);
    }
  }

  async getLastRun(request: Request, response: Response) {
    try {
      const { sampleNo } = request.params as { sampleNo: string };
      const result = await this.resultService.getLastRun(sampleNo);

      logger.info('Last run retrieved', { 
        requestId: (request as any).id || 'unknown',
        sampleNo,
        runId: result.runId
      });

      return sendSuccess(response, result);
    } catch (error) {
      logger.error('Failed to get last run', { 
        requestId: (request as any).id || 'unknown',
        sampleNo: (request.params as any)?.sampleNo,
        error 
      });
      return sendError(response, error as any);
    }
  }

  async getSampleTrends(request: Request, response: Response) {
    try {
      const { sampleNo } = request.params as { sampleNo: string };
      const result = await this.resultService.getSampleTrends(sampleNo);

      logger.info('Sample trends retrieved', { 
        requestId: (request as any).id || 'unknown',
        sampleNo,
        trendPoints: result.trends.confidenceTrend.length
      });

      return sendSuccess(response, result);
    } catch (error) {
      logger.error('Failed to get sample trends', { 
        requestId: (request as any).id || 'unknown',
        sampleNo: (request.params as any)?.sampleNo,
        error 
      });
      return sendError(response, error as any);
    }
  }

  

  

  async getRunDetails(request: Request, response: Response) {
    try {
      const { runId } = request.params as any;
      const result = await this.resultService.getRunDetails(runId);

      logger.info('Run details retrieved', { 
        requestId: (request as any).id || 'unknown',
        runId,
        sampleNo: result.sampleNo
      });

      return sendSuccess(response, result);
    } catch (error) {
      logger.error('Failed to get run details', { 
        requestId: (request as any).id || 'unknown',
        runId: (request.params as any)?.runId,
        error 
      });
      return sendError(response, error as any);
    }
  }

  

  

  async getSystemStatistics(request: Request, response: Response) {
    try {
      const query = request.query as StatisticsFilters;
      const filters: StatisticsFilters = {};
      if (typeof query.dateFrom === 'string') {
        filters.dateFrom = query.dateFrom;
      }
      if (typeof query.dateTo === 'string') {
        filters.dateTo = query.dateTo;
      }
      if (query.groupBy === 'day' || query.groupBy === 'week' || query.groupBy === 'month') {
        filters.groupBy = query.groupBy;
      }

      const result = await this.resultService.getSystemStatistics(filters);

      logger.info('System statistics retrieved', { 
        requestId: (request as any).id || 'unknown',
        totalSamples: result.totalSamples,
        totalRuns: result.totalRuns
      });

      return sendSuccess(response, result);
    } catch (error) {
      logger.error('Failed to get system statistics', { 
        requestId: (request as any).id || 'unknown',
        error 
      });
      return sendError(response, error as any);
    }
  }

  

  

  async invalidateSampleCache(request: Request, response: Response) {
    try {
      const { sampleNo } = request.params as { sampleNo: string };
      
      
      const user = (request as any).user;
      if (!user || !user.roles.includes('admin')) {
        return response.status(403).send({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Insufficient permissions to invalidate cache',
          }
        });
      }

      await (this.resultService as any).invalidateSampleCache(sampleNo);

      logger.info('Sample cache invalidated', { 
        requestId: (request as any).id || 'unknown',
        sampleNo,
        userId: user.id
      });

      return sendSuccess(response, { message: 'Cache invalidated successfully' });
    } catch (error) {
      logger.error('Failed to invalidate sample cache', { 
        requestId: (request as any).id || 'unknown',
        sampleNo: (request.params as any)?.sampleNo,
        error 
      });
      return sendError(response, error as any);
    }
  }

  async invalidateSystemCache(request: Request, response: Response) {
    try {
      
      const user = (request as any).user;
      if (!user || !user.roles.includes('admin')) {
        return response.status(403).send({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Insufficient permissions to invalidate cache',
          }
        });
      }

      await (this.resultService as any).invalidateSystemCache();

      logger.info('System cache invalidated', { 
        requestId: (request as any).id || 'unknown',
        userId: user.id
      });

      return sendSuccess(response, { message: 'System cache invalidated successfully' });
    } catch (error) {
      logger.error('Failed to invalidate system cache', { 
        requestId: (request as any).id || 'unknown',
        error 
      });
      return sendError(response, error as any);
    }
  }

  

  

  async healthCheck(request: Request, response: Response) {
    try {
      const healthStatus = {
        status: 'healthy' as const,
        timestamp: new Date().toISOString(),
        version: packageJson.version,
        uptime: process.uptime(),
        dependencies: {
          database: 'healthy' as const,
          cache: 'healthy' as const,
          websocket: (this.websocketService as any).isHealthy() ? 'healthy' as const : 'unhealthy' as const,
        }
      };

      return sendSuccess(response, healthStatus);
    } catch (error) {
      logger.error('Health check failed', { requestId: (request as any).id || 'unknown', error });
      
      const healthStatus = {
        status: 'unhealthy' as const,
        timestamp: new Date().toISOString(),
        version: packageJson.version,
        uptime: process.uptime(),
        dependencies: {
          database: 'unhealthy' as const,
          cache: 'unhealthy' as const,
          websocket: 'unhealthy' as const,
        }
      };

      return response.status(503).send({
        success: false,
        data: healthStatus
      });
    }
  }

  async readinessCheck(request: Request, response: Response) {
    try {
      
      await (this.resultService as any).prisma.$queryRaw`SELECT 1`;
      
      
      const cacheHealthy = await (this.resultService as any).cache.healthCheck();

      const isReady = cacheHealthy;
      
      if (isReady) {
        return sendSuccess(response, { 
          status: 'ready',
          timestamp: new Date().toISOString()
        });
      } else {
        return response.status(503).send({
          success: false,
          error: {
            code: 'NOT_READY',
            message: 'Service not ready',
          }
        });
      }
    } catch (error) {
      logger.error('Readiness check failed', { requestId: (request as any).id || 'unknown', error });
      
      return response.status(503).send({
        success: false,
        error: {
          code: 'NOT_READY',
          message: 'Service not ready',
        }
      });
    }
  }

  async getMetrics(request: Request, response: Response) {
    try {
      
      const metrics = {
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        websocket: (this.websocketService as any).getConnectionStats(),
      };

      return sendSuccess(response, metrics);
    } catch (error) {
      logger.error('Failed to get metrics', { requestId: (request as any).id || 'unknown', error });
      return sendError(response, error as any);
    }
  }

  async updateSampleSummary(request: Request, response: Response) {
    try {
      const { sampleNo } = request.params;
      const { runId } = request.body;

      logger.info('Received sample summary update request', { sampleNo, runId });

      
      const aggregationService = (request.app as any).locals.aggregationService;
      
      if (!aggregationService) {
        logger.error('Aggregation service not available');
        return response.status(500).json({ 
          success: false, 
          error: { code: 'SERVICE_UNAVAILABLE', message: 'Aggregation service not available' } 
        });
      }

      
      await aggregationService.updateSampleSummary(sampleNo);

      logger.info('Sample summary updated successfully', { sampleNo, runId });

      return response.json({ 
        success: true, 
        message: 'Sample summary updated successfully',
        sampleNo,
        runId,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Failed to update sample summary', { requestId: (request as any).id || 'unknown', error });
      return response.status(500).json({ 
        success: false, 
        error: { code: 'UPDATE_FAILED', message: 'Failed to update sample summary' } 
      });
    }
  }

  

  

  async getLogs(request: Request, response: Response) {
    try {
      const { level = 'all', limit = '100' } = request.query as { level?: string; limit?: string };
      const limitNum = Math.min(parseInt(limit, 10) || 100, 1000);

      
      const logsService = (request.app as any).locals.logsService;
      
      if (!logsService) {
        logger.error('Logs service not available');
        return response.status(500).json({ 
          success: false, 
          error: { code: 'SERVICE_UNAVAILABLE', message: 'Logs service not available' } 
        });
      }

      const logs = await logsService.getLogs(level === 'all' ? undefined : level as any, limitNum);

      logger.info('Logs retrieved', { 
        requestId: (request as any).id || 'unknown',
        level,
        limit: limitNum,
        total: logs.length
      });

      return sendSuccess(response, {
        logs,
        total: logs.length,
        level,
        limit: limitNum
      });
    } catch (error) {
      logger.error('Failed to get logs', { requestId: (request as any).id || 'unknown', error });
      return sendError(response, error as any);
    }
  }

  async clearLogs(request: Request, response: Response) {
    try {
      
      const logsService = (request.app as any).locals.logsService;
      
      if (!logsService) {
        logger.error('Logs service not available');
        return response.status(500).json({ 
          success: false, 
          error: { code: 'SERVICE_UNAVAILABLE', message: 'Logs service not available' } 
        });
      }

      await logsService.clearLogs();

      logger.info('Logs cleared', { requestId: (request as any).id || 'unknown' });

      return sendSuccess(response, { message: 'Logs cleared successfully' });
    } catch (error) {
      logger.error('Failed to clear logs', { requestId: (request as any).id || 'unknown', error });
      return sendError(response, error as any);
    }
  }

  async getInterfaceFiles(request: Request, response: Response) {
    try {
      const { sampleNo } = request.params as { sampleNo: string };
      
      logger.info('Getting interface files for sample', { sampleNo });
      
      const files = await this.resultService.getInterfaceFiles(sampleNo);
      
      return sendSuccess(response, files);
    } catch (error) {
      logger.error('Failed to get interface files', { sampleNo: (request.params as any)?.sampleNo, error });
      return sendError(response, error as any);
    }
  }

  async downloadInterfaceFile(request: Request, response: Response) {
    try {
      const { sampleNo, filename } = request.params as { sampleNo: string; filename: string };
      
      logger.info('Downloading interface file', { sampleNo, filename });
      
      const downloadUrl = await this.resultService.getInterfaceFileDownloadUrl(sampleNo, filename);
      
      if (!downloadUrl) {
        return response.status(404).json({
          success: false,
          error: {
            code: 'FILE_NOT_FOUND',
            message: 'Interface file not found'
          }
        });
      }
      
      // Return the download URL directly in JSON response
      // The frontend will handle the actual download from this URL
      return sendSuccess(response, { downloadUrl });
    } catch (error) {
      logger.error('Failed to download interface file', { sampleNo: (request.params as any)?.sampleNo, filename: (request.params as any)?.filename, error });
      return sendError(response, error as any);
    }
  }
}
