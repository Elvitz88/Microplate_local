import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import logger from '../utils/logger';
import {
  MdSearch,
  MdExpandMore,
  MdExpandLess,
  MdRefresh,
  MdChevronLeft,
  MdChevronRight,
  MdBarChart,
  MdFileDownload,
  MdClose,
  MdPreview,
  MdImage,
  MdZoomOut,
  MdEdit,
  MdCheck,
  MdSort,
} from 'react-icons/md';
import { resultsService } from '../services/results.service';
import { resultsServiceDirect } from '../services/results.service.direct';
import { labwareService } from '../services/labware.service';
import { validateRunData } from '../utils/debugRuns';
import Card from '../components/ui/Card';
import Spinner from '../components/ui/Spinner';

type RunDetailsResponse = Awaited<ReturnType<typeof resultsService.getRunDetails>>;
type RunDetails = RunDetailsResponse extends { data: infer Data } ? Data : never;
type InterfaceFilesResponse = Awaited<ReturnType<typeof resultsService.getInterfaceFiles>>;
type InterfaceFile = InterfaceFilesResponse extends { data: Array<infer Item> } ? Item : never;

interface ExpandedSample {
  sampleNo: string;
  runs: RunDetails[];
  interfaceFiles: InterfaceFile[];
  inferenceResults: Map<number, any>; 
  isLoadingRuns: boolean;
  isLoadingFiles: boolean;
  isLoadingInference: boolean;
}

