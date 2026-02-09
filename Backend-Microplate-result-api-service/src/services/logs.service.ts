import { logger } from '@/utils/logger';

type LogLevel = 'info' | 'warn' | 'error';

type LogEntry = {
  id: string;
  time: number;
  level: LogLevel;
  method: string;
  url: string;
  statusCode: number;
  latencyMs: number;
  requestId?: string;
  userId?: string;
  ip?: string;
  service?: string;
  message?: string;
};

export class LogsService {
  private key: string;
  private capacity: number;
  
  constructor(key = 'microplate:logs', capacity = 5000) {
    this.key = key;
    this.capacity = capacity;
  }

  async addLog(entry: LogEntry): Promise<void> {
    
    try {
      logger.debug('Log entry', { entry });
    } catch (error) {
      logger.error('Failed to add log', { error, entry });
    }
  }

  async getLogs(level?: LogLevel, _limit = 100): Promise<LogEntry[]> {
    
    return [];
  }

  async clearLogs(): Promise<void> {
    
    logger.info('clearLogs called (logs are handled by winston, not stored here)');
  }

  async getLogStats(): Promise<{ total: number; byLevel: Record<LogLevel, number> }> {
    
    return {
      total: 0,
      byLevel: {
        info: 0,
        warn: 0,
        error: 0,
      } as Record<LogLevel, number>
    };
  }

  
  async addSampleLogs(): Promise<void> {
    const now = Date.now();
    const sampleLogs: LogEntry[] = [
      {
        id: '1',
        time: now - 1000,
        level: 'info',
        method: 'POST',
        url: '/api/v1/vision/predict',
        statusCode: 200,
        latencyMs: 1500,
        requestId: 'req_001',
        userId: 'user_001',
        ip: '192.168.1.100',
        service: 'vision-inference',
        message: 'Prediction completed successfully'
      },
      {
        id: '2',
        time: now - 2000,
        level: 'info',
        method: 'POST',
        url: '/api/v1/images',
        statusCode: 201,
        latencyMs: 800,
        requestId: 'req_002',
        userId: 'user_001',
        ip: '192.168.1.100',
        service: 'image-ingestion',
        message: 'Image uploaded successfully'
      },
      {
        id: '3',
        time: now - 3000,
        level: 'error',
        method: 'POST',
        url: '/api/v1/vision/predict',
        statusCode: 500,
        latencyMs: 2000,
        requestId: 'req_003',
        userId: 'user_002',
        ip: '192.168.1.101',
        service: 'vision-inference',
        message: 'Model inference failed'
      },
      {
        id: '4',
        time: now - 4000,
        level: 'warn',
        method: 'GET',
        url: '/api/v1/result/samples/TEST001',
        statusCode: 404,
        latencyMs: 200,
        requestId: 'req_004',
        userId: 'user_003',
        ip: '192.168.1.102',
        service: 'result-api',
        message: 'Sample not found'
      },
      {
        id: '5',
        time: now - 5000,
        level: 'info',
        method: 'POST',
        url: '/api/v1/auth/login',
        statusCode: 200,
        latencyMs: 300,
        requestId: 'req_005',
        userId: 'user_004',
        ip: '192.168.1.103',
        service: 'auth-service',
        message: 'User login successful'
      }
    ];

    for (const log of sampleLogs) {
      await this.addLog(log);
    }
  }

  async disconnect(): Promise<void> {
  }
}
