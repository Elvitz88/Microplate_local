import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { 
  ResultService, 
  SampleSummary, 
  SampleDetails, 
  PredictionRunDetails, 
  PredictionRunSummary,
  PaginationOptions,
  PaginatedResult,
  SystemStatistics,
  SampleTrends
} from '@/types/result.types';
import type { StatisticsFilters } from '@/schemas/result.schemas';
import { createError } from '@/utils/errors';
import { logger } from '@/utils/logger';
import { AggregationServiceImpl } from '@/services/aggregation.service';

export class ResultServiceImpl implements ResultService {
  private predictionDbServiceUrl: string;

  constructor(
    private prisma: PrismaClient
  ) {
    this.predictionDbServiceUrl = process.env.PREDICTION_DB_SERVICE_URL || 'http://localhost:6406';
  }

  async getSampleSummary(sampleNo: string): Promise<SampleSummary> {
    
    let summary = await this.prisma.sampleSummary.findUnique({
      where: { sampleNo }
    });

    if (!summary) {
      const runCount = await this.prisma.predictionRun.count({ where: { sampleNo } });

      if (runCount > 0) {
        logger.warn('Sample summary missing despite existing runs, triggering aggregation', { sampleNo });
        const aggregationService = new AggregationServiceImpl(this.prisma);
        await aggregationService.updateSampleSummary(sampleNo);

        summary = await this.prisma.sampleSummary.findUnique({
          where: { sampleNo }
        });
      }

      if (!summary) {
        const emptySummary = this.createEmptySampleSummary(sampleNo);
        logger.info('Returning empty sample summary', { sampleNo });
        return emptySummary;
      }
    }

    let submissionNo: string | undefined;
    let description: string | undefined;
    if (summary.lastRunId) {
      const latestRun = await this.prisma.predictionRun.findUnique({
        where: { id: summary.lastRunId },
        select: { submissionNo: true, description: true }
      });
      submissionNo = latestRun?.submissionNo || undefined;
      description = latestRun?.description || undefined;
    }
    
    const result: SampleSummary = {
      sampleNo: summary.sampleNo,
      submissionNo, 
      description,   
      summary: summary.summary as any,
      totalRuns: summary.totalRuns,
      lastRunAt: summary.lastRunAt,
      lastRunId: summary.lastRunId,
      createdAt: summary.createdAt,
      updatedAt: summary.updatedAt,
    };

    logger.info('Sample summary retrieved', { sampleNo, totalRuns: result.totalRuns });
    return result;
  }

  private createEmptySampleSummary(sampleNo: string): SampleSummary {
    const now = new Date();
    return {
      sampleNo,
      summary: {
        distribution: { total: 0 },
        concentration: {
          positive_percentage: 0,
          negative_percentage: 0,
        },
        quality_metrics: {
          average_confidence: 0,
          high_confidence_percentage: 0,
        },
      },
      totalRuns: 0,
      lastRunAt: null,
      lastRunId: null,
      createdAt: now,
      updatedAt: now,
    };
  }

  async getSampleDetails(sampleNo: string): Promise<SampleDetails> {
    
    const summary = await this.getSampleSummary(sampleNo);

    
    const runs = await this.prisma.predictionRun.findMany({
      where: { sampleNo },
      orderBy: { predictAt: 'desc' },
      take: 10, 
      include: {
        wellPredictions: true,
        rowCounts: true,
        inferenceResults: true,
      }
    });

    
    const result: SampleDetails = {
      ...summary,
      ...(runs[0]?.submissionNo ? { submissionNo: runs[0].submissionNo } : {}),
      firstRunAt: runs[runs.length - 1]?.predictAt || null,
      status: this.determineSampleStatus(runs),
      runs: runs.map((run: any) => this.transformRunSummary(run)),
    } as SampleDetails;

    logger.info('Sample details retrieved', { sampleNo, totalRuns: runs.length });
    return result;
  }

