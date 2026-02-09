

import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/logger';

export interface SampleSummaryData {
  sampleNo: string;
  submissionNo?: string; 
  description?: string;  
  summary: {
    distribution: Record<string, number>;
    concentration?: {
      positive_percentage: number;
      negative_percentage: number;
    };
    quality_metrics?: {
      average_confidence: number;
      high_confidence_percentage: number;
    };
  };
  totalRuns: number;
  lastRunAt: Date | null;
  lastRunId: number | null;
  createdAt: Date;
  updatedAt: Date;
}

interface SampleSummaryServiceConfig {
  resultApiServiceUrl: string;
  token: string;
  timeout?: number;
}

class SampleSummaryService {
  private client: AxiosInstance;

  constructor(config: SampleSummaryServiceConfig) {
    this.client = axios.create({
      baseURL: config.resultApiServiceUrl,
      timeout: config.timeout || 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  
  async getSampleSummary(sampleNo: string): Promise<SampleSummaryData> {
    try {
      const response = await this.client.get(`/api/v1/results/samples/${sampleNo}/summary`);

      if (response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.error?.message || 'Failed to get sample summary');
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        throw new Error(`Sample ${sampleNo} not found`);
      }
      logger.error('Failed to get sample summary', { error, sampleNo });
      throw error;
    }
  }

  
  async exists(sampleNo: string): Promise<boolean> {
    try {
      await this.getSampleSummary(sampleNo);
      return true;
    } catch (_error) {
      return false;
    }
  }

}


export function createSampleSummaryService(config: SampleSummaryServiceConfig): SampleSummaryService {
  return new SampleSummaryService(config);
}
