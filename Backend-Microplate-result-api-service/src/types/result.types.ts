import type { StatisticsFilters } from '@/schemas/result.schemas';

export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}





export interface SampleSummary {
  sampleNo: string;
  submissionNo?: string | undefined; 
  description?: string | undefined; 
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

export interface SampleDetails extends SampleSummary {
  submissionNo?: string;
  firstRunAt: Date | null;
  status: 'active' | 'completed' | 'failed';
  runs: PredictionRunSummary[];
}

export interface PredictionRunSummary {
  runId: number;
  sampleNo?: string; 
  submissionNo?: string; 
  description?: string;   
  predictAt: Date;
  modelVersion?: string;
  status: string;
  processingTimeMs?: number;
  statistics: {
    totalDetections: number;
    positiveCount: number;
    negativeCount: number;
    averageConfidence: number;
  };
  inferenceResults?: any[];
  wellPredictions?: any[];
  
  rawImagePath?: string;
  annotatedImagePath?: string;
}





export interface PredictionRunDetails {
  runId: number;
  sampleNo: string;
  submissionNo?: string;
  description?: string;
  predictAt: Date;
  modelVersion?: string;
  status: string;
  processingTimeMs?: number;
  errorMsg?: string | null;
  rawImageUrl?: string;
  annotatedImageUrl?: string;
  statistics: {
    totalDetections: number;
    positiveCount: number;
    negativeCount: number;
    invalidCount: number;
    averageConfidence: number;
  };
  rowCounts: Record<string, number>;
  inferenceResults: {
    distribution: Record<string, number>;
    concentration?: {
      positive_percentage: number;
      negative_percentage: number;
    };
    quality_metrics?: {
      image_quality_score: number;
      well_detection_accuracy: number;
      overall_confidence: number;
    };
  };
  wellPredictions: WellPrediction[];
}

interface WellPrediction {
  wellId: string;
  label: string;
  class: string;
  confidence: number;
  bbox: {
    xmin: number;
    ymin: number;
    xmax: number;
    ymax: number;
  };
}





export interface SystemStatistics {
  totalSamples: number;
  totalRuns: number;
  activeSamples: number;
  completedRuns: number;
  failedRuns: number;
  averageProcessingTimeMs: number;
  successRate: number;
  dailyStats: DailyStatistics[];
  modelPerformance: Record<string, ModelPerformance>;
}

interface DailyStatistics {
  date: string;
  samplesProcessed: number;
  runsCompleted: number;
  averageConfidence: number;
}

interface ModelPerformance {
  totalRuns: number;
  successRate: number;
  averageConfidence: number;
}

export interface SampleTrends {
  sampleNo: string;
  trends: {
    confidenceTrend: ConfidenceTrendPoint[];
    distributionTrend: DistributionTrendPoint[];
  };
}

interface ConfidenceTrendPoint {
  runId: number;
  predictAt: Date;
  averageConfidence: number;
}

interface DistributionTrendPoint {
  runId: number;
  predictAt: Date;
  positiveCount: number;
  negativeCount: number;
}





export interface WebSocketMessage {
  type: string;
  data?: any;
}

export interface WebSocketNotification {
  type: 'sample_updated' | 'run_completed' | 'run_failed' | 'system_stats_updated';
  data: any;
  timestamp: Date;
}





export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    requestId?: string;
    timestamp: Date;
  };
}





export interface ResultService {
  getSampleSummary(sampleNo: string): Promise<SampleSummary>;
  getSampleDetails(sampleNo: string): Promise<SampleDetails>;
  getSampleRuns(sampleNo: string, options: PaginationOptions): Promise<PaginatedResult<PredictionRunSummary>>;
  getRunDetails(runId: number): Promise<PredictionRunDetails>;
  getLastRun(sampleNo: string): Promise<PredictionRunSummary>;
  getSamples(options: PaginationOptions & { filters?: any }): Promise<PaginatedResult<SampleSummary>>;
  getSystemStatistics(filters?: StatisticsFilters): Promise<SystemStatistics>;
  getSampleTrends(sampleNo: string): Promise<SampleTrends>;
  getInterfaceFiles(sampleNo: string): Promise<any[]>;
  getInterfaceFileDownloadUrl(sampleNo: string, filename: string): Promise<string | null>;
}

export interface AggregationService {
  updateSampleSummary(sampleNo: string): Promise<void>;
  calculateDistribution(inferenceResults: any[]): Record<string, number>;
  calculateStatistics(runs: any[]): any;
}

export interface WebSocketService {
  addConnection(connectionId: string, ws: WebSocket): void;
  removeConnection(connectionId: string, ws: WebSocket): void;
  subscribeToSample(connectionId: string, sampleNo: string): void;
  unsubscribeFromSample(connectionId: string, sampleNo: string): void;
  subscribeToRun(connectionId: string, runId: number): void;
  unsubscribeFromRun(connectionId: string, runId: number): void;
  broadcastSampleUpdate(sampleNo: string, data: any): Promise<void>;
  broadcastRunUpdate(runId: number, data: any): Promise<void>;
  broadcastSystemUpdate(data: any): Promise<void>;
  getConnectionStats(): {
    totalConnections: number;
    totalWebSockets: number;
    sampleSubscriptions: number;
    runSubscriptions: number;
    systemSubscriptions: number;
  };
  isHealthy(): boolean;
}


