import { imageApi, visionApi, predictionApi } from './api'
import logger from '../utils/logger'

type ImageUploadResponse = {
  success: boolean
  message: string
  imageId?: string
  imageUrl?: string
}

type GridMetadata = {
  bounds?: {
    left: number
    right: number
    top: number
    bottom: number
  }
  columns?: number[]
  rows?: number[]
  original_size?: [number, number]
}

type PredictionResponse = {
  success: boolean
  data?: {
    run_id: number
    sample_no: string
    submission_no?: string
    predict_at?: string
    model_version: string
    status: 'completed' | 'failed' | 'pending' | 'processing'
    processing_time_ms: number
    annotated_image_url: string
    statistics: {
      total_detections: number
      wells_analyzed: number
      average_confidence: number
    }
    well_predictions: Array<{
      wellId: string
      label: string
      class: string
      confidence: number
      bbox: any
    }>
    row_counts: any
    inference_results: {
      distribution: any
    }
    grid_metadata?: GridMetadata
  }
  error?: {
    code: string
    message: string
    details?: any
  }
}

type CaptureResponse = {
  success: boolean
  message: string
  imageUrl?: string
}

type PreUploadResponse = {
  success: boolean
  data?: {
    filePath: string
    fileId?: string
    signedUrl?: string
  }
  error?: {
    code: string
    message: string
  }
}

// Response from prediction-db-service GET /api/v1/predictions/:id
type PredictionResultResponse = {
  success: boolean
  data?: {
    id: number
    sampleNo: string
    submissionNo?: string
    description?: string
    predictAt: string
    annotatedImagePath?: string
    rawImagePath?: string
    modelVersion?: string
    status: 'pending' | 'processing' | 'completed' | 'failed'
    errorMsg?: string
    processingTimeMs?: number
    createdBy?: string
    wellPredictions?: Array<{
      id: number
      wellId: string
      label: string
      className: string
      confidence: number
      bbox: any
    }>
    rowCounts?: Array<{
      id: number
      counts: any
    }>
    inferenceResults?: Array<{
      id: number
      results: any
    }>
  }
  error?: string
}

const POLL_INITIAL_MS = 200    // First poll after 200ms (catch fast completions early)
const POLL_MAX_MS = 2000       // Cap interval at 2s for long-running jobs
const MAX_POLL_TIME_MS = 120000  // Max 2 minutes

/** Adaptive interval: starts fast (200ms), grows with elapsed time, caps at 2s */
function getPollInterval(elapsedMs: number): number {
  // 200ms → 400ms → 600ms → … → 2000ms (cap)
  return Math.min(POLL_INITIAL_MS + Math.floor(elapsedMs / 1000) * 200, POLL_MAX_MS)
}