  async getSampleRuns(
    sampleNo: string, 
    options: PaginationOptions
  ): Promise<PaginatedResult<PredictionRunSummary>> {
    const { page, limit, sortBy = 'createdAt', sortOrder = 'desc' } = options;
    
    try {
      
      const predictionResponse = await axios.get(`${this.predictionDbServiceUrl}/api/v1/prediction/sample/${sampleNo}`, {
        params: {
          page,
          limit,
          sortBy,
          sortOrder,
        },
      });

      if (!predictionResponse.data.success) {
        throw new Error('Failed to fetch sample runs');
      }

      const predictionData = predictionResponse.data.data;
      const runs = predictionData.runs || [];
      const pagination = predictionData.pagination || {};

      
      logger.info('Raw runs data from prediction-db-service', { sampleNo, runsCount: runs.length });
      if (runs.length > 0) {
        logger.info('First run details', { 
          sampleNo, 
          firstRun: {
            id: runs[0].id,
            runId: runs[0].id,
            hasInferenceResults: !!runs[0].inferenceResults,
            inferenceResultsCount: runs[0].inferenceResults?.length || 0,
            inferenceResults: runs[0].inferenceResults
          }
        });
      }

      const data = runs.map((run: any) => this.transformRunSummary(run));

      const result: PaginatedResult<PredictionRunSummary> = {
        data,
        pagination: {
          page: pagination.page || page,
          limit: pagination.limit || limit,
          total: pagination.total || 0,
          totalPages: pagination.totalPages || 0,
          hasNext: pagination.hasNext || false,
          hasPrev: pagination.hasPrev || false,
        },
      };

      logger.info('Sample runs retrieved from prediction-db-service', { sampleNo, page, limit, total: result.pagination.total });
      return result;
    } catch (error) {
      logger.error(`Failed to get runs for sample ${sampleNo}:`, { error: String(error) });
      throw new Error('Failed to fetch sample runs');
    }
  }

  async getRunDetails(runId: number): Promise<PredictionRunDetails> {
    try {
      
      const predictionResponse = await axios.get(`${this.predictionDbServiceUrl}/api/v1/prediction/${runId}`);

      if (!predictionResponse.data.success) {
        throw new Error('Failed to fetch run details');
      }

      const run = predictionResponse.data.data;
      const result = this.transformRunDetails(run);

      logger.info('Run details retrieved from prediction-db-service', { runId, sampleNo: run.sampleNo });
      return result;
    } catch (error) {
      logger.error(`Failed to get run details for ${runId}:`, { error: String(error) });
      throw new Error('Failed to fetch run details');
    }
  }

  async getLastRun(sampleNo: string): Promise<PredictionRunSummary> {
    const run = await this.prisma.predictionRun.findFirst({
      where: { sampleNo },
      orderBy: { predictAt: 'desc' },
      include: {
        wellPredictions: true,
        rowCounts: true
      }
    });

    if (!run) {
      throw createError.notFound('Prediction run for sample', sampleNo);
    }

    const result = this.transformRunSummary(run);

    logger.info('Last run retrieved', { sampleNo, runId: run.id });
    return result;
  }

