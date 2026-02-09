import axios from 'axios';
import { logger } from '../utils/logger';

class NotificationService {
  private resultApiUrl: string;

  constructor() {
    this.resultApiUrl = process.env['RESULT_API_SERVICE_URL'] || 'http://result-api-service:6404';
  }

  async notifyResultApiService(sampleNo: string, runId: number): Promise<void> {
    try {
      await axios.post(
        `${this.resultApiUrl}/api/v1/results/samples/${sampleNo}/update`,
        {
          runId,
          sampleNo,
          timestamp: new Date().toISOString()
        },
        {
          timeout: 5000,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      logger.info(`Successfully notified result-api-service for sample ${sampleNo}, run ${runId}`);
    } catch (error) {
      logger.error(`Failed to notify result-api-service for sample ${sampleNo}, run ${runId}:`, String(error));
      
    }
  }
}

export const notificationService = new NotificationService();
