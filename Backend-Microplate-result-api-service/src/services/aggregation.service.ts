import { PrismaClient } from '@prisma/client';
import { AggregationService } from '@/types/result.types';
import { logger } from '@/utils/logger';
import { createError } from '@/utils/errors';

export class AggregationServiceImpl implements AggregationService {
  constructor(private prisma: PrismaClient) {}

  async updateSampleSummary(sampleNo: string): Promise<void> {
    try {
      logger.info('Starting sample summary update', { sampleNo });

      
      const inferenceResults = await this.prisma.inferenceResult.findMany({
        where: {
          run: { sampleNo }
        },
        include: { run: true },
        orderBy: { run: { predictAt: 'desc' } }
      });

      if (inferenceResults.length === 0) {
        logger.warn('No inference results found for sample', { sampleNo });
        return;
      }

      
      if (sampleNo === 'TEST006') {
        logger.info('Found inference results for TEST006', { sampleNo, inferenceResultsCount: inferenceResults.length });
        inferenceResults.forEach((result, index) => {
          logger.info(`Inference result ${index + 1} for TEST006`, { 
            sampleNo, 
            index, 
            runId: result.runId, 
            results: result.results 
          });
        });
      }

      
      let distribution = this.calculateDistribution(inferenceResults);
      // Ensure total = sum of well 0..12 (match interface CSV and UI)
      const wellTotal = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].reduce(
        (sum, key) => sum + (distribution[String(key)] ?? 0),
        0
      );
      distribution = { ...distribution, total: wellTotal };

      if (sampleNo === 'TEST006') {
        logger.info('Calculated distribution for TEST006', { sampleNo, distribution });
      }

      const runStats = await this.prisma.predictionRun.aggregate({
        where: { sampleNo },
        _count: { id: true },
        _max: { predictAt: true },
        _min: { predictAt: true }
      });

      
      const latestRun = await this.prisma.predictionRun.findFirst({
        where: { sampleNo },
        orderBy: { predictAt: 'desc' },
        select: { id: true }
      });

      
      const qualityMetrics = await this.calculateQualityMetrics(sampleNo);
      const concentration = this.calculateConcentration(distribution);

      
      const summary = {
        distribution,
        concentration,
        quality_metrics: qualityMetrics,
      };

      
      await this.prisma.sampleSummary.upsert({
        where: { sampleNo },
        update: {
          summary: summary as any,
          totalRuns: runStats._count.id,
          lastRunAt: runStats._max.predictAt,
          lastRunId: latestRun?.id ?? null,
        },
        create: {
          sampleNo,
          summary: summary as any,
          totalRuns: runStats._count.id,
          lastRunAt: runStats._max.predictAt,
          lastRunId: latestRun?.id ?? null,
        }
      });

      logger.info('Sample summary updated successfully', { 
        sampleNo, 
        totalRuns: runStats._count.id,
        distribution 
      });

    } catch (error) {
      logger.error('Failed to update sample summary', { sampleNo, error });
      throw createError.database('Failed to update sample summary', { sampleNo, error });
    }
  }

  calculateDistribution(inferenceResults: any[]): Record<string, number> {
    const distribution: Record<string, number> = {};

    
    const isTest006 = inferenceResults.length > 0 && inferenceResults[0].run?.sampleNo === 'TEST006';

    for (const result of inferenceResults) {
      const resultData = result.results as any;
      const resultDistribution = resultData?.distribution || {};
      
      
      if (isTest006) {
        logger.info('Processing inference result for TEST006', { 
          runId: result.runId, 
          resultDistribution 
        });
      }
      
      for (const [key, value] of Object.entries(resultDistribution)) {
        if (typeof value === 'number') {
          const oldValue = distribution[key] || 0;
          distribution[key] = oldValue + value;
          
          
          if (isTest006) {
            logger.info(`Distribution calculation for TEST006: ${key} = ${oldValue} + ${value} = ${distribution[key]}`, { 
              runId: result.runId,
              key, 
              oldValue, 
              value, 
              newValue: distribution[key] 
            });
          }
        }
      }
    }

    
    if (isTest006) {
      logger.info('Final calculated distribution for TEST006', { distribution });
    }

    return distribution;
  }

  private async calculateQualityMetrics(sampleNo: string): Promise<any> {
    try {
      
      const wellPredictions = await this.prisma.wellPrediction.findMany({
        where: {
          run: { sampleNo }
        },
        select: {
          confidence: true,
          class_: true,
        }
      });

      if (wellPredictions.length === 0) {
        return {
          average_confidence: 0,
          high_confidence_percentage: 0,
          well_detection_accuracy: 0,
        };
      }

      
      const totalConfidence = wellPredictions.reduce((sum: number, wp: { confidence: number }) => sum + wp.confidence, 0);
      const averageConfidence = totalConfidence / wellPredictions.length;

      
      const highConfidenceCount = wellPredictions.filter((wp: { confidence: number }) => wp.confidence > 0.8).length;
      const highConfidencePercentage = (highConfidenceCount / wellPredictions.length) * 100;

      
      const validDetections = wellPredictions.filter((wp: { class_: string }) => wp.class_ !== 'invalid').length;
      const wellDetectionAccuracy = (validDetections / wellPredictions.length) * 100;

      return {
        average_confidence: Math.round(averageConfidence * 1000) / 1000, 
        high_confidence_percentage: Math.round(highConfidencePercentage * 10) / 10, 
        well_detection_accuracy: Math.round(wellDetectionAccuracy * 10) / 10, 
      };

    } catch (error) {
      logger.error('Failed to calculate quality metrics', { sampleNo, error });
      return {
        average_confidence: 0,
        high_confidence_percentage: 0,
        well_detection_accuracy: 0,
      };
    }
  }

  
  calculateStatistics(runs: any[]): any {
    const totalDetections = runs.reduce((sum, run) => sum + (run.wellPredictions?.length || 0), 0);
    const positiveCount = runs.reduce((sum, run) => sum + (run.wellPredictions?.filter((wp: any) => wp.class_ === 'positive').length || 0), 0);
    const negativeCount = runs.reduce((sum, run) => sum + (run.wellPredictions?.filter((wp: any) => wp.class_ === 'negative').length || 0), 0);
    const invalidCount = runs.reduce((sum, run) => sum + (run.wellPredictions?.filter((wp: any) => wp.class_ === 'invalid').length || 0), 0);
    const avgConfidenceNumerator = runs.reduce((sum, run) => sum + (run.wellPredictions?.reduce((s: number, wp: any) => s + (wp.confidence || 0), 0) || 0), 0);
    const avgConfidenceDenominator = runs.reduce((sum, run) => sum + (run.wellPredictions?.length || 0), 0);
    const averageConfidence = avgConfidenceDenominator > 0 ? avgConfidenceNumerator / avgConfidenceDenominator : 0;

    return {
      totalDetections,
      positiveCount,
      negativeCount,
      invalidCount,
      averageConfidence,
    };
  }

  private calculateConcentration(distribution: Record<string, number>): any {
    // Sum only well 0..12 (exclude 'total' and other meta keys to avoid double-count)
    const total = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].reduce(
      (sum, key) => sum + (distribution[String(key)] ?? 0),
      0
    );

    if (total === 0) {
      return {
        positive_percentage: 0,
        negative_percentage: 0,
      };
    }

    const positiveCount = distribution.positive ?? 0;
    const negativeCount = distribution.negative ?? 0;
    
    return {
      positive_percentage: Math.round((positiveCount / total) * 100 * 100) / 100, 
      negative_percentage: Math.round((negativeCount / total) * 100 * 100) / 100, 
    };
  }

  
  async updateMultipleSampleSummaries(sampleNos: string[]): Promise<void> {
    logger.info('Starting batch sample summary update', { count: sampleNos.length });

    const results = await Promise.allSettled(
      sampleNos.map(sampleNo => this.updateSampleSummary(sampleNo))
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    logger.info('Batch sample summary update completed', { 
      total: sampleNos.length,
      successful,
      failed 
    });

    if (failed > 0) {
      const failedSamples = sampleNos.filter((_: string, index: number) => (results[index] as PromiseSettledResult<void>).status === 'rejected');
      logger.error('Some sample summaries failed to update', { failedSamples });
    }
  }

  
  async updateAllSampleSummaries(): Promise<void> {
    logger.info('Starting full sample summary update');

    try {
      
      const samples = await this.prisma.predictionRun.findMany({
        select: { sampleNo: true },
        distinct: ['sampleNo']
      });

      const sampleNos = samples.map((s: { sampleNo: string }) => s.sampleNo);
      
      
      const batchSize = 50;
      for (let i = 0; i < sampleNos.length; i += batchSize) {
        const batch = sampleNos.slice(i, i + batchSize);
        await this.updateMultipleSampleSummaries(batch);
        
        
        if (i + batchSize < sampleNos.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      logger.info('Full sample summary update completed', { totalSamples: sampleNos.length });

    } catch (error) {
      logger.error('Failed to update all sample summaries', { error });
      throw createError.database('Failed to update all sample summaries', { error });
    }
  }

  
  async recalculateStatisticsForDateRange(startDate: Date, endDate: Date): Promise<void> {
    logger.info('Starting statistics recalculation for date range', { startDate, endDate });

    try {
      
      const samples = await this.prisma.predictionRun.findMany({
        where: {
          predictAt: {
            gte: startDate,
            lte: endDate,
          }
        },
        select: { sampleNo: true },
        distinct: ['sampleNo']
      });

      const sampleNos = samples.map((s: { sampleNo: string }) => s.sampleNo);
      await this.updateMultipleSampleSummaries(sampleNos);

      logger.info('Statistics recalculation completed', { 
        sampleCount: sampleNos.length,
        startDate,
        endDate 
      });

    } catch (error) {
      logger.error('Failed to recalculate statistics for date range', { error });
      throw createError.database('Failed to recalculate statistics for date range', { error });
    }
  }

  
  async validateSampleSummary(sampleNo: string): Promise<boolean> {
    try {
      const summary = await this.prisma.sampleSummary.findUnique({
        where: { sampleNo }
      });

      if (!summary) {
        return false;
      }

      
      const actualRunCount = await this.prisma.predictionRun.count({
        where: { sampleNo }
      });

      
      const actualLastRun = await this.prisma.predictionRun.findFirst({
        where: { sampleNo },
        orderBy: { predictAt: 'desc' },
        select: { id: true, predictAt: true }
      });

      
      const isConsistent = 
        summary.totalRuns === actualRunCount &&
        summary.lastRunId === actualLastRun?.id &&
        summary.lastRunAt?.getTime() === actualLastRun?.predictAt.getTime();

      if (!isConsistent) {
        logger.warn('Sample summary inconsistency detected', { 
          sampleNo,
          storedRuns: summary.totalRuns,
          actualRuns: actualRunCount,
          storedLastRunId: summary.lastRunId,
          actualLastRunId: actualLastRun?.id,
        });
      }

      return isConsistent;

    } catch (error) {
      logger.error('Failed to validate sample summary', { sampleNo, error });
      return false;
    }
  }

  
  async getAggregationStats(): Promise<any> {
    try {
      const [
        totalSamples,
        totalRuns,
        lastUpdate,
        inconsistentSamples
      ] = await Promise.all([
        this.prisma.sampleSummary.count(),
        this.prisma.predictionRun.count(),
        this.prisma.sampleSummary.findFirst({
          orderBy: { updatedAt: 'desc' },
          select: { updatedAt: true }
        }),
        this.getInconsistentSamples()
      ]);

      return {
        totalSamples,
        totalRuns,
        lastUpdate: lastUpdate?.updatedAt,
        inconsistentSamples: inconsistentSamples.length,
        consistencyRate: totalSamples > 0 ? ((totalSamples - inconsistentSamples.length) / totalSamples) * 100 : 100,
      };

    } catch (error) {
      logger.error('Failed to get aggregation stats', { error });
      throw createError.database('Failed to get aggregation stats', { error });
    }
  }

  private async getInconsistentSamples(): Promise<string[]> {
    
    
    return [];
  }
}
