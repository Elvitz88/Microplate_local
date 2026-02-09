import { Router } from 'express';
import { ResultController } from '@/controllers/result.controller';

export function resultRoutes(resultController: ResultController): Router {
  const router = Router();

  
  
  

  
  
  router.get('/samples', resultController.getSamples.bind(resultController));

  
  
  router.get('/samples/:sampleNo', resultController.getSampleDetails.bind(resultController));

  
  
  router.get('/samples/:sampleNo/summary', resultController.getSampleSummary.bind(resultController));

  
  
  router.get('/samples/:sampleNo/runs', resultController.getSampleRuns.bind(resultController));

  
  
  router.get('/samples/:sampleNo/last', resultController.getLastRun.bind(resultController));

  
  
  router.get('/samples/:sampleNo/trends', resultController.getSampleTrends.bind(resultController));

  
  router.post('/samples/:sampleNo/update', resultController.updateSampleSummary.bind(resultController));

  router.get('/samples/:sampleNo/interface-files', resultController.getInterfaceFiles.bind(resultController));

  router.get('/samples/:sampleNo/interface-files/:filename/download', resultController.downloadInterfaceFile.bind(resultController));
  

  
  
  

  
  
  router.get('/runs/:runId', resultController.getRunDetails.bind(resultController));

  
  
  

  
  
  router.get('/statistics/overview', resultController.getSystemStatistics.bind(resultController));

  
  
  

  
  
  router.delete('/cache/samples/:sampleNo', resultController.invalidateSampleCache.bind(resultController));

  
  
  router.delete('/cache/system', resultController.invalidateSystemCache.bind(resultController));

  
  
  

  
  
  router.get('/health', resultController.healthCheck.bind(resultController));

  
  
  router.get('/ready', resultController.readinessCheck.bind(resultController));

  
  
  router.get('/metrics', resultController.getMetrics.bind(resultController));

  
  
  

  
  
  router.get('/logs', resultController.getLogs.bind(resultController));

  
  
  router.delete('/logs', resultController.clearLogs.bind(resultController));

  return router;
}