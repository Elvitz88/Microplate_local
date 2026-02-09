import { useState, useCallback } from 'react'
import { useMutation } from '@tanstack/react-query'
import { imageService } from '../services/image.service'
import logger from '../utils/logger'

export function useImageUpload() {
  const [uploadedImageId, setUploadedImageId] = useState<string | null>(null)
  const [predictionStatus, setPredictionStatus] = useState<string | null>(null)
  const [pollStartTime, setPollStartTime] = useState<number | null>(null)

  const uploadMutation = useMutation({
    mutationFn: ({ file, sampleNo, submissionNo, description }: {
      file: File
      sampleNo: string
      submissionNo?: string
      description?: string
    }) => imageService.uploadImage(file, sampleNo, submissionNo, description),
    onSuccess: (data) => {
      if (data.imageId) {
        setUploadedImageId(data.imageId)
      }
    },
    onError: (error) => {
      logger.error('Upload failed:', error)
    }
  })

  // Pre-upload to PVC storage (for pre-upload flow)
  const preUploadMutation = useMutation({
    mutationFn: ({ file, sampleNo, description }: {
      file: File
      sampleNo: string
      description?: string
    }) => imageService.preUploadToStorage(file, sampleNo, description),
    onSuccess: (data) => {
      logger.info('Pre-upload to PVC completed:', data)
    },
    onError: (error) => {
      logger.error('Pre-upload to PVC failed:', error)
    }
  })

  const predictionMutation = useMutation({
    mutationFn: ({ file, sampleNo, submissionNo, description, imagePath }: {
      file?: File
      sampleNo: string
      submissionNo?: string
      description?: string
      imagePath?: string  // If provided, use pre-uploaded image path (fast path)
    }) => {
      // Reset and start tracking
      setPredictionStatus('submitting')
      setPollStartTime(Date.now())

      // Status update callback for polling
      const onStatusUpdate = (status: string) => {
        setPredictionStatus(status)
        logger.debug(`Prediction status updated: ${status}`)
      }

      // If imagePath is provided, use fast path with polling (no file upload)
      if (imagePath) {
        logger.info('Using pre-uploaded image path for prediction with polling:', imagePath)
        return imageService.predictWithPathAndPolling(imagePath, sampleNo, submissionNo, description, onStatusUpdate)
      }
      // Otherwise, use standard path with polling (upload file with prediction)
      if (!file) {
        throw new Error('Either file or imagePath must be provided')
      }
      return imageService.uploadAndPredictWithPolling(file, sampleNo, submissionNo, description, onStatusUpdate)
    },
    onSuccess: (data) => {
      setPredictionStatus('completed')
      setPollStartTime(null)
      if (data.data?.run_id) {
        setUploadedImageId(data.data.run_id.toString())
      }
      logger.info('Prediction completed with annotated image:', data.data?.annotated_image_url)
    },
    onError: (error) => {
      setPredictionStatus('error')
      setPollStartTime(null)
      logger.error('Prediction failed:', error)
    }
  })

  // Reset prediction state (memoized to prevent infinite loops in useEffect dependencies)
  // Using empty deps array - setState functions are stable, and mutation.reset is stable from react-query
  const resetPrediction = useCallback(() => {
    predictionMutation.reset()
    setPredictionStatus(null)
    setPollStartTime(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    uploadedImageId,
    uploadImage: uploadMutation.mutate,
    runPrediction: predictionMutation.mutate,
    runPredictionAsync: predictionMutation.mutateAsync,  // For parallel predictions with proper status tracking
    isUploading: uploadMutation.isPending,
    isPredicting: predictionMutation.isPending,
    uploadError: uploadMutation.error,
    predictionError: predictionMutation.error,
    uploadSuccess: uploadMutation.isSuccess,
    predictionSuccess: predictionMutation.isSuccess,
    predictionData: predictionMutation.data,

    // Pre-upload to PVC (for pre-upload flow)
    preUploadToStorage: preUploadMutation.mutate,
    preUploadToStorageAsync: preUploadMutation.mutateAsync,
    isPreUploading: preUploadMutation.isPending,
    preUploadError: preUploadMutation.error,
    preUploadSuccess: preUploadMutation.isSuccess,
    preUploadData: preUploadMutation.data,

    // Reset prediction state
    resetPrediction,

    // Prediction status for UX feedback
    predictionStatus,  // 'submitting' | 'pending' | 'processing' | 'completed' | 'error' | null
    pollStartTime,     // Timestamp when polling started (for elapsed time display)

    isUploadingPending: uploadMutation.isPending,
    isPredictionPending: predictionMutation.isPending,
  }
}
