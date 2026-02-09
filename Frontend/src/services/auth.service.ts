import { authApi, imageApi, visionApi, resultsApi, labwareApi, predictionApi, captureApi } from './api'
import logger from '../utils/logger'

type RegisterRequest = {
  email: string
  username: string
  password: string
}

type RegisterResponse = {
  success: boolean
  message: string
  user?: {
    id: string
    email: string
    username: string
    createdAt?: string
  }
}

type LoginRequest = {
  username: string
  password: string
}

type LoginResponse = {
  success: boolean
  data?: {
    accessToken: string
    refreshToken?: string
    expiresIn?: number
    tokenType?: string
    user?: any
  }
  accessToken?: string
  refreshToken?: string
  message?: string
}

type ForgotPasswordRequest = { email: string }
type ForgotPasswordResponse = { message: string }
type ResetPasswordRequest = { token: string; password: string }
type ResetPasswordResponse = { message: string }

export type ProfileUser = {
  id: string
  email: string
  username: string
  fullName?: string
  avatarUrl?: string | null
  roles?: string[]
  createdAt?: string
  lastLoginAt?: string
}

const ACCESS_TOKEN_KEY = 'access_token'
const REFRESH_TOKEN_KEY = 'refresh_token'

type RuntimeConfigWindow = Window & Record<string, unknown>

