import { resultsApi } from './api';
import { authService } from './auth.service';
import logger from '../utils/logger';


interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}


const getAuthToken = (): string | null => {
  return authService.loadTokenFromStorage();
};


interface InferenceResult {
  id: number;
  runId: number;
  results: {
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
  createdAt: string;
}


interface PredictionRunSummary {
  runId: number;
  sampleNo?: string;
  submissionNo?: string;
  description?: string;
  predictAt: string;
  modelVersion?: string;
  status: string;
  processingTimeMs?: number;
  statistics: {
    totalDetections: number;
    positiveCount: number;
    negativeCount: number;
    averageConfidence: number;
  };
  inferenceResults: InferenceResult[];
  wellPredictions: any[];
  rawImagePath?: string;
  annotatedImagePath?: string;
}

interface SampleSummary {
  sampleNo: string;
  submissionNo?: string;
  description?: string;
  summary: {
    distribution: Record<string, number>;
    concentration: {
      positive_percentage: number;
      negative_percentage: number;
    };
    quality_metrics: {
      image_quality_score: number;
      well_detection_accuracy: number;
      overall_confidence: number;
    };
  };
  totalRuns: number;
  lastRunAt: string;
  lastRunId: number;
  createdAt: string;
  updatedAt: string;
}

interface PaginatedResult<T> {
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


export const resultsServiceDirect = {
  async getSampleSummary(sampleNo: string): Promise<SampleSummary> {
    logger.debug('resultsServiceDirect: Getting sample summary', { sampleNo });
    const token = getAuthToken();
    if (token) {
      resultsApi.setAccessToken(token);
    }

    try {
      const result = await resultsApi.get<SampleSummary>(`/api/v1/result/direct/samples/${sampleNo}/summary`);
      logger.debug('resultsServiceDirect: Sample summary retrieved', { sampleNo });
      return result;
    } catch (error) {
      logger.error('resultsServiceDirect: Failed to get sample summary', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  },

  async getSampleRuns(
    sampleNo: string,
    options: { page?: number; limit?: number; sortBy?: string; sortOrder?: 'asc' | 'desc' } = {}
  ): Promise<PaginatedResult<PredictionRunSummary>> {
    logger.debug('resultsServiceDirect: Getting sample runs', { sampleNo, options });
    const token = getAuthToken();
    if (token) {
      resultsApi.setAccessToken(token);
    }

    try {
      const params = new URLSearchParams();
      if (options.page) params.append('page', options.page.toString());
      if (options.limit) params.append('limit', options.limit.toString());
      if (options.sortBy) params.append('sortBy', options.sortBy);
      if (options.sortOrder) params.append('sortOrder', options.sortOrder);

      const result = await resultsApi.get<PaginatedResult<PredictionRunSummary>>(
        `/api/v1/result/direct/samples/${sampleNo}/runs?${params.toString()}`
      );
      logger.debug('resultsServiceDirect: Sample runs retrieved', { count: result.data.length });
      return result;
    } catch (error) {
      logger.error('resultsServiceDirect: Failed to get sample runs', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  },

  async getRunDetails(runId: number): Promise<unknown> {
    logger.debug('resultsServiceDirect: Getting run details', { runId });
    const token = getAuthToken();
    if (token) {
      resultsApi.setAccessToken(token);
    }

    try {
      const result = await resultsApi.get<unknown>(`/api/v1/result/direct/runs/${runId}`);
      logger.debug('resultsServiceDirect: Run details retrieved', { runId });
      return result;
    } catch (error) {
      logger.error('resultsServiceDirect: Failed to get run details', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  },

  extractInferenceResults(run: PredictionRunSummary): InferenceResult[] {
    return run.inferenceResults || [];
  },

  getDistributionFromInferenceResults(inferenceResults: InferenceResult[]): Record<string, number> {
    if (!inferenceResults || inferenceResults.length === 0) {
      return {};
    }

    return inferenceResults[0].results.distribution || {};
  },

  /**
   * @deprecated MinIO is no longer used. System now uses PVC storage.
   * This function is kept only for backward compatibility with old image paths.
   * All new images should be accessed via getSignedImageUrl() through Image Service API.
   */
  getMinioImageUrl(imagePath: string): string {
    if (!imagePath) return '';

    if (imagePath.startsWith('http')) {
      let baseUrl = imagePath.replace('http://minio:9000', 'http://localhost:9000');
      baseUrl = baseUrl.split('?')[0];
      return baseUrl;
    }

    const minioBaseUrl = window.MINIO_BASE_URL || 'http://localhost:9000';
    return `${minioBaseUrl}/${imagePath}`;
  },

  getRawImageUrl(run: PredictionRunSummary): string {
    return this.getMinioImageUrl(run.rawImagePath || '');
  },

  getAnnotatedImageUrl(run: PredictionRunSummary): string {
    return this.getMinioImageUrl(run.annotatedImagePath || '');
  },

  async getSignedImageUrl(imagePath: string, isAnnotated: boolean = false): Promise<string> {
    if (!imagePath) {
      throw new Error('Image path is required');
    }

    // If imagePath is already a signed URL, return it directly
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      logger.debug('📎 Image path is already a URL, using directly', { imagePath });
      return imagePath;
    }

    const token = getAuthToken();
    if (!token) {
      logger.error('No authentication token available for signed URL generation');
      throw new Error('Authentication required. Please log in again.');
    }

    try {
      logger.debug('🔐 Getting signed URL for image path', { imagePath, isAnnotated });

      // PVC STORAGE: All files are accessed through Image Ingestion Service API
      // No direct file access or MinIO - files are stored in PVC mounted at /mnt/storage
      // Use runtime config for Image Service URL (supports both local dev and K8s deployment)
      const imageServiceBaseUrl = (window as any).IMAGE_SERVICE_URL ||
        (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:6402');

      // Extract sampleNo from the path (e.g., "raw-images/SAMPLE001/filename.jpg" -> "SAMPLE001")
      const pathParts = imagePath.split('/');
      let sampleNo = '';
      let fileType = isAnnotated ? 'annotated' : 'raw';

      // Parse the path to extract sampleNo
      if (pathParts.length >= 2) {
        // Path format: "raw-images/SAMPLE001/filename.jpg" or "annotated-images/SAMPLE001/filename.jpg"
        if (pathParts[0].includes('annotated')) {
          fileType = 'annotated';
          sampleNo = pathParts[1];
        } else if (pathParts[0].includes('raw')) {
          fileType = 'raw';
          sampleNo = pathParts[1];
        } else {
          // If path doesn't start with folder name, assume format: "SAMPLE001/filename.jpg"
          sampleNo = pathParts[0];
        }
      }

      logger.debug('📂 Parsed image path', { sampleNo, fileType, imagePath });

      // Step 1: Query Image Service to find the file by sampleNo and type
      let filesResponse;
      try {
        logger.debug('🔍 Querying Image Service for files', {
          url: `${imageServiceBaseUrl}/api/v1/ingestion/files`,
          params: { type: fileType, sampleNo }
        });

        filesResponse = await fetch(
          `${imageServiceBaseUrl}/api/v1/ingestion/files?type=${fileType}&sampleNo=${sampleNo}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            },
            signal: AbortSignal.timeout(10000) // 10 second timeout
          }
        );
      } catch (fetchError: any) {
        logger.error('❌ Failed to connect to Image Ingestion Service', {
          error: fetchError.message,
          imageServiceBaseUrl,
          errorType: fetchError.name,
          timeout: fetchError.name === 'TimeoutError' || fetchError.name === 'AbortError'
        });

        // No fallback available - PVC storage is only accessible through Image Service
        throw new Error(
          `Cannot connect to Image Service at ${imageServiceBaseUrl}.\n\n` +
          `Possible causes:\n` +
          `• Image Ingestion Service is not running\n` +
          `• Network connectivity issues\n` +
          `• Service is starting up\n\n` +
          `Please ensure the Image Ingestion Service is running and try again.`
        );
      }

      if (!filesResponse.ok) {
        logger.error('❌ Image Service returned error', {
          status: filesResponse.status,
          statusText: filesResponse.statusText,
          url: filesResponse.url
        });

        if (filesResponse.status === 401 || filesResponse.status === 403) {
          throw new Error('Authentication failed. Please log in again.');
        }

        if (filesResponse.status === 404) {
          throw new Error(`Image Service endpoint not found. Please check service configuration.`);
        }

        throw new Error(
          `Image Service error (${filesResponse.status}): ${filesResponse.statusText}.\n\n` +
          `Please try again or contact your administrator.`
        );
      }

      const filesResult = await filesResponse.json();

      if (!filesResult.success || !filesResult.data || filesResult.data.length === 0) {
        logger.error('❌ No files found in database', { sampleNo, fileType, imagePath });

        throw new Error(
          `No ${fileType} image files found for sample "${sampleNo}".\n\n` +
          `The image may not have been uploaded yet, or the file path may be incorrect.\n\n` +
          `File path: ${imagePath}`
        );
      }

      // Find the matching file by comparing filePath
      const matchingFile = filesResult.data.find((file: any) => file.filePath === imagePath);

      if (!matchingFile) {
        // If no exact match, use the first file (most recent)
        logger.warn('⚠️ No exact file match found, using most recent file', {
          imagePath,
          availableFiles: filesResult.data.length,
          firstFile: filesResult.data[0]?.filePath
        });
      }

      const fileId = matchingFile ? matchingFile.id : filesResult.data[0].id;
      const actualFilePath = matchingFile?.filePath || filesResult.data[0].filePath;

      logger.debug('📄 Found file in database', {
        fileId,
        filePath: actualFilePath,
        exactMatch: !!matchingFile
      });

      // Step 2: Generate signed URL using Image Service API
      let urlResponse;
      try {
        logger.debug('🔑 Requesting signed URL from Image Service', { fileId });

        urlResponse = await fetch(`${imageServiceBaseUrl}/api/v1/ingestion/files/${fileId}/url`, {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          signal: AbortSignal.timeout(10000) // 10 second timeout
        });
      } catch (fetchError: any) {
        logger.error('❌ Failed to generate signed URL', {
          error: fetchError.message,
          fileId,
          errorType: fetchError.name
        });

        throw new Error(
          `Failed to generate secure download URL.\n\n` +
          `Error: ${fetchError.message}\n\n` +
          `Please try again or contact your administrator.`
        );
      }

      if (!urlResponse.ok) {
        const errorText = await urlResponse.text();
        logger.error('❌ Signed URL generation failed', {
          status: urlResponse.status,
          statusText: urlResponse.statusText,
          errorText,
          fileId
        });

        if (urlResponse.status === 404) {
          throw new Error(
            `File not found in PVC storage (File ID: ${fileId}).\n\n` +
            `The file may have been deleted or the database is out of sync.`
          );
        }

        throw new Error(
          `Failed to generate secure download URL (${urlResponse.status}).\n\n` +
          `${urlResponse.statusText}\n\n` +
          `Please try again or contact your administrator.`
        );
      }

      const urlResult = await urlResponse.json();

      if (!urlResult.success || !urlResult.data?.signedUrl) {
        logger.error('❌ Invalid signed URL response', { urlResult });

        throw new Error(
          `Invalid response from Image Service.\n\n` +
          `The service returned an unexpected response format.\n\n` +
          `Please contact your administrator.`
        );
      }

      logger.debug('✅ Generated signed URL successfully', {
        fileId,
        expiresAt: urlResult.data.expiresAt,
        urlLength: urlResult.data.signedUrl.length
      });

      return urlResult.data.signedUrl;
    } catch (error) {
      logger.error('💥 Error in getSignedImageUrl', {
        error: error instanceof Error ? error.message : String(error),
        imagePath,
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  },


  async getSamples(): Promise<ApiResponse<SampleSummary[]>> {
    try {
      logger.debug('Using resultsApi for getSamples');
      const result = await resultsApi.get<SampleSummary[]>('/api/v1/result/direct/samples');
      logger.debug('resultsServiceDirect: Samples retrieved', { count: result.length });
      return {
        success: true,
        data: result
      };
    } catch (error) {
      logger.error('resultsServiceDirect: Failed to get samples', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  },


  async deleteRun(runId: number): Promise<boolean> {
    logger.debug('resultsServiceDirect: Deleting run', { runId });
    const token = getAuthToken();
    if (token) {
      resultsApi.setAccessToken(token);
    }

    try {
      await resultsApi.delete(`/api/v1/result/direct/runs/${runId}`);
      logger.debug('resultsServiceDirect: Run deleted successfully');
      return true;
    } catch (error) {
      logger.error('resultsServiceDirect: Failed to delete run', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }
};
