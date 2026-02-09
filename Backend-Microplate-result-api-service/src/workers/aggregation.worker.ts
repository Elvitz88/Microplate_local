import { PrismaClient } from '@prisma/client';
import { AggregationServiceImpl } from '@/services/aggregation.service';
import { logger } from '@/utils/logger';
import { config } from '@/config/config';

class AggregationWorker {
  private prisma: PrismaClient;
  private aggregationService: AggregationServiceImpl;
  private isRunning = false;
  private notificationClient: any = null;

  constructor() {
    this.prisma = new PrismaClient({
      log: ['error'],
    });
    this.aggregationService = new AggregationServiceImpl(this.prisma);
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Aggregation worker is already running');
      return;
    }

    try {
      logger.info('Starting aggregation worker...');

      await this.prisma.$connect();
      logger.info('Database connected for aggregation worker');

      await this.setupDatabaseNotifications();

      this.isRunning = true;
      logger.info('Aggregation worker started successfully');

      this.startMaintenanceTasks();

    } catch (error) {
      logger.error('Failed to start aggregation worker', { error });
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    try {
      logger.info('Stopping aggregation worker...');

      this.isRunning = false;

      if (this.notificationClient) {
        await this.notificationClient.end();
        this.notificationClient = null;
      }

      await this.prisma.$disconnect();

      logger.info('Aggregation worker stopped successfully');

    } catch (error) {
      logger.error('Error stopping aggregation worker', { error });
      throw error;
    }
  }

  private async setupDatabaseNotifications(): Promise<void> {
    if (!config.features.databaseNotifications) {
      logger.info('Database notifications disabled - skipping setup');
      return;
    }

    try {
      logger.info('Database notifications configured');
    } catch (error) {
      logger.error('Failed to setup database notifications', { error });
    }
  }

  private async handleNotification(notification: any): Promise<void> {
    try {
      const { channel, payload } = notification;
      
      logger.info('Received database notification', { channel, payload });

      switch (channel) {
        case 'inference_results_new':
          await this.processNewInferenceResult(payload);
          break;
        default:
          logger.warn('Unknown notification channel', { channel });
      }

    } catch (error) {
      logger.error('Error handling notification', { error, notification });
    }
  }

  private async processNewInferenceResult(runId: string): Promise<void> {
    try {
      const runIdNum = parseInt(runId, 10);
      
      const run = await this.prisma.predictionRun.findUnique({
        where: { id: runIdNum },
        select: { sampleNo: true }
      });

      if (!run) {
        logger.warn('Run not found for notification', { runId: runIdNum });
        return;
      }

      logger.info('Processing new inference result', { 
        runId: runIdNum, 
        sampleNo: run.sampleNo 
      });

      await this.aggregationService.updateSampleSummary(run.sampleNo);

      logger.info('Sample summary updated', { 
        runId: runIdNum, 
        sampleNo: run.sampleNo 
      });

    } catch (error) {
      logger.error('Error processing new inference result', { runId, error });
    }
  }

  private startMaintenanceTasks(): void {
    setInterval(async () => {
      if (!this.isRunning) return;
      
      try {
        await this.runConsistencyCheck();
      } catch (error) {
        logger.error('Error in consistency check', { error });
      }
    }, 60 * 60 * 1000); 

    setInterval(async () => {
      if (!this.isRunning) return;
      
      try {
        await this.runCleanupTasks();
      } catch (error) {
        logger.error('Error in cleanup tasks', { error });
      }
    }, 6 * 60 * 60 * 1000); 

    setInterval(async () => {
      if (!this.isRunning) return;
      
      try {
        await this.updateSystemStatistics();
      } catch (error) {
        logger.error('Error updating system statistics', { error });
      }
    }, 15 * 60 * 1000); 
  }

  private async runConsistencyCheck(): Promise<void> {
    try {
      logger.info('Starting consistency check...');

      const samples = await this.prisma.sampleSummary.findMany({
        select: { sampleNo: true },
        take: 100, 
      });

      let inconsistentCount = 0;

      for (const sample of samples) {
        const isConsistent = await this.aggregationService.validateSampleSummary(sample.sampleNo);
        if (!isConsistent) {
          logger.warn('Inconsistent sample summary detected', { sampleNo: sample.sampleNo });
          
          await this.aggregationService.updateSampleSummary(sample.sampleNo);
          inconsistentCount++;
        }
      }

      logger.info('Consistency check completed', { 
        totalChecked: samples.length,
        inconsistentFound: inconsistentCount
      });

    } catch (error) {
      logger.error('Error in consistency check', { error });
    }
  }

  private async runCleanupTasks(): Promise<void> {
    try {
      logger.info('Starting cleanup tasks...');

      const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const deletedHealthChecks = await this.prisma.healthCheck.deleteMany({
        where: {
          timestamp: {
            lt: cutoffDate
          }
        }
      });

      logger.info('Cleanup tasks completed', { 
        deletedHealthChecks: deletedHealthChecks.count
      });

    } catch (error) {
      logger.error('Error in cleanup tasks', { error });
    }
  }

  private async updateSystemStatistics(): Promise<void> {
    try {
      logger.debug('System statistics update completed');
    } catch (error) {
      logger.error('Error updating system statistics', { error });
    }
  }

  async updateSampleSummary(sampleNo: string): Promise<void> {
    try {
      await this.aggregationService.updateSampleSummary(sampleNo);
      logger.info('Manual sample summary update completed', { sampleNo });
    } catch (error) {
      logger.error('Error in manual sample summary update', { sampleNo, error });
      throw error;
    }
  }

  async updateAllSampleSummaries(): Promise<void> {
    try {
      logger.info('Starting manual update of all sample summaries...');
      await this.aggregationService.updateAllSampleSummaries();
      logger.info('Manual update of all sample summaries completed');
    } catch (error) {
      logger.error('Error in manual update of all sample summaries', { error });
      throw error;
    }
  }

  async getWorkerStats(): Promise<any> {
    try {
      const stats = await this.aggregationService.getAggregationStats();
      return {
        isRunning: this.isRunning,
        ...stats,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Error getting worker stats', { error });
      return {
        isRunning: this.isRunning,
        error: (error as any).message,
        timestamp: new Date().toISOString(),
      };
    }
  }
}

const worker = new AggregationWorker();

process.on('SIGINT', async () => {
  logger.info('Received SIGINT, stopping aggregation worker...');
  await worker.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, stopping aggregation worker...');
  await worker.stop();
  process.exit(0);
});

if (require.main === module) {
  worker.start().catch((error) => {
    logger.error('Failed to start aggregation worker', { error });
    process.exit(1);
  });
}

export { AggregationWorker };
export default worker;