function readRuntimeConfig(key: string): string | undefined {
  if (typeof window === 'undefined') return undefined
  const runtime = window as unknown as RuntimeConfigWindow
  const value = runtime[key]
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

const getAuthBaseUrl = () => {
  const defaultUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:6401'
  return readRuntimeConfig('AUTH_SERVICE_URL') || process.env.VITE_AUTH_SERVICE_URL || defaultUrl
}

const storeTokensFromResponse = (res: LoginResponse) => {
  let accessToken = null
  let refreshToken = null

  if (res.accessToken) {
    accessToken = res.accessToken
    refreshToken = res.refreshToken
  } else if (res.data && res.data.accessToken) {
    accessToken = res.data.accessToken
    refreshToken = res.data.refreshToken
  }

  logger.debug('AuthService: Extracted accessToken:', accessToken ? 'Present' : 'Missing')
  logger.debug('AuthService: Extracted refreshToken:', refreshToken ? 'Present' : 'Missing')

  if (accessToken) {
    logger.debug('AuthService: Storing tokens in localStorage...')
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
    logger.debug('AuthService: Access token stored:', localStorage.getItem(ACCESS_TOKEN_KEY) ? 'Success' : 'Failed')

    if (refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
      logger.debug('AuthService: Refresh token stored:', localStorage.getItem(REFRESH_TOKEN_KEY) ? 'Success' : 'Failed')
    }

    authService.setTokensForAllServices(accessToken)
    logger.info('AuthService: Token stored and set for all services')

    const storedToken = localStorage.getItem(ACCESS_TOKEN_KEY)
    logger.debug('AuthService: Verification - stored token present:', !!storedToken)
    logger.debug('AuthService: Verification - token valid:', authService.isTokenValid())
  } else {
    logger.error('AuthService: No accessToken found in response')
  }
}

export const authService = {
  async register(payload: RegisterRequest) {
    return authApi.post<RegisterResponse>('/api/v1/auth/register', payload)
  },
  async login(payload: LoginRequest) {
    const res = await authApi.post<LoginResponse>('/api/v1/auth/login', payload)
    logger.info('AuthService: Login response:', res)
    storeTokensFromResponse(res)
    
    return res
  },
  async exchangeSsoCode(code: string) {
    const res = await authApi.post<LoginResponse>('/api/v1/auth/sso/exchange', { code })
    logger.info('AuthService: SSO exchange response:', res)
    storeTokensFromResponse(res)
    return res
  },
  getSsoLoginUrl(continueUrl: string) {
    // Updated to use /login/aad endpoint (cookie-based SSO)
    const url = new URL('/api/v1/auth/login/aad', getAuthBaseUrl())
    url.searchParams.set('continue', continueUrl)
    return url.toString()
  },
  async requestPasswordReset(payload: ForgotPasswordRequest) {
    return authApi.post<ForgotPasswordResponse>('/api/v1/auth/forgot-password', payload)
  },
  async resetPassword(payload: ResetPasswordRequest) {
    return authApi.post<ResetPasswordResponse>('/api/v1/auth/reset-password', payload)
  },
  async getProfile() {
    const res = await authApi.get<{ success: boolean; data: ProfileUser }>('/api/v1/auth/profile')
    return res.data
  },
  async updateProfile(payload: { email?: string; username?: string; fullName?: string; avatarUrl?: string | null }) {
    return authApi.put<{ success: boolean; message: string; data?: ProfileUser }>('/api/v1/auth/profile', payload)
  },
  async changePassword(payload: { currentPassword: string; newPassword: string }) {
    return authApi.put<{ success: boolean; message: string }>('/api/v1/auth/change-password', payload)
  },
  loadTokenFromStorage() {
    logger.debug('AuthService: Loading token from storage...')
    const token = localStorage.getItem(ACCESS_TOKEN_KEY)
    logger.debug('AuthService: Token from storage:', token ? 'Present' : 'Missing')
    if (token) {
      logger.debug('AuthService: Setting token for all services from storage...')
      
      this.setTokensForAllServices(token)
    }
    return token
  },
  
  
  setTokensForAllServices(token: string) {
    logger.debug('AuthService: Setting token for authApi...')
    authApi.setAccessToken(token)
    logger.debug('AuthService: Setting token for imageApi...')
    imageApi.setAccessToken(token)
    logger.debug('AuthService: Setting token for visionApi...')
    visionApi.setAccessToken(token)
    logger.debug('AuthService: Setting token for resultsApi...')
    resultsApi.setAccessToken(token)
    logger.debug('AuthService: Setting token for labwareApi...')
    labwareApi.setAccessToken(token)
    logger.debug('AuthService: Setting token for predictionApi...')
    predictionApi.setAccessToken(token)
    logger.debug('AuthService: Setting token for captureApi...')
    captureApi.setAccessToken(token)
    logger.debug('AuthService: All services token set complete')
  },
  
  
  clearTokensFromAllServices() {
    authApi.setAccessToken('')
    imageApi.setAccessToken('')
    visionApi.setAccessToken('')
    resultsApi.setAccessToken('')
    labwareApi.setAccessToken('')
    predictionApi.setAccessToken('')
    captureApi.setAccessToken('')
  },
  
  // Check if token is valid (not expired)
  isTokenValid(): boolean {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY)
    if (!token) return false
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      const now = Math.floor(Date.now() / 1000)
      return payload.exp && payload.exp > now
    } catch {
      return false
    }
  },
  
  // Get current token
  getCurrentToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY)
  },
  
  // Refresh token (if available)
  async refreshToken() {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
    if (!refreshToken) {
      throw new Error('No refresh token available')
    }
    
    try {
      const res = await authApi.post<LoginResponse>('/api/v1/auth/refresh', { refreshToken })
      
      
      let accessToken = null
      let newRefreshToken = null
      
      if (res.accessToken) {
        
        accessToken = res.accessToken
        newRefreshToken = res.refreshToken
      } else if (res.data && res.data.accessToken) {
        
        accessToken = res.data.accessToken
        newRefreshToken = res.data.refreshToken
      }
      
      if (accessToken) {
        localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
        if (newRefreshToken) {
          localStorage.setItem(REFRESH_TOKEN_KEY, newRefreshToken)
        }
        this.setTokensForAllServices(accessToken)
        return accessToken
      }
    } catch (error) {
      
      this.logout()
      throw error
    }
  },
  
  logout() {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    this.clearTokensFromAllServices()
  },
}


