import logger from './logger';

const debugRunObject = (run: any, index: number) => {
  logger.debug(`🔍 Debug Run ${index}:`, {
    run,
    runId: run.id,
    runIdType: typeof run.id,
    keys: Object.keys(run),
    values: Object.values(run),
  });
  
  const possibleIdFields = ['id', 'runId', 'run_id', 'ID', 'runID'];
  possibleIdFields.forEach(field => {
    if (run[field] !== undefined) {
      logger.debug(`Found ${field}:`, run[field], typeof run[field]);
    }
  });
  
  const actualRunId = run.id || run.runId || run.run_id;
  logger.debug('Actual Run ID to use:', actualRunId, typeof actualRunId);
};


export const validateRunData = (runs: any[]) => {
  logger.debug('🔍 Validating Run Data');
  
  if (!Array.isArray(runs)) {
    logger.error('❌ Runs is not an array:', runs);
    return false;
  }
  
  if (runs.length === 0) {
    logger.warn('⚠️ No runs found');
    return false;
  }
  
  runs.forEach((run, index) => {
    debugRunObject(run, index);
    
    const hasId = run.id || run.runId || run.run_id;
    const requiredFields = ['sampleNo', 'predictAt'];
    const missingFields = requiredFields.filter(field => !run[field]);
    
    if (!hasId) {
      logger.error(`❌ Run ${index} missing ID field (need id or runId)`);
    }
    
    if (missingFields.length > 0) {
      logger.error(`❌ Run ${index} missing fields:`, missingFields);
    } 
    
    if (hasId && missingFields.length === 0) {
      logger.debug(`✅ Run ${index} has all required fields`);
    }
  });
  
  return true;
};
