class ApiError extends Error {
  status: number
  isConnectionError: boolean = false

  constructor(status: number, message: string, isConnectionError: boolean = false) {
    super(message)
    this.status = status
    this.isConnectionError = isConnectionError
    this.name = 'ApiError'
  }
}

export class ApiService {
  private baseURL: string
  private pathPrefix: string
  private accessToken: string | null = null

  constructor(baseURL: string, pathPrefix: string = '') {
    this.baseURL = baseURL
    this.pathPrefix = pathPrefix
  }

  setAccessToken(token: string) {
    this.accessToken = token
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const prefixedEndpoint = this.pathPrefix ? `${this.pathPrefix}${endpoint}` : endpoint
    const url = `${this.baseURL}${prefixedEndpoint}`
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    }
    if (this.accessToken) {
      ; (headers as Record<string, string>).Authorization = `Bearer ${this.accessToken}`
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include',  // ✅ Send cookies with requests
        signal: options.signal
      }).catch((fetchError: any) => {
        const errorMessage = fetchError?.message || String(fetchError || '')
        const isCorsError = (fetchError instanceof TypeError || fetchError?.name === 'TypeError') &&
          errorMessage.includes('Failed to fetch') &&
          !errorMessage.includes('ERR_CONNECTION_REFUSED') &&
          !errorMessage.includes('ERR_FAILED')
        if (isCorsError) {
          throw new ApiError(0, `CORS error: Backend service at ${url} is running but CORS is not configured. Gateway should handle CORS.`, true)
        }

        if (fetchError instanceof TypeError ||
          fetchError?.name === 'TypeError' ||
          errorMessage.includes('Failed to fetch') ||
          errorMessage.includes('ERR_CONNECTION_REFUSED') ||
          errorMessage.includes('ERR_FAILED') ||
          errorMessage.includes('NetworkError')) {
          throw new ApiError(0, `Network error: Unable to connect to ${url}. Backend service may not be running.`, true)
        }

        throw fetchError
      })

      if (!response.ok) {
        const text = await response.text()
        throw new ApiError(response.status, text || 'Request failed')
      }
      return response.json()
    } catch (error: any) {
      if (error instanceof ApiError) {
        throw error
      }

      const errorMessage = error?.message || String(error || '')
      if (errorMessage.includes('CORS') ||
        errorMessage.includes('Access-Control-Allow-Origin') ||
        errorMessage.includes('preflight')) {
        throw new ApiError(0, `CORS error: Backend service at ${url} is running but CORS is not configured. Gateway should handle CORS.`, true)
      }

      if (error instanceof TypeError ||
        errorMessage.includes('Failed to fetch') ||
        errorMessage.includes('ERR_CONNECTION_REFUSED') ||
        errorMessage.includes('ERR_FAILED') ||
        errorMessage.includes('NetworkError')) {
        throw new ApiError(0, `Network error: Unable to connect to ${url}. Backend service may not be running.`, true)
      }

      throw new ApiError(0, errorMessage || 'Unknown error', false)
    }
  }

  get<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'GET' })
  }
  post<T>(endpoint: string, data?: any) {
    return this.request<T>(endpoint, { method: 'POST', body: data ? JSON.stringify(data) : undefined })
  }

  put<T>(endpoint: string, data?: any) {
    return this.request<T>(endpoint, { method: 'PUT', body: data ? JSON.stringify(data) : undefined })
  }

  delete<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'DELETE' })
  }

  patch<T>(endpoint: string, data?: any) {
    return this.request<T>(endpoint, { method: 'PATCH', body: data ? JSON.stringify(data) : undefined })
  }

  postFormData<T>(endpoint: string, formData: FormData): Promise<T> {
    const prefixedEndpoint = this.pathPrefix ? `${this.pathPrefix}${endpoint}` : endpoint
    const url = `${this.baseURL}${prefixedEndpoint}`
    const headers: HeadersInit = {}
    if (this.accessToken) {
      ; (headers as Record<string, string>).Authorization = `Bearer ${this.accessToken}`
    }

    return fetch(url, {
      method: 'POST',
      headers,
      credentials: 'include',  // ✅ Send cookies with requests
      body: formData,
    }).then(async (response) => {
      if (!response.ok) {
        const text = await response.text()
        throw new ApiError(response.status, text || 'Upload failed')
      }
      return response.json()
    })
  }
}

type RuntimeConfigWindow = Window & Record<string, unknown>

function readRuntimeConfig(key: string): string | undefined {
  if (typeof window === 'undefined') return undefined
  const runtime = window as RuntimeConfigWindow
  const value = runtime[key]
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

const defaultGatewayBaseUrl =
  typeof window !== 'undefined' ? window.location.origin : 'http://localhost:6410'
const gatewayBaseUrl =
  readRuntimeConfig('API_BASE_URL') ||
  readRuntimeConfig('API_HOST') ||
  defaultGatewayBaseUrl

export const authApi = new ApiService(
  readRuntimeConfig('AUTH_SERVICE_URL') || process.env.VITE_AUTH_SERVICE_URL || gatewayBaseUrl
)
export const imageApi = new ApiService(
  readRuntimeConfig('IMAGE_SERVICE_URL') || process.env.VITE_IMAGE_SERVICE_URL || gatewayBaseUrl
)
export const visionApi = new ApiService(
  readRuntimeConfig('VISION_SERVICE_URL') || process.env.VITE_VISION_SERVICE_URL || gatewayBaseUrl
)
export const resultsApi = new ApiService(
  readRuntimeConfig('RESULTS_SERVICE_URL') || process.env.VITE_RESULTS_SERVICE_URL || gatewayBaseUrl
)
export const labwareApi = new ApiService(
  readRuntimeConfig('LABWARE_SERVICE_URL') || process.env.VITE_LABWARE_SERVICE_URL || gatewayBaseUrl
)
export const predictionApi = new ApiService(
  readRuntimeConfig('PREDICTION_SERVICE_URL') || process.env.VITE_PREDICTION_SERVICE_URL || gatewayBaseUrl
)
export const captureApi = new ApiService(
  readRuntimeConfig('VISION_CAPTURE_SERVICE_URL') ||
  process.env.VITE_VISION_CAPTURE_SERVICE_URL ||
  gatewayBaseUrl
)
