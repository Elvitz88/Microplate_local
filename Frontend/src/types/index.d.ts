// Declare type for environment variables
declare global {
  interface Window {
    API_HOST?: string
    APP_ENV?: string
    AUTH_SERVICE_URL?: string
    IMAGE_SERVICE_URL?: string
    VISION_SERVICE_URL?: string
    RESULTS_SERVICE_URL?: string
    LABWARE_SERVICE_URL?: string
    PREDICTION_SERVICE_URL?: string
    MINIO_BASE_URL?: string
    VISION_CAPTURE_SERVICE_URL?: string
    WS_CAPTURE_URL?: string
    API_BASE_URL?: string
  }
}

export {}