export default function Results() {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedSamples, setExpandedSamples] = useState<Map<string, ExpandedSample>>(new Map());
  const [csvPreview, setCsvPreview] = useState<string | null>(null);
  const [showCsvPreview, setShowCsvPreview] = useState(false);
  const [interfaceFiles, setInterfaceFiles] = useState<Map<string, any[]>>(new Map());
  const [isGeneratingInterface, setIsGeneratingInterface] = useState<Set<string>>(new Set());
  const [selectedImageUrl, setSelectedImageUrl] = useState<string>('');
  const [showImageModal, setShowImageModal] = useState(false);
  const [editingRunId, setEditingRunId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, number>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [sortBy, setSortBy] = useState<string>('lastRunAt');
  const [sortOrder, setSortOrder] = useState<string>('desc');

  const limit = 15;

  const sortOptions = [
    { label: 'Latest Result', value: 'lastRunAt:desc' },
    { label: 'Oldest Result', value: 'lastRunAt:asc' },
    { label: 'Recently Edited', value: 'updatedAt:desc' },
    { label: 'Sample A-Z', value: 'sampleNo:asc' },
    { label: 'Sample Z-A', value: 'sampleNo:desc' },
  ];


  const { data: samplesData, isLoading: isLoadingSamples, refetch } = useQuery({
    queryKey: ['samples', currentPage, searchTerm, sortBy, sortOrder],
    queryFn: async () => {
      logger.debug('🔍 Fetching samples with params:', { currentPage, limit, searchTerm, sortBy, sortOrder });
      const response = await resultsService.getSamples(
        currentPage,
        limit,
        sortBy,
        sortOrder,
        searchTerm || undefined
      );
      logger.debug('🔍 Raw samples API response:', response);
      logger.debug('🔍 Extracted samples data:', response.data);
      
      
      if (response.data?.data) {
        response.data.data.forEach((sample: any) => {
          logger.debug(`🔍 Sample ${sample.sampleNo} summary:`, sample.summary);
          if (sample.summary?.distribution) {
            logger.debug(`🔍 Sample ${sample.sampleNo} distribution:`, sample.summary.distribution);
            
            
            if (sample.sampleNo === 'TEST006') {
              logger.debug('🔍 TEST006 - API response from result-api-service (gets data from prediction_result.sample_summary):', sample.summary.distribution);
              logger.debug('🔍 TEST006 - Expected from DB: {"1":0,"2":2,"3":0,"4":4,"5":6,"6":4,"7":0,"8":0,"9":0,"10":0,"11":0,"12":0,"total":16}');
              logger.debug('🔍 TEST006 - Values match:', JSON.stringify(sample.summary.distribution) === '{"1":0,"2":2,"3":0,"4":4,"5":6,"6":4,"7":0,"8":0,"9":0,"10":0,"11":0,"12":0,"total":16}');
              
              
              const expected = {"1":0,"2":2,"3":0,"4":4,"5":6,"6":4,"7":0,"8":0,"9":0,"10":0,"11":0,"12":0,"total":16} as any;
              const actual = sample.summary.distribution;
              logger.debug('🔍 TEST006 - Well-by-well comparison:');
              for (let i = 1; i <= 12; i++) {
                const well = i.toString();
                logger.debug(`🔍   Well ${i}: Expected ${expected[well]}, Actual ${(actual as any)[well]}, Match: ${expected[well] === (actual as any)[well]}`);
              }
              logger.debug(`🔍   Total: Expected ${expected.total}, Actual ${(actual as any).total}, Match: ${expected.total === (actual as any).total}`);
            }
          } else {
            logger.warn(`❌ Sample ${sample.sampleNo} has no summary.distribution`);
          }
        });
      }
      
      return response.data; 
    },
    placeholderData: (previousData) => previousData,
  });

  
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const toggleSampleExpansion = async (sampleNo: string) => {
    const isExpanded = expandedSamples.has(sampleNo);
    
    if (isExpanded) {
      
      const newExpanded = new Map(expandedSamples);
      newExpanded.delete(sampleNo);
      setExpandedSamples(newExpanded);
    } else {
      
      const newExpanded = new Map(expandedSamples);
      newExpanded.set(sampleNo, {
        sampleNo,
        runs: [],
        interfaceFiles: [],
        inferenceResults: new Map(),
        isLoadingRuns: true,
        isLoadingFiles: true,
        isLoadingInference: true,
      });
      setExpandedSamples(newExpanded);

      try {
        
        logger.debug('Using direct service to fetch runs for sample:', sampleNo);
        const runsResponse = await resultsServiceDirect.getSampleRuns(sampleNo, { page: 1, limit: 50 });
        logger.debug('🔍 Raw runsResponse from direct service:', runsResponse);
        logger.debug('🔍 runsResponse structure:', JSON.stringify(runsResponse, null, 2));
        
        
        if (sampleNo === 'TEST006') {
          logger.debug('🔍 TEST006 - Raw API response from direct service (gets data from prediction_result.inference_results):', runsResponse);
          if (runsResponse && runsResponse.data && (runsResponse.data as any).data && Array.isArray((runsResponse.data as any).data)) {
            logger.debug('🔍 TEST006 - API runs data from direct service:', (runsResponse.data as any).data);
            (runsResponse.data as any).data.forEach((run: any, index: number) => {
              logger.debug(`🔍 TEST006 - API Run ${index + 1}:`, {
                id: run.id,
                runId: run.runId,
                sampleNo: run.sampleNo,
                predictAt: run.predictAt,
                status: run.status,
                inferenceResults: run.inferenceResults,
                inferenceResultsLength: run.inferenceResults?.length || 0
              });
              
              if (run.inferenceResults && run.inferenceResults.length > 0) {
                logger.debug(`🔍 TEST006 - API Run ${run.id} inference results:`, run.inferenceResults[0]);
                if (run.inferenceResults[0].results) {
                  logger.debug(`🔍 TEST006 - API Run ${run.id} results:`, run.inferenceResults[0].results);
                  if (run.inferenceResults[0].results.distribution) {
                    logger.debug(`🔍 TEST006 - API Run ${run.id} distribution:`, run.inferenceResults[0].results.distribution);
                  }
                }
              } else {
                logger.warn(`❌ TEST006 - API Run ${run.id} has no inference results!`);
              }
            });
          }
        }
        
        
        let runs = [];
        if (runsResponse && runsResponse.data) {
          const responseData = runsResponse.data as any;
          if (responseData.data && Array.isArray(responseData.data)) {
            runs = responseData.data;
          } else if (Array.isArray(responseData)) {
            runs = responseData;
          }
        }
        logger.debug('🔍 Final runs array:', runs);
        
        
        if (sampleNo === 'TEST006') {
          logger.debug('🔍 TEST006 - Final runs array:', runs);
          logger.debug('🔍 TEST006 - Number of runs:', runs.length);
          runs.forEach((run: any, index: number) => {
            logger.debug(`🔍 TEST006 - Run ${index + 1}:`, {
              id: run.id,
              runId: run.runId,
              sampleNo: run.sampleNo,
              predictAt: run.predictAt,
              status: run.status,
              inferenceResults: run.inferenceResults,
              inferenceResultsLength: run.inferenceResults?.length || 0
            });
            
            if (run.inferenceResults && Array.isArray(run.inferenceResults) && run.inferenceResults.length > 0) {
              logger.debug(`🔍 TEST006 - Run ${run.id} inference results:`, run.inferenceResults[0]);
              if (run.inferenceResults[0].results) {
                logger.debug(`🔍 TEST006 - Run ${run.id} results:`, run.inferenceResults[0].results);
                if (run.inferenceResults[0].results.distribution) {
                  logger.debug(`🔍 TEST006 - Run ${run.id} distribution:`, run.inferenceResults[0].results.distribution);
                }
              }
            } else {
              logger.warn(`❌ TEST006 - Run ${run.id} has no inference results`);
            }
          });
        }

        
        try {
          const interfaceFilesResponse = await labwareService.getInterfaceFiles(sampleNo);
          if (interfaceFilesResponse.success) {
            setInterfaceFiles(prev => {
              const newMap = new Map(prev);
              newMap.set(sampleNo, interfaceFilesResponse.data);
              return newMap;
            });
          }
        } catch (interfaceError) {
          logger.warn('Failed to fetch interface files:', interfaceError);
          
        }
        const inferenceResultsMap = new Map<number, any>();

        
        validateRunData(runs);
        
        
        if (sampleNo === 'TEST006') {
          logger.debug('🔍 TEST006 - Runs data:', runs);
          logger.debug('🔍 TEST006 - Number of runs:', runs.length);
          runs.forEach((run: any, index: number) => {
            logger.debug(`🔍 TEST006 - Run ${index + 1}:`, {
              id: run.id,
              runId: run.runId,
              sampleNo: run.sampleNo,
              predictAt: run.predictAt,
              status: run.status,
              inferenceResults: run.inferenceResults,
              inference_results: run.inference_results,
              results: run.results
            });
            
            
            if (run.inferenceResults && Array.isArray(run.inferenceResults) && run.inferenceResults.length > 0) {
              logger.debug(`🔍 TEST006 - Run ${run.id} inference results:`, run.inferenceResults[0]);
              if (run.inferenceResults[0].results) {
                logger.debug(`🔍 TEST006 - Run ${run.id} results:`, run.inferenceResults[0].results);
                if (run.inferenceResults[0].results.distribution) {
                  logger.debug(`🔍 TEST006 - Run ${run.id} distribution:`, run.inferenceResults[0].results.distribution);
                }
              }
            } else {
              logger.warn(`❌ TEST006 - Run ${run.id} has no inference results`);
            }
          });
        }

        
        logger.debug('🔍 Processing runs for inference results...');
        const inferencePromises = [];
        
        for (let index = 0; index < runs.length; index++) {
          const run = runs[index];
          logger.debug(`🔍 Processing run ${index}:`, run);
          const actualRunId = run.id || run.runId || run.run_id;
          
          if (!actualRunId || actualRunId === 'undefined') {
            logger.warn(`Invalid run ID for run:`, run);
            continue;
          }

          
          if (run.inferenceResults && Array.isArray(run.inferenceResults) && run.inferenceResults.length > 0) {
            logger.debug(`✅ Found existing inference results for run ${actualRunId}:`, run.inferenceResults[0]);
            inferenceResultsMap.set(actualRunId, run.inferenceResults[0]);
            
            
            if (sampleNo === 'TEST006') {
              logger.debug(`🔍 TEST006 - Run ${actualRunId} inference result:`, {
                runId: actualRunId,
                results: run.inferenceResults[0].results,
                distribution: run.inferenceResults[0].results?.distribution
              });
            }
          } else {
            logger.warn(`❌ No inference results found for run ${actualRunId} in runs data, trying to fetch separately...`);
            
            
            const fetchInferencePromise = resultsServiceDirect.getRunDetails(actualRunId)
              .then((runDetails: any) => {
                logger.debug(`🔍 Fetched run details for ${actualRunId} from direct service:`, runDetails);
                
                
                let inferenceResult = null;
                if (runDetails.inferenceResults && Array.isArray(runDetails.inferenceResults) && runDetails.inferenceResults.length > 0) {
                  inferenceResult = runDetails.inferenceResults[0];
                } else if (runDetails.inference_results && Array.isArray(runDetails.inference_results) && runDetails.inference_results.length > 0) {
                  inferenceResult = runDetails.inference_results[0];
                } else if (runDetails.results) {
                  inferenceResult = runDetails.results;
                }
                
                if (inferenceResult) {
                  logger.debug(`✅ Found inference result for run ${actualRunId} from direct service:`, inferenceResult);
                  inferenceResultsMap.set(actualRunId, inferenceResult);
                } else {
                  logger.warn(`❌ Still no inference result found for run ${actualRunId} from direct service`);
                  inferenceResultsMap.set(actualRunId, null);
                }
              })
              .catch((error) => {
                logger.error(`❌ Failed to fetch run details for ${actualRunId}:`, error);
                inferenceResultsMap.set(actualRunId, null);
              });
            
            inferencePromises.push(fetchInferencePromise);
          }

          
          logger.debug(`🔍 Run ${actualRunId} image paths:`, {
            rawImagePath: run.rawImagePath,
            annotatedImagePath: run.annotatedImagePath,
            rawImageUrl: run.rawImagePath ? resultsServiceDirect.getRawImageUrl(run) : 'N/A',
            annotatedImageUrl: run.annotatedImagePath ? resultsServiceDirect.getAnnotatedImageUrl(run) : 'N/A'
          });
        }
        
        
        if (inferencePromises.length > 0) {
          logger.debug(`🔍 Waiting for ${inferencePromises.length} inference results to be fetched...`);
          await Promise.all(inferencePromises);
        }
        
        logger.debug('🔍 Final inferenceResultsMap:', inferenceResultsMap);
        
        
        if (sampleNo === 'TEST006') {
          logger.debug('🔍 TEST006 - Final inference results map:', inferenceResultsMap);
          logger.debug('🔍 TEST006 - Inference results map entries:');
          for (const [runId, inferenceResult] of inferenceResultsMap.entries()) {
            logger.debug(`🔍 TEST006 - Map entry ${runId}:`, inferenceResult);
            if (inferenceResult?.results?.distribution) {
              logger.debug(`🔍 TEST006 - Map entry ${runId} distribution:`, inferenceResult.results.distribution);
            }
          }
        }

        newExpanded.set(sampleNo, {
          sampleNo,
          runs,
          interfaceFiles: [], 
          inferenceResults: inferenceResultsMap,
          isLoadingRuns: false,
          isLoadingFiles: false,
          isLoadingInference: false,
        });
        setExpandedSamples(new Map(newExpanded));
      } catch (error) {
        logger.error('Failed to fetch sample details:', error);
        newExpanded.set(sampleNo, {
          sampleNo,
          runs: [],
          interfaceFiles: [],
          inferenceResults: new Map(),
          isLoadingRuns: false,
          isLoadingFiles: false,
          isLoadingInference: false,
        });
        setExpandedSamples(new Map(newExpanded));
      }
    }
  };


  const handleInterfaceClick = async (sampleNo: string, runId: number, testNumber?: string) => {
    const key = `${sampleNo}-${runId}`;
    logger.debug('🎯 handleInterfaceClick called for:', { sampleNo, runId, testNumber });
    
    try {
      setIsGeneratingInterface(prev => new Set([...prev, key]));
      
      
      const response = await labwareService.generateInterfaceCsv(sampleNo, testNumber);
      
      if (response.success) {
        
        const fileDetails = await labwareService.getInterfaceFile(response.data.id);
        
        if (fileDetails.success) {
          
          setInterfaceFiles(prev => {
            const newMap = new Map(prev);
            const files = newMap.get(sampleNo) || [];
            newMap.set(sampleNo, [...files, fileDetails.data]);
            return newMap;
          });
          
          
          logger.info('Interface CSV generated successfully:', fileDetails.data);
          
          
          if (fileDetails.data.downloadUrl) {
            try {
              const csvResponse = await fetch(fileDetails.data.downloadUrl);
              const csvContent = await csvResponse.text();
              setCsvPreview(csvContent);
              setShowCsvPreview(true);
            } catch (previewError) {
              logger.error('Failed to preview generated CSV:', previewError);
            }
          }
        }
      } else {
        logger.error('Failed to generate interface CSV:', response.error);
        alert(`Failed to generate interface CSV: ${response.error?.message || 'Unknown error'}`);
      }
    } catch (error) {
      logger.error('Error generating interface CSV:', error);
      alert('Error generating interface CSV. Please try again.');
    } finally {
      setIsGeneratingInterface(prev => {
        const newSet = new Set(prev);
        newSet.delete(key);
        return newSet;
      });
    }
  };

  const handleEditClick = (run: any, distribution: any) => {
    const actualRunId = run.id || run.runId;
    setEditingRunId(actualRunId);
    
    // Initialize edit values from current distribution (including well 0)
    const initialValues: Record<string, number> = {};
    for (let i = 0; i <= 12; i++) {
      initialValues[i.toString()] = distribution[i.toString()] || 0;
    }
    setEditValues(initialValues);
  };

  const handleCancelEdit = () => {
    setEditingRunId(null);
    setEditValues({});
  };

  const handleSaveEdit = async (runId: any, sampleNo: string) => {
    try {
      setIsSaving(true);
      await resultsService.updateRunDistribution(runId, editValues);
      
      // Refresh the specific sample's expanded data
      const isExpanded = expandedSamples.has(sampleNo);
      if (isExpanded) {
        // Toggle off then on to trigger re-fetch? Or just call the fetch logic.
        // Better to re-fetch directly.
        // We can reuse the logic inside toggleSampleExpansion but it toggles.
        // Let's just manually call the refresh logic or force refetch of main list.
        
        // 1. Refetch main list to update sample summary
        await refetch();
        
        // 2. Refetch specific sample runs to update the list
        // We need to simulate the fetch details logic again.
        // For simplicity, let's close and reopen or just call toggleSampleExpansion twice?
        // No, that causes visible flicker. 
        // We'll manually trigger the fetch logic if we extract it, but for now
        // let's just close and open edit mode and maybe warn user to refresh if they want deep precision?
        // Actually, we can just clear the expanded sample and re-expand it.
        
        const newExpanded = new Map(expandedSamples);
        newExpanded.delete(sampleNo);
        setExpandedSamples(newExpanded);
        
        // Re-expand immediately
        setTimeout(() => toggleSampleExpansion(sampleNo), 100);
      } else {
        await refetch();
      }
      
      setEditingRunId(null);
      setEditValues({});
      logger.info('Run updated successfully');
    } catch (error) {
      logger.error('Failed to update run:', error);
      alert('Failed to update run. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (wellIndex: number, value: string) => {
    const numValue = parseInt(value) || 0;
    setEditValues(prev => ({
      ...prev,
      [wellIndex]: Math.max(0, numValue) // Ensure non-negative
    }));
  };


  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('th-TH', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  
  const calculateStatistics = (distribution: any) => {
    logger.debug('🔍 calculateStatistics input distribution:', distribution);
    // Include well 0..12 so total matches interface CSV and individual runs
    const values = Object.keys(distribution)
      .filter(key => key !== 'total' && !isNaN(Number(key)) && Number(key) >= 0 && Number(key) <= 12)
      .map(key => distribution[key] || 0);
    
    logger.debug('🔍 calculateStatistics filtered values:', values);
    
    const total = values.reduce((sum, val) => sum + val, 0);
    
    const result = {
      total
    };
    
    logger.debug('🔍 calculateStatistics result:', result);
    return result;
  };


  if (isLoadingSamples && !samplesData) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Analysis Results</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            View and manage sample analysis results with detailed insights
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <MdRefresh className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {}
      <Card className="p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <MdSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by submission number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <MdSort className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <select
                value={`${sortBy}:${sortOrder}`}
                onChange={(e) => {
                  const [newSortBy, newSortOrder] = e.target.value.split(':');
                  setSortBy(newSortBy);
                  setSortOrder(newSortOrder);
                  setCurrentPage(1);
                }}
                className="pl-9 pr-8 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none cursor-pointer"
              >
                {sortOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </Card>

      {}
      {!samplesData?.data?.length ? (
        <Card className="p-12 text-center">
          <MdSearch className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Results Found</h3>
          <p className="text-gray-500 dark:text-gray-400">
            {searchTerm ? 'Try adjusting your search criteria' : 'No samples have been analyzed yet'}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {samplesData.data.map((sample) => {
            const isExpanded = expandedSamples.has(sample.sampleNo);
            const expandedData = expandedSamples.get(sample.sampleNo);
            
            let distribution = sample.summary?.distribution || {};
            
            
            if (distribution && Object.keys(distribution).length > 0 && distribution.total === undefined) {
              const calculatedTotal = Object.keys(distribution)
                .filter(key => key !== 'total' && !isNaN(Number(key)) && Number(key) >= 0 && Number(key) <= 12)
                .reduce((sum, key) => sum + (distribution[key] || 0), 0);
              distribution = { ...distribution, total: calculatedTotal };
              logger.debug(`🔍 Sample ${sample.sampleNo} calculated missing total: ${calculatedTotal}`);
            }
            
            let stats = calculateStatistics(distribution);
            
            
            logger.debug(`🔍 Sample ${sample.sampleNo} summary data:`, sample.summary);
            logger.debug(`🔍 Sample ${sample.sampleNo} distribution:`, distribution);
            logger.debug(`🔍 Sample ${sample.sampleNo} calculated stats:`, stats);
            
            
            if (sample.sampleNo === 'TEST006') {
              logger.debug('🔍 TEST006 - Now using result-api-service (gets data from prediction_result.sample_summary):', distribution);
              logger.debug('🔍 TEST006 - Expected from DB: {"1":0,"2":2,"3":0,"4":4,"5":6,"6":4,"7":0,"8":0,"9":0,"10":0,"11":0,"12":0,"total":16}');
              logger.debug('🔍 TEST006 - Should now match:', JSON.stringify(distribution) === '{"1":0,"2":2,"3":0,"4":4,"5":6,"6":4,"7":0,"8":0,"9":0,"10":0,"11":0,"12":0,"total":16}');
              
              
              logger.debug('🔍 TEST006 - Values that will be displayed in table:');
              for (let i = 1; i <= 12; i++) {
                logger.debug(`🔍   Well ${i}: ${distribution[i] || 0}`);
              }
              logger.debug(`🔍   Total: ${stats.total}`);
            }
            
            
            if (isExpanded && expandedData && expandedData.runs.length > 0) {
              logger.debug('🔍 Recalculating statistics from individual runs...');
              
              
              const aggregatedDistribution: Record<string, number> = {};
              let totalRunsWithData = 0;
              
              expandedData.runs.forEach((run: any) => {
                const actualRunId = run.id || run.runId;
                const inferenceResult = expandedData.inferenceResults.get(actualRunId);
                const runDistribution = inferenceResult?.results?.distribution || {};
                
                if (Object.keys(runDistribution).length > 0) {
                  totalRunsWithData++;
                  Object.keys(runDistribution).forEach(key => {
                    if (key !== 'total') {
                      aggregatedDistribution[key] = (aggregatedDistribution[key] || 0) + (runDistribution[key] || 0);
                    }
                  });
                }
              });
              
              if (totalRunsWithData > 0) {
                logger.debug('🔍 Aggregated distribution from runs:', aggregatedDistribution);
                distribution = aggregatedDistribution;
                stats = calculateStatistics(distribution);
              } else {
                logger.debug('🔍 No runs with distribution data, using sample summary');
              }
            }

            return (
              <Card key={sample.sampleNo} className="overflow-hidden">
                {}
                <button
                  type="button"
                  className="w-full text-left p-6 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
                  onClick={() => toggleSampleExpansion(sample.sampleNo)}
                  aria-expanded={isExpanded}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <MdExpandLess className="h-5 w-5 text-gray-500" />
                        ) : (
                          <MdExpandMore className="h-5 w-5 text-gray-500" />
                        )}
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          Sample {sample.sampleNo}
                        </h3>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <span>Runs: {sample.totalRuns}</span>
                        <span>Last Run: {formatDate(sample.lastRunAt)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {}
                      <div className="flex items-center gap-4 text-sm">
                        <div className="text-gray-600">
                          Total: {stats.total}
                        </div>
                      </div>
                    </div>
                  </div>
                </button>

                {}
                {isExpanded && expandedData && (
                  <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30">
                    <div className="p-6 space-y-6">
                      {}
                      <div>
                        <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4">
                          📊 Overall Sample Distribution
                        </h4>
                        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                          <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                              <tr>
                                <th className="px-3 py-2 text-center text-xs font-medium text-orange-600 dark:text-orange-300 uppercase tracking-wider border-r border-gray-200 dark:border-gray-600">
                                  Well 0
                                </th>
                                {Array.from({ length: 12 }, (_, i) => i + 1).map((row) => (
                                  <th key={row} className="px-3 py-2 text-center text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider border-r border-gray-200 dark:border-gray-600">
                                    Well {row}
                                  </th>
                                ))}
                                <th className="px-3 py-2 text-center text-xs font-medium text-blue-700 dark:text-blue-300 uppercase tracking-wider border-r border-gray-200 dark:border-gray-600">
                                  Total
                                </th>
                                <th className="px-3 py-2 text-center text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                  Actions
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                <td className="px-3 py-2 text-center text-sm font-semibold text-orange-600 dark:text-orange-400 border-r border-gray-200 dark:border-gray-600">
                                  {distribution[0] || 0}
                                </td>
                                {Array.from({ length: 12 }, (_, i) => i + 1).map((row) => (
                                  <td key={row} className="px-3 py-2 text-center text-sm font-semibold text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-600">
                                    {distribution[row] || 0}
                                  </td>
                                ))}
                                <td className="px-3 py-2 text-center text-sm font-bold text-blue-600 dark:text-blue-400 border-r border-gray-200 dark:border-gray-600">
                                  {stats.total}
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <div className="flex items-center justify-center gap-2">
                                    <button
                                      onClick={() => handleInterfaceClick(sample.sampleNo, 0, sample.submissionNo)}
                                      disabled={isGeneratingInterface.has(`${sample.sampleNo}-0`)}
                                      className="flex items-center justify-center gap-1 px-2 py-1 text-xs font-medium text-purple-600 bg-purple-50 border border-purple-200 rounded-md hover:bg-purple-100 disabled:opacity-50 disabled:cursor-not-allowed dark:text-purple-400 dark:bg-purple-900/20 dark:border-purple-700 dark:hover:bg-purple-900/30"
                                      title="Generate Interface CSV for this sample"
                                    >
                                      {isGeneratingInterface.has(`${sample.sampleNo}-0`) ? (
                                        <>
                                          <Spinner size="sm" />
                                          Generating...
                                        </>
                                      ) : (
                                        <>
                                          📄 Interface
                                        </>
                                      )}
                                    </button>
                                    
                                    {}
                                    <button
                                      onClick={async () => {
                                        try {
                                          
                                          const existingFiles = interfaceFiles.get(sample.sampleNo);
                                          
                                          if (existingFiles && existingFiles.length > 0) {
                                            
                                            const latestFile = existingFiles[existingFiles.length - 1];
                                            if (latestFile.downloadUrl) {
                                              const response = await fetch(latestFile.downloadUrl);
                                              const csvContent = await response.text();
                                              setCsvPreview(csvContent);
                                              setShowCsvPreview(true);
                                              return;
                                            }
                                          }
                                          
                                          
                                          const interfaceFilesResponse = await labwareService.getInterfaceFiles(sample.sampleNo);
                                          if (interfaceFilesResponse.success && interfaceFilesResponse.data.length > 0) {
                                            const latestFile = interfaceFilesResponse.data[interfaceFilesResponse.data.length - 1];
                                            
                                            
                                            setInterfaceFiles(prev => {
                                              const newMap = new Map(prev);
                                              newMap.set(sample.sampleNo, interfaceFilesResponse.data);
                                              return newMap;
                                            });
                                            
                                            if (latestFile.downloadUrl) {
                                              const response = await fetch(latestFile.downloadUrl);
                                              const csvContent = await response.text();
                                              setCsvPreview(csvContent);
                                              setShowCsvPreview(true);
                                            } else {
                                              alert('No download URL available for this file.');
                                            }
                                          } else {
                                            alert('No interface CSV files found for this sample. Please generate one first.');
                                          }
                                        } catch (error) {
                                          logger.error('Failed to preview CSV:', error);
                                          alert('Failed to load CSV preview. Please try again.');
                                        }
                                      }}
                                      className="flex items-center justify-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 dark:text-blue-400 dark:bg-blue-900/20 dark:border-blue-700 dark:hover:bg-blue-900/30"
                                      title="Preview Interface CSV files"
                                    >
                                      👁️ Preview
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>


                      {}
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-md font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <MdBarChart className="h-5 w-5" />
                            🔬 Individual Analysis Runs
                          </h4>
                        </div>
                        {expandedData.isLoadingRuns || expandedData.isLoadingInference ? (
                          <div className="flex items-center justify-center py-8">
                            <Spinner size="md" />
                            <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                              Loading analysis data...
                            </span>
                          </div>
                        ) : (() => {
                          logger.debug('🔍 Checking runs display condition:');
                          logger.debug('🔍 expandedData.runs:', expandedData.runs);
                          logger.debug('🔍 expandedData.runs.length:', expandedData.runs.length);
                          logger.debug('🔍 expandedData.isLoadingRuns:', expandedData.isLoadingRuns);
                          logger.debug('🔍 expandedData.isLoadingInference:', expandedData.isLoadingInference);
                          return expandedData.runs.length > 0;
                        })() ? (
                          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                            <div className="overflow-x-auto">
                              <table className="w-full">
                                <thead className="bg-gray-50 dark:bg-gray-700">
                                  <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                      Plate No.
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                      Date
                                    </th>
                                    <th className="px-3 py-3 text-center text-xs font-medium text-orange-500 dark:text-orange-300 uppercase tracking-wider">
                                      Well 0
                                    </th>
                                    {Array.from({ length: 12 }, (_, index) => (
                                      <th key={`row-${index + 1}`} className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        Well {index + 1}
                                      </th>
                                    ))}
                                    <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                      Total
                                    </th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                      Actions
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                  {expandedData.runs.map((run, runIndex) => {
                                    
                                    if (sample.sampleNo === 'TEST006') {
                                      logger.debug(`🔍 TEST006 - Run ${runIndex + 1} object:`, run);
                                      logger.debug(`🔍 TEST006 - Run ${runIndex + 1} keys:`, Object.keys(run));
                                      logger.debug(`🔍 TEST006 - Run ${runIndex + 1} id:`, (run as any).id);
                                      logger.debug(`🔍 TEST006 - Run ${runIndex + 1} runId:`, (run as any).runId);
                                    }
                                    
                                    
                                    const actualRunId = (run as any).id || (run as any).runId;
                                    
                                    
                                    const inferenceResult = expandedData.inferenceResults.get(actualRunId);
                                    let distribution = inferenceResult?.results?.distribution || {};
                                    
                                    
                                    if (distribution && Object.keys(distribution).length > 0 && distribution.total === undefined) {
                                      const calculatedTotal = Object.keys(distribution)
                                        .filter(key => key !== 'total' && !isNaN(Number(key)) && Number(key) >= 0 && Number(key) <= 12)
                                        .reduce((sum, key) => sum + (distribution[key] || 0), 0);
                                      distribution = { ...distribution, total: calculatedTotal };
                                      logger.debug(`🔍 Run ${actualRunId} calculated missing total: ${calculatedTotal}`);
                                    }
                                    
                                    
                                    if (Object.keys(distribution).length === 0 && sample.summary?.distribution) {
                                      logger.debug(`🔍 Run ${actualRunId} using fallback distribution from sample summary`);
                                      distribution = sample.summary.distribution;
                                    }
                                    
                                    
                                    if (sample.sampleNo === 'TEST006') {
                                      logger.debug(`🔍 TEST006 - Run ${actualRunId} display logic:`);
                                      logger.debug(`🔍 TEST006 - Run ${actualRunId} inference result:`, inferenceResult);
                                      logger.debug(`🔍 TEST006 - Run ${actualRunId} distribution from inference:`, inferenceResult?.results?.distribution);
                                      logger.debug(`🔍 TEST006 - Run ${actualRunId} distribution keys length:`, Object.keys(distribution).length);
                                      
                                      if (Object.keys(distribution).length === 0) {
                                        logger.warn(`❌ TEST006 - Run ${actualRunId} has no distribution from inference result!`);
                                        logger.warn(`❌ TEST006 - Run ${actualRunId} will use fallback from sample summary:`, sample.summary?.distribution);
                                      } else {
                                        logger.debug(`✅ TEST006 - Run ${actualRunId} has distribution from inference result:`, distribution);
                                      }
                                    }
                                    
                                    
                                    logger.debug(`🔍 Run ${actualRunId} inference result:`, inferenceResult);
                                    logger.debug(`🔍 Run ${actualRunId} distribution:`, distribution);
                                    logger.debug(`🔍 Run ${actualRunId} rawImagePath:`, (run as any).rawImagePath);
                                    
                                    
                                    if (inferenceResult) {
                                      logger.debug(`🔍 Run ${actualRunId} inferenceResult structure:`, JSON.stringify(inferenceResult, null, 2));
                                    } else {
                                      logger.warn(`❌ Run ${actualRunId} has no inference result`);
                                    }
                                    
                                    
                                    if (sample.sampleNo === 'TEST006') {
                                      logger.debug(`🔍 TEST006 - Individual Run ${actualRunId} display data:`, {
                                        runId: actualRunId,
                                        distribution: distribution,
                                        expectedDistribution: actualRunId === 13 ? 
                                          {"1":0,"2":1,"3":0,"4":2,"5":3,"6":2,"7":0,"8":0,"9":0,"10":0,"11":0,"12":0,"total":8} :
                                          {"1":0,"2":1,"3":0,"4":2,"5":3,"6":2,"7":0,"8":0,"9":0,"10":0,"11":0,"12":0,"total":8}
                                      });
                                      
                                      
                                      const runTotal = Object.keys(distribution)
                                        .filter(key => !isNaN(Number(key)) && Number(key) >= 1 && Number(key) <= 12)
                                        .reduce((sum, key) => sum + (distribution[key] || 0), 0);
                                      
                                      logger.debug(`🔍 TEST006 - Run ${actualRunId} calculated total:`, runTotal);
                                    }
                                    
                                    return (
                                      <tr key={`run-${actualRunId}-${runIndex}`} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                          {(run as any).description || `#${actualRunId}`}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                          {formatDate(run.predictAt)}
                                        </td>
                                        <td className="px-3 py-4 text-center text-sm font-semibold text-orange-600 dark:text-orange-400">
                                          {(() => {
                                            const isEditing = editingRunId === actualRunId;
                                            const columnValue = isEditing ? (editValues[0] ?? 0) : (distribution[0] || 0);
                                            return isEditing ? (
                                              <input
                                                type="number"
                                                min="0"
                                                value={columnValue}
                                                onChange={(e) => handleInputChange(0, e.target.value)}
                                                className="w-16 px-2 py-1 text-center border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                                              />
                                            ) : (
                                              columnValue
                                            );
                                          })()}
                                        </td>
                                        {Array.from({ length: 12 }, (_, colIndex) => {
                                          const columnNumber = colIndex + 1;
                                          const isEditing = editingRunId === actualRunId;
                                          const columnValue = isEditing ? (editValues[columnNumber] ?? 0) : (distribution[columnNumber] || 0);

                                          return (
                                            <td key={`row-${columnNumber}`} className="px-3 py-4 text-center text-sm font-semibold text-gray-900 dark:text-white">
                                              {isEditing ? (
                                                  <input
                                                      type="number"
                                                      min="0"
                                                      value={columnValue}
                                                      onChange={(e) => handleInputChange(columnNumber, e.target.value)}
                                                      className="w-16 px-2 py-1 text-center border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                                                  />
                                              ) : (
                                                  columnValue
                                              )}
                                            </td>
                                          );
                                        })}
                                        <td className="px-3 py-4 text-center text-sm font-bold text-blue-600 dark:text-blue-400">
                                          {(() => {
                                            const isEditing = editingRunId === actualRunId;
                                            const source = isEditing ? editValues : distribution;
                                            const runTotal = Object.keys(source)
                                              .filter(key => !isNaN(Number(key)) && Number(key) >= 0 && Number(key) <= 12)
                                              .reduce((sum, key) => sum + (source[key] || 0), 0);

                                            return runTotal;
                                          })()}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-center">
                                          <div className="flex items-center justify-center gap-2">
                                            {editingRunId === actualRunId ? (
                                                <>
                                                    <button
                                                        onClick={() => handleSaveEdit(actualRunId, sample.sampleNo)}
                                                        disabled={isSaving}
                                                        className="p-1 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 disabled:opacity-50"
                                                        title="Save"
                                                    >
                                                        {isSaving ? <Spinner size="sm" /> : <MdCheck className="h-5 w-5" />}
                                                    </button>
                                                    <button
                                                        onClick={handleCancelEdit}
                                                        disabled={isSaving}
                                                        className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
                                                        title="Cancel"
                                                    >
                                                        <MdClose className="h-5 w-5" />
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => handleEditClick(run, distribution)}
                                                        className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-md hover:bg-indigo-100 dark:text-indigo-400 dark:bg-indigo-900/20 dark:border-indigo-700 dark:hover:bg-indigo-900/30"
                                                        title="Edit Results"
                                                    >
                                                        <MdEdit className="h-3 w-3" /> Edit
                                                    </button>
                                                    
                                                    {(run as any).annotatedImagePath || (run as any).rawImagePath ? (
                                                      <button
                                                        onClick={async () => {
                                                          const buttonKey = `image-${actualRunId}`;
                                                          try {
                                                            // Show loading state
                                                            setIsGeneratingInterface(prev => new Set([...prev, buttonKey]));
                                                            
                                                            const imagePath = (run as any).annotatedImagePath || (run as any).rawImagePath;
                                                            const isAnnotated = !!(run as any).annotatedImagePath;
                                                            
                                                            logger.debug('🖼️ Image button clicked:', {
                                                              runId: actualRunId,
                                                              imagePath,
                                                              isAnnotated
                                                            });
                                                            
                                                            // Generate signed URL (with fallback to direct MinIO URL)
                                                            const signedUrl = await resultsServiceDirect.getSignedImageUrl(
                                                              imagePath,
                                                              isAnnotated
                                                            );
                                                            
                                                            logger.debug('✅ Generated signed URL:', signedUrl);
                                                            setSelectedImageUrl(signedUrl);
                                                            setShowImageModal(true);
                                                          } catch (error) {
                                                            logger.error('❌ Failed to load image:', error);
                                                            
                                                            // Show user-friendly error message
                                                            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
                                                            alert(`Failed to load image:\n\n${errorMessage}\n\nPlease try again or contact your administrator if the problem persists.`);
                                                          } finally {
                                                            // Remove loading state
                                                            setIsGeneratingInterface(prev => {
                                                              const newSet = new Set(prev);
                                                              newSet.delete(buttonKey);
                                                              return newSet;
                                                            });
                                                          }
                                                        }}
                                                        disabled={isGeneratingInterface.has(`image-${actualRunId}`)}
                                                        className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-green-600 bg-green-50 border border-green-200 rounded-md hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed dark:text-green-400 dark:bg-green-900/20 dark:border-green-700 dark:hover:bg-green-900/30"
                                                        title="View Annotated Image"
                                                      >
                                                        {isGeneratingInterface.has(`image-${actualRunId}`) ? (
                                                          <>
                                                            <Spinner size="sm" />
                                                            Loading...
                                                          </>
                                                        ) : (
                                                          <>
                                                            📷 Image
                                                          </>
                                                        )}
                                                      </button>
                                                    ) : (
                                                      <span className="text-xs text-gray-400 dark:text-gray-500">
                                                        No Image
                                                      </span>
                                                    )}
                                                    
                                                    <button
                                                      onClick={async () => {
                                                        if (!window.confirm(`Are you sure you want to delete Run #${actualRunId}?\n\nThis will permanently remove this analysis run and recalculate the sample summary.`)) {
                                                          return;
                                                        }
                                                        
                                                        try {
                                                          logger.debug('Deleting run:', actualRunId);
                                                          
                                                          
                                                          const response = await resultsServiceDirect.deleteRun(actualRunId);
                                                          
                                                          if (response) {
                                                            logger.info('Run deleted successfully');
                                                            alert('Run deleted successfully. The page will refresh.');
                                                            
                                                            
                                                            refetch();
                                                            
                                                            
                                                            setExpandedSamples(new Map());
                                                          }
                                                        } catch (error) {
                                                          logger.error('Failed to delete run:', error);
                                                          alert('Failed to delete run. Please try again.');
                                                        }
                                                      }}
                                                      className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 dark:text-red-400 dark:bg-red-900/20 dark:border-red-700 dark:hover:bg-red-900/30"
                                                      title="Delete this run"
                                                    >
                                                      🗑️ Delete
                                                    </button>
                                                </>
                                            )}
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                            No analysis runs found for this sample
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {}
      {samplesData?.pagination && samplesData.pagination.totalPages > 1 && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700 dark:text-gray-300">
              Showing {((currentPage - 1) * limit) + 1} to {Math.min(currentPage * limit, samplesData.pagination.total)} of {samplesData.pagination.total} results
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={!samplesData.pagination.hasPrev}
                className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <MdChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <span className="px-3 py-2 text-sm font-medium text-gray-700">
                Page {currentPage} of {samplesData.pagination.totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={!samplesData.pagination.hasNext}
                className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <MdChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </Card>
      )}

      {}
      {showCsvPreview && csvPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-6xl w-full max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <MdPreview className="h-5 w-5" />
                Interface CSV Preview
              </h3>
              <button
                onClick={() => setShowCsvPreview(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <MdClose className="h-6 w-6" />
              </button>
            </div>
            
            {}
            <div className="p-6 overflow-auto max-h-[50vh]">
              {(() => {
                const parsed = labwareService.parseCsvContent(csvPreview);
                return (
                  <div className="overflow-x-auto">
                    <table className="min-w-full border border-gray-200 dark:border-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          {parsed.headers.map((header, index) => (
                            <th key={index} className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-600">
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {parsed.rows.map((row, rowIndex) => (
                          <tr key={rowIndex}>
                            {row.map((cell, cellIndex) => (
                              <td key={cellIndex} className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700">
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
            
            <div className="flex justify-between items-center p-6 border-t border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Total rows: {labwareService.parseCsvContent(csvPreview).rows.length}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    const fileName = `interface-${new Date().toISOString().split('T')[0]}.csv`;
                    const blob = new Blob([csvPreview], { type: 'text/csv' });

                    if ('showSaveFilePicker' in window && typeof (window as any).showSaveFilePicker === 'function') {
                      try {
                        const fileHandle = await (window as any).showSaveFilePicker({
                          suggestedName: fileName,
                          types: [
                            {
                              description: 'CSV Files',
                              accept: { 'text/csv': ['.csv'] },
                            },
                          ],
                        });
                        const writable = await fileHandle.createWritable();
                        await writable.write(blob);
                        await writable.close();
                        return;
                      } catch (error: any) {
                        if (error?.name !== 'AbortError') {
                          logger.error('Failed to save CSV via picker:', error);
                          alert('ไม่สามารถบันทึกไฟล์ได้ กรุณาลองอีกครั้ง หรือใช้วิธีดาวน์โหลดปกติ');
                        } else {
                          return;
                        }
                      }
                    }

                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = fileName;
                    link.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  <MdFileDownload className="h-4 w-4" />
                  Download CSV
                </button>
                <button
                  onClick={() => setShowCsvPreview(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {}
      {showImageModal && selectedImageUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <MdImage className="h-5 w-5" />
                Annotated Image
              </h3>
              <button
                onClick={() => setShowImageModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <MdClose className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6 overflow-auto max-h-[70vh] flex items-center justify-center">
              <div className="relative max-w-full max-h-full">
                <img
                  src={selectedImageUrl}
                  alt="Annotated prediction result"
                  className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                  onError={(e) => {
                    logger.error('Failed to load image:', selectedImageUrl);
                    e.currentTarget.style.display = 'none';
                    const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                    if (nextElement) {
                      nextElement.style.display = 'flex';
                    }
                  }}
                />
                <div 
                  className="hidden items-center justify-center w-full h-64 bg-gray-100 dark:bg-gray-700 rounded-lg"
                  style={{ display: 'none' }}
                >
                  <div className="text-center">
                    <MdZoomOut className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500 dark:text-gray-400">Failed to load image</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">URL: {selectedImageUrl}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end items-center p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowImageModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
