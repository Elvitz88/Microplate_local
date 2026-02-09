export interface User {
  id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  isActive: boolean;
  emailVerified: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  roles: string[];
  avatarUrl?: string | null;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  email: string;
  username: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface TokenPayload {
  sub: string;
  email: string;
  username: string;
  roles: string[];
  jti: string;
  iat: number;
  exp: number;
  type: 'access' | 'refresh' | 'password_reset';
  iss?: string;
  aud?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
  user: User;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetData {
  token: string;
  newPassword: string;
}

export interface SsoExchangeRequest {
  code: string;
}

export interface SsoExchangeTokenPayload {
  sub: string;
  jti: string;
  iat: number;
  exp: number;
  type: 'sso_exchange';
  iss?: string;
  aud?: string;
  continueUrl?: string;
}

interface ApiErrorDetail {
  code: string;
  message: string;
  details?: unknown;
  requestId?: string;
  timestamp: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiErrorDetail;
  message?: string;
}

export interface AuditLogData {
  action: string;
  resource?: string;
  resourceId?: string;
  details?: unknown;
  ipAddress?: string;
  userAgent?: string;
}

export interface DeviceInfo {
  userAgent: string;
  ipAddress: string;
  deviceFingerprint?: string;
}
