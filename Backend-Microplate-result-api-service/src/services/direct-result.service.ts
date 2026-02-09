import { PrismaClient } from '@prisma/client';
import { logger } from '@/utils/logger';
import type {
  SampleSummary,
  PredictionRunSummary,
  PredictionRunDetails,
  PaginatedResult,
  PaginationOptions
} from '@/types/result.types';

export class DirectResultService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }





  async getAllSamples(): Promise<SampleSummary[]> {
    logger.info('Getting all samples directly from database');

    const samples = await this.prisma.sampleSummary.findMany({
      orderBy: { createdAt: 'desc' }
    });

    const samplesWithTestNumber = await Promise.all(
      samples.map(async (sample) => {
        let submissionNo: string | undefined;
        let description: string | undefined;
        if (sample.lastRunId) {
          const latestRun = await this.prisma.predictionRun.findUnique({
            where: { id: sample.lastRunId },
            select: { submissionNo: true, description: true }
          });
          submissionNo = latestRun?.submissionNo || undefined;
          description = latestRun?.description || undefined;
        }
        return {
          ...sample,
          submissionNo,
          description,
        } as SampleSummary;
      })
    );

    logger.info('All samples retrieved', { count: samplesWithTestNumber.length });
    return samplesWithTestNumber;
  }

  async getSampleSummary(sampleNo: string): Promise<SampleSummary> {
    logger.info('Getting sample summary directly from database', { sampleNo });

    const sampleSummary = await this.prisma.sampleSummary.findUnique({
      where: { sampleNo },
    });

    if (!sampleSummary) {
      throw new Error(`Sample ${sampleNo} not found`);
    }


    let submissionNo: string | undefined;
    let description: string | undefined;
    if (sampleSummary.lastRunId) {
      const latestRun = await this.prisma.predictionRun.findUnique({
        where: { id: sampleSummary.lastRunId },
        select: { submissionNo: true, description: true }
      });
      submissionNo = latestRun?.submissionNo || undefined;
      description = latestRun?.description || undefined;
    }

    const result: SampleSummary = {
      ...sampleSummary as any,
      submissionNo,
      description,
    };

    logger.info('Sample summary retrieved', { sampleNo, summary: result });
    return result;
  }

  async getSampleRuns(
    sampleNo: string,
    options: PaginationOptions
  ): Promise<PaginatedResult<PredictionRunSummary>> {
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = options;
    const skip = (page - 1) * limit;

    logger.info('Getting sample runs directly from database', { sampleNo, page, limit, sortBy, sortOrder });

    try {
      const [runs, total] = await Promise.all([
        this.prisma.predictionRun.findMany({
          where: { sampleNo },
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          include: {
            wellPredictions: true,
            rowCounts: true,
            inferenceResults: true,
          },
        }),
        this.prisma.predictionRun.count({ where: { sampleNo } }),
      ]);


      logger.info('Raw runs data from database', { sampleNo, runsCount: runs.length, total });
      if (runs.length > 0) {
        const firstRun = runs[0];
        logger.info('First run details from database', {
          sampleNo,
          firstRun: {
            id: firstRun?.id,
            hasInferenceResults: !!firstRun?.inferenceResults,
            inferenceResultsCount: firstRun?.inferenceResults?.length || 0,
            inferenceResults: firstRun?.inferenceResults
          }
        });
      }

      const data = runs.map((run: any) => this.transformRunSummary(run));

      const result: PaginatedResult<PredictionRunSummary> = {
        data,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: skip + limit < total,
          hasPrev: page > 1,
        },
      };

      logger.info('Sample runs retrieved from database', { sampleNo, page, limit, total: result.pagination.total });
      return result;
    } catch (error) {
      logger.error(`Failed to get runs for sample ${sampleNo}:`, { error: String(error) });
      throw new Error('Failed to fetch sample runs');
    }
  }

  async getRunDetails(runId: number): Promise<PredictionRunDetails> {
    logger.info('Getting run details directly from database', { runId });

    try {
      const run = await this.prisma.predictionRun.findUnique({
        where: { id: runId },
        include: {
          wellPredictions: true,
          rowCounts: true,
          inferenceResults: true,
        },
      });

      if (!run) {
        throw new Error(`Run ${runId} not found`);
      }


      logger.info('Run details from database', {
        runId,
        hasInferenceResults: !!run.inferenceResults,
        inferenceResultsCount: run.inferenceResults?.length || 0,
        inferenceResults: run.inferenceResults
      });

      const result = this.transformRunDetails(run);

      logger.info('Run details retrieved from database', { runId, sampleNo: run.sampleNo });
      return result;
    } catch (error) {
      logger.error(`Failed to get run details for ${runId}:`, { error: String(error) });
      throw new Error('Failed to fetch run details');
    }
  }





  private transformRunSummary(run: any): PredictionRunSummary {

    logger.info('Transforming run summary', {
      runId: run.id,
      hasInferenceResults: !!run.inferenceResults,
      inferenceResultsCount: run.inferenceResults?.length || 0,
      inferenceResults: run.inferenceResults,
      rawImagePath: run.rawImagePath,
      annotatedImagePath: run.annotatedImagePath
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
      wellPredictions: run.wellPredictions || [],

      rawImagePath: run.rawImagePath,
      annotatedImagePath: run.annotatedImagePath
    };
  }

  private transformRunDetails(run: any): PredictionRunDetails {
    const rowCounts = run.rowCounts[0]?.counts || {};
    const inferenceResults = run.inferenceResults[0]?.results || {};


    logger.info('Transforming run details', {
      runId: run.id,
      hasInferenceResults: !!run.inferenceResults,
      inferenceResultsCount: run.inferenceResults?.length || 0,
      inferenceResults: run.inferenceResults,
      extractedResults: inferenceResults
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


  async recalculateSampleSummary(sampleNo: string): Promise<void> {
    logger.info('Recalculating sample summary after run deletion', { sampleNo });


    const inferenceResults = await this.prisma.inferenceResult.findMany({
      where: {
        run: { sampleNo }
      },
      include: { run: true },
      orderBy: { run: { predictAt: 'desc' } }
    });

    if (inferenceResults.length === 0) {
      logger.warn('No inference results found, deleting sample summary', { sampleNo });

      await this.prisma.sampleSummary.delete({
        where: { sampleNo }
      }).catch(() => { });
      return;
    }


    const distribution: Record<string, number> = {};

    for (const result of inferenceResults) {
      const resultData = result.results as any;
      if (resultData?.distribution) {
        Object.keys(resultData.distribution).forEach(key => {
          if (key !== 'total') {
            distribution[key] = (distribution[key] || 0) + (resultData.distribution[key] || 0);
          }
        });
      }
    }


    // Total = sum of well 0..12 (include well 0 to match interface CSV and UI)
    const total = Object.keys(distribution)
      .filter(key => key !== 'total' && !isNaN(Number(key)) && Number(key) >= 0 && Number(key) <= 12)
      .reduce((sum, key) => sum + (distribution[key] || 0), 0);
    distribution.total = total;


    const runStats = await this.prisma.predictionRun.aggregate({
      where: { sampleNo },
      _count: { id: true },
      _max: { predictAt: true }
    });

    const latestRun = await this.prisma.predictionRun.findFirst({
      where: { sampleNo },
      orderBy: { predictAt: 'desc' },
      select: { id: true }
    });


    await this.prisma.sampleSummary.upsert({
      where: { sampleNo },
      update: {
        summary: { distribution },
        totalRuns: runStats._count.id,
        lastRunAt: runStats._max.predictAt || new Date(),
        lastRunId: latestRun?.id || 0,
        updatedAt: new Date()
      },
      create: {
        sampleNo,
        summary: { distribution },
        totalRuns: runStats._count.id,
        lastRunAt: runStats._max.predictAt || new Date(),
        lastRunId: latestRun?.id || 0
      }
    });

    logger.info('Sample summary recalculated successfully', { sampleNo, distribution, totalRuns: runStats._count.id });
  }

  async updateRunDistribution(runId: number, distribution: Record<string, number>, userId: string): Promise<void> {
    logger.info('Updating run distribution directly', { runId, distribution, userId });

    try {
      const run = await this.prisma.predictionRun.findUnique({
        where: { id: runId },
        select: { sampleNo: true }
      });

      if (!run) {
        throw new Error(`Run ${runId} not found`);
      }

      // precise lookup for the inference result
      const inferenceResult = await this.prisma.inferenceResult.findFirst({
        where: { runId }
      });

      if (!inferenceResult) {
        // If no inference result exists yet, we might need to create one, but generally it should exist.
        // For now, we'll throw if missing, or we could create a stub.
        throw new Error(`Inference result for run ${runId} not found`);
      }

      const currentResults = inferenceResult.results as any || {};
      const newResults = {
        ...currentResults,
        distribution: {
          ...currentResults.distribution,
          ...distribution,
          // Ensure we keep 'total' or recalculate it? 
          // The recalculateSampleSummary logic calculates total from keys.
          // But usually 'total' is stored in distribution too.
        }
      };

      // Recalculate 'total' for the run (include well 0..12 to match interface CSV)
      let runTotal = 0;
      Object.keys(newResults.distribution).forEach(key => {
        const n = Number(key);
        if (key !== 'total' && !isNaN(n) && n >= 0 && n <= 12) {
          runTotal += newResults.distribution[key] || 0;
        }
      });
      newResults.distribution.total = runTotal;

      // Update InferenceResult
      await this.prisma.inferenceResult.update({
        where: { id: inferenceResult.id },
        data: {
          results: newResults
        }
      });

      // Note: updatedAt is automatically managed by Prisma @updatedAt decorator
      // No need to manually update updatedBy as it doesn't exist in schema

      // After updating the run, we MUST recalculate the summary for the sample
      await this.recalculateSampleSummary(run.sampleNo);

      logger.info('Run distribution updated and sample summary recalculated', { runId, sampleNo: run.sampleNo, userId });

    } catch (error) {
      logger.error(`Failed to update distribution for run ${runId}:`, { error: String(error) });
      throw new Error('Failed to update run distribution');
    }
  }
}