export const imageService = {
  
  async uploadImage(file: File, sampleNo: string, submissionNo?: string, description?: string): Promise<ImageUploadResponse> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('sample_no', sampleNo)
    if (submissionNo) {
      formData.append('submission_no', submissionNo)
    }
    if (description) {
      formData.append('description', description)
    }
    formData.append('file_type', 'raw')

    return imageApi.postFormData<ImageUploadResponse>('/api/v1/ingestion/images', formData)
  },

  
  async runPrediction(): Promise<PredictionResponse> {
    
    
    throw new Error('runPrediction should be called with file upload directly to vision-inference-service')
  },

  
  async uploadAndPredict(file: File, sampleNo: string, submissionNo?: string, description?: string): Promise<PredictionResponse> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('sample_no', sampleNo)
    if (submissionNo) {
      formData.append('submission_no', submissionNo)
    }
    if (description) {
      formData.append('description', description)
    }
    // Priority 10 = highest in RabbitMQ queue so this job is picked before older/lower-priority jobs
    formData.append('priority', '10')

    return visionApi.postFormData<PredictionResponse>('/api/v1/vision/predict', formData)
  },

  // Pre-upload image to PVC storage before prediction (reduces bottleneck)
  async preUploadToStorage(file: File, sampleNo: string, description?: string): Promise<PreUploadResponse> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('sample_no', sampleNo)
    if (description) {
      formData.append('description', description)
    }
    formData.append('file_type', 'raw')

    return imageApi.postFormData<PreUploadResponse>('/api/v1/ingestion/images', formData)
  },

  // Predict using pre-uploaded image path (fast path - no file upload needed)
  async predictWithPath(imagePath: string, sampleNo: string, submissionNo?: string, description?: string): Promise<PredictionResponse> {
    const formData = new FormData()
    formData.append('image_path', imagePath)
    formData.append('sample_no', sampleNo)
    if (submissionNo) {
      formData.append('submission_no', submissionNo)
    }
    if (description) {
      formData.append('description', description)
    }
    formData.append('priority', '10')

    return visionApi.postFormData<PredictionResponse>('/api/v1/vision/predict', formData)
  },


  async captureImage(sampleNo?: string): Promise<CaptureResponse> {
    return visionApi.post<CaptureResponse>('/api/v1/capture/snap', sampleNo ? { sampleNo } : undefined)
  },

  // Get prediction result from prediction-db-service
  async getPredictionResult(runId: number): Promise<PredictionResultResponse> {
    return predictionApi.get<PredictionResultResponse>(`/api/v1/prediction/${runId}`)
  },

  // Poll for prediction completion and return full result
  async pollForCompletion(runId: number, onStatusUpdate?: (status: string) => void): Promise<PredictionResponse> {
    const startTime = Date.now()

    while (Date.now() - startTime < MAX_POLL_TIME_MS) {
      const result = await this.getPredictionResult(runId)

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to get prediction result')
      }

      const { status, annotatedImagePath } = result.data
      logger.debug(`Polling run ${runId}: status=${status}`)

      if (onStatusUpdate) {
        onStatusUpdate(status)
      }

      if (status === 'completed') {
        // Convert PredictionResultResponse to PredictionResponse format
        const data = result.data
        return {
          success: true,
          data: {
            run_id: data.id,
            sample_no: data.sampleNo,
            submission_no: data.submissionNo,
            predict_at: data.predictAt,
            model_version: data.modelVersion || '',
            status: 'completed',
            processing_time_ms: data.processingTimeMs || 0,
            annotated_image_url: annotatedImagePath || '',
            statistics: {
              total_detections: (data.wellPredictions ?? []).length,
              wells_analyzed: (data.wellPredictions ?? []).length,
              average_confidence: (data.wellPredictions ?? []).length
                ? (data.wellPredictions ?? []).reduce((sum, w) => sum + (w?.confidence ?? 0), 0) / (data.wellPredictions ?? []).length
                : 0
            },
            well_predictions: (data.wellPredictions ?? []).map(w => ({
              wellId: w.wellId,
              label: w.label,
              class: w.className,
              confidence: w.confidence,
              bbox: w.bbox
            })),
            row_counts: data.rowCounts?.[0]?.counts || {},
            inference_results: {
              distribution: data.inferenceResults?.[0]?.results?.distribution || {}
            },
            grid_metadata: undefined  // Grid metadata not stored in prediction-db
          }
        }
      }

      if (status === 'failed') {
        throw new Error(result.data.errorMsg || 'Prediction failed')
      }

      // Wait with adaptive interval (fast at start, slower over time)
      const interval = getPollInterval(Date.now() - startTime)
      await new Promise(resolve => setTimeout(resolve, interval))
    }

    throw new Error('Prediction timed out')
  },

  // Upload, predict, and poll for completion (full flow)
  async uploadAndPredictWithPolling(
    file: File,
    sampleNo: string,
    submissionNo?: string,
    description?: string,
    onStatusUpdate?: (status: string) => void
  ): Promise<PredictionResponse> {
    // Step 1: Submit prediction job
    const submitResponse = await this.uploadAndPredict(file, sampleNo, submissionNo, description)

    if (!submitResponse.success || !submitResponse.data?.run_id) {
      throw new Error('Failed to submit prediction job')
    }

    const runId = submitResponse.data.run_id
    logger.info(`Prediction job submitted, run_id=${runId}. Polling for completion...`)

    if (onStatusUpdate) {
      onStatusUpdate('pending')
    }

    // Step 2: Poll for completion
    return this.pollForCompletion(runId, onStatusUpdate)
  },

  // Predict with path and poll for completion (full flow)
  async predictWithPathAndPolling(
    imagePath: string,
    sampleNo: string,
    submissionNo?: string,
    description?: string,
    onStatusUpdate?: (status: string) => void
  ): Promise<PredictionResponse> {
    // Step 1: Submit prediction job
    const submitResponse = await this.predictWithPath(imagePath, sampleNo, submissionNo, description)

    if (!submitResponse.success || !submitResponse.data?.run_id) {
      throw new Error('Failed to submit prediction job')
    }

    const runId = submitResponse.data.run_id
    logger.info(`Prediction job submitted (fast path), run_id=${runId}. Polling for completion...`)

    if (onStatusUpdate) {
      onStatusUpdate('pending')
    }

    // Step 2: Poll for completion
    return this.pollForCompletion(runId, onStatusUpdate)
  }
}