  async getSamples(
    options: PaginationOptions & { filters?: any }
  ): Promise<PaginatedResult<SampleSummary>> {
    const { page, limit, sortBy = 'createdAt', sortOrder = 'desc', filters = {} } = options;

    try {
      // Query the pre-calculated SampleSummary table directly
      // This ensures correct aggregated distribution across ALL runs for each sample
      const where: any = {};

      if (filters.search) {
        where.sampleNo = { contains: filters.search, mode: 'insensitive' };
      }
      if (filters.dateFrom || filters.dateTo) {
        where.lastRunAt = {};
        if (filters.dateFrom) where.lastRunAt.gte = new Date(filters.dateFrom);
        if (filters.dateTo) where.lastRunAt.lte = new Date(filters.dateTo);
      }

      // Map sortBy to SampleSummary fields
      const validSortFields = ['createdAt', 'updatedAt', 'lastRunAt', 'sampleNo'];
      const sortField = validSortFields.includes(sortBy) ? sortBy : 'updatedAt';
      const skip = (page - 1) * limit;

      const [summaries, total] = await Promise.all([
        this.prisma.sampleSummary.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortField]: sortOrder },
        }),
        this.prisma.sampleSummary.count({ where }),
      ]);

      // Fetch submissionNo and description from latest run for each sample
      const data: SampleSummary[] = await Promise.all(
        summaries.map(async (s) => {
          let submissionNo: string | undefined;
          let description: string | undefined;
          if (s.lastRunId) {
            try {
              const latestRunResp = await axios.get(
                `${this.predictionDbServiceUrl}/api/v1/prediction/${s.lastRunId}`
              );
              if (latestRunResp.data?.success && latestRunResp.data?.data) {
                submissionNo = latestRunResp.data.data.submissionNo || undefined;
                description = latestRunResp.data.data.description || undefined;
              }
            } catch {
              // Ignore - submissionNo is optional display data
            }
          }
          return {
            sampleNo: s.sampleNo,
            submissionNo,
            description,
            summary: s.summary as any,
            totalRuns: s.totalRuns,
            lastRunAt: s.lastRunAt,
            lastRunId: s.lastRunId,
            createdAt: s.createdAt,
            updatedAt: s.updatedAt,
          };
        })
      );

      const totalPages = Math.ceil(total / limit);
      const result: PaginatedResult<SampleSummary> = {
        data,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      };

      logger.info('Samples retrieved from SampleSummary table', { page, limit, total, filters });
      return result;
    } catch (error) {
      logger.error('Failed to get samples:', { error: String(error) });
      throw new Error('Failed to fetch samples');
    }
  }

  async getSystemStatistics(filters: StatisticsFilters = { groupBy: 'day' }): Promise<SystemStatistics> {
    
    const dateFilter: any = {};
    if (filters?.dateFrom) {
      dateFilter.gte = new Date(filters.dateFrom);
    }
    if (filters?.dateTo) {
      dateFilter.lte = new Date(filters.dateTo);
    }

    
    const [
      totalSamples,
      totalRuns,
      completedRuns,
      failedRuns,
      runsWithTime,
      modelStats
    ] = await Promise.all([
      this.prisma.sampleSummary.count(),
      this.prisma.predictionRun.count({
        where: Object.keys(dateFilter).length > 0 ? { predictAt: dateFilter } : {}
      }),
      this.prisma.predictionRun.count({
        where: {
          status: 'completed',
          ...(Object.keys(dateFilter).length > 0 ? { predictAt: dateFilter } : {})
        }
      }),
      this.prisma.predictionRun.count({
        where: {
          status: 'failed',
          ...(Object.keys(dateFilter).length > 0 ? { predictAt: dateFilter } : {})
        }
      }),
      this.prisma.predictionRun.findMany({
        where: {
          status: 'completed',
          processingTimeMs: { not: null },
          ...(Object.keys(dateFilter).length > 0 ? { predictAt: dateFilter } : {})
        },
        select: { processingTimeMs: true }
      }),
      this.prisma.predictionRun.groupBy({
        by: ['modelVersion'],
        where: {
          status: 'completed',
          ...(Object.keys(dateFilter).length > 0 ? { predictAt: dateFilter } : {})
        },
        _count: { id: true },
        _avg: { processingTimeMs: true }
      })
    ]);

    
    const averageProcessingTimeMs = runsWithTime.length > 0
      ? runsWithTime.reduce((sum: number, run: { processingTimeMs: number | null }) => sum + (run.processingTimeMs || 0), 0) / runsWithTime.length
      : 0;

    const successRate = totalRuns > 0 ? completedRuns / totalRuns : 0;

    
    const dailyStats = await this.getDailyStatistics(filters);

    
    const modelPerformance: Record<string, any> = {};
    modelStats.forEach((stat: any) => {
      if (stat.modelVersion) {
        modelPerformance[stat.modelVersion] = {
          totalRuns: stat._count.id,
          successRate: 1.0, 
          averageConfidence: 0.85, 
        };
      }
    });

    const result: SystemStatistics = {
      totalSamples,
      totalRuns,
      activeSamples: totalSamples, 
      completedRuns,
      failedRuns,
      averageProcessingTimeMs,
      successRate,
      dailyStats,
      modelPerformance,
    };

    logger.info('System statistics retrieved', { totalSamples, totalRuns });
    return result;
  }

  async getSampleTrends(sampleNo: string): Promise<SampleTrends> {
    const runs = await this.prisma.predictionRun.findMany({
      where: { sampleNo },
      orderBy: { predictAt: 'asc' },
      include: {
        wellPredictions: true,
        inferenceResults: true,
      }
    });

    const confidenceTrend = runs.map((run: any) => ({
      runId: run.id,
      predictAt: run.predictAt,
      averageConfidence: this.calculateAverageConfidence(run.wellPredictions),
    }));

    const distributionTrend = runs.map((run: any) => {
      const inferenceResult = run.inferenceResults[0];
      const distribution = inferenceResult?.results as any;
      
      return {
        runId: run.id,
        predictAt: run.predictAt,
        positiveCount: distribution?.distribution?.positive || 0,
        negativeCount: distribution?.distribution?.negative || 0,
      };
    });

    const result: SampleTrends = {
      sampleNo,
      trends: {
        confidenceTrend,
        distributionTrend,
      }
    };

    logger.info('Sample trends retrieved', { sampleNo, runCount: runs.length });
    return result;
  }

  
  private transformRunSummary(run: any): PredictionRunSummary {
    
    logger.info('Transforming run summary', { 
      runId: run.id,
      hasInferenceResults: !!run.inferenceResults,
      inferenceResultsCount: run.inferenceResults?.length || 0,
      inferenceResults: run.inferenceResults
    });

    return {
      runId: run.id,
      sampleNo: run.sampleNo,
      submissionNo: run.submissionNo,  
      description: run.description,    
      predictAt: run.predictAt,
      modelVersion: run.modelVersion,
      status: run.status,
      processingTimeMs: run.processingTimeMs,
      statistics: this.calculateRunStatistics([run])[0] || {
        totalDetections: 0,
        positiveCount: 0,
        negativeCount: 0,
        averageConfidence: 0,
      },
      inferenceResults: run.inferenceResults || [],
      wellPredictions: run.wellPredictions || []
    };
  }

  private transformRunDetails(run: any): PredictionRunDetails {
    const rowCounts = run.rowCounts[0]?.counts || {};
    const inferenceResults = run.inferenceResults[0]?.results || {};

    return {
      runId: run.id,
      sampleNo: run.sampleNo,
      submissionNo: run.submissionNo,
      description: run.description,
      predictAt: run.predictAt,
      modelVersion: run.modelVersion,
      status: run.status,
      processingTimeMs: run.processingTimeMs,
      errorMsg: run.errorMsg,
      rawImageUrl: run.rawImagePath,
      annotatedImageUrl: run.annotatedImagePath,
      statistics: this.calculateRunStatistics([run])[0] || {
        totalDetections: 0,
        positiveCount: 0,
        negativeCount: 0,
        invalidCount: 0,
        averageConfidence: 0,
      },
      rowCounts: rowCounts as Record<string, number>,
      inferenceResults: inferenceResults as any,
      wellPredictions: run.wellPredictions.map((wp: any) => ({
        wellId: wp.wellId,
        label: wp.label,
        class: wp.class_,
        confidence: wp.confidence,
        bbox: wp.bbox,
      })),
    };
  }

  private calculateRunStatistics(runs: any[]): any[] {
    return runs.map(run => {
      const wellPredictions = run.wellPredictions || [];
      const totalDetections = wellPredictions.length;
      const positiveCount = wellPredictions.filter((wp: any) => wp.class_ === 'positive').length;
      const negativeCount = wellPredictions.filter((wp: any) => wp.class_ === 'negative').length;
      const invalidCount = wellPredictions.filter((wp: any) => wp.class_ === 'invalid').length;
      
      const averageConfidence = totalDetections > 0
        ? wellPredictions.reduce((sum: number, wp: any) => sum + wp.confidence, 0) / totalDetections
        : 0;

      return {
        totalDetections,
        positiveCount,
        negativeCount,
        invalidCount,
        averageConfidence,
      };
    });
  }

  private calculateAverageConfidence(wellPredictions: any[]): number {
    if (wellPredictions.length === 0) return 0;
    
    const totalConfidence = wellPredictions.reduce((sum: number, wp: any) => sum + wp.confidence, 0);
    return totalConfidence / wellPredictions.length;
  }

  private determineSampleStatus(runs: any[]): 'active' | 'completed' | 'failed' {
    if (runs.length === 0) return 'active';
    
    const latestRun = runs[0];
    if (latestRun.status === 'failed') return 'failed';
    if (latestRun.status === 'completed') return 'completed';
    return 'active';
  }

  private async getDailyStatistics(_filters: StatisticsFilters): Promise<any[]> {
    return [
      {
        date: new Date().toISOString().split('T')[0],
        samplesProcessed: 25,
        runsCompleted: 75,
        averageConfidence: 0.87,
      }
    ];
  }

  
  async invalidateSampleCache(_sampleNo: string): Promise<void> {
    logger.info('Sample cache invalidated (no-op)', { sampleNo: _sampleNo });
  }

  async invalidateRunCache(_runId: number): Promise<void> {
    logger.info('Run cache invalidated (no-op)', { runId: _runId });
  }

  async invalidateSystemCache(): Promise<void> {
    logger.info('System cache invalidated (no-op)');
  }

  async getInterfaceFiles(sampleNo: string): Promise<any[]> {
    try {
      
      const labwareResponse = await axios.get(`${process.env.LABWARE_SERVICE_URL || 'http://localhost:6405'}/api/v1/interface/files/${sampleNo}`);
      
      if (!labwareResponse.data.success) {
        throw new Error('Failed to fetch interface files');
      }

      const files = labwareResponse.data.data || [];
      logger.info('Interface files retrieved from labware-service', { sampleNo, fileCount: files.length });
      return files;
    } catch (error) {
      logger.error(`Failed to get interface files for sample ${sampleNo}:`, { error: String(error) });
      
      return [];
    }
  }

  async getInterfaceFileDownloadUrl(sampleNo: string, filename: string): Promise<string | null> {
    try {
      // Get all interface files for the sample
      const labwareResponse = await axios.get(`${process.env.LABWARE_SERVICE_URL || 'http://localhost:6405'}/api/v1/interface/files/${sampleNo}`);
      
      if (!labwareResponse.data.success) {
        throw new Error('Failed to fetch interface files');
      }

      const files = labwareResponse.data.data || [];
      
      // Find the file by filename
      const file = files.find((f: any) => f.fileName === filename);
      
      if (!file) {
        logger.warn('Interface file not found', { sampleNo, filename });
        return null;
      }
      
      // Get the file details from labware service
      const fileResponse = await axios.get(`${process.env.LABWARE_SERVICE_URL || 'http://localhost:6405'}/api/v1/interface/files/${file.id}`);
      
      if (!fileResponse.data.success) {
        throw new Error('Failed to fetch interface file details');
      }

      const fileData = fileResponse.data.data;
      const downloadUrl = fileData.downloadUrl;
      
      logger.info('Interface file download URL retrieved', { sampleNo, filename, downloadUrl });
      return downloadUrl;
    } catch (error) {
      logger.error(`Failed to get interface file download URL for sample ${sampleNo}, file ${filename}:`, { error: String(error) });
      return null;
    }
  }
}
