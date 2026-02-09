
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { config } from '../config/config';
import type { TokenPayload, SsoExchangeTokenPayload } from '../types/auth.types';

const ISSUER = 'microplate-auth-service';
const AUDIENCE = 'microplate-api';


export class TokenUtil {
  static generateAccessToken(
    payload: Omit<TokenPayload, 'iat' | 'exp' | 'jti' | 'type'>
  ): string {
    return jwt.sign(
      { 
        ...payload, 
        type: 'access',
        iss: ISSUER,
        aud: AUDIENCE
      },
      config.jwtAccessSecret,
      {
        expiresIn: config.tokenExpiryAccess
      } as jwt.SignOptions
    );
  }

  
  static generateRefreshToken(
    payload: Omit<TokenPayload, 'iat' | 'exp' | 'type'>
  ): string {
    return jwt.sign(
      { 
        ...payload, 
        jti: randomUUID(), 
        type: 'refresh',
        iss: ISSUER,
        aud: AUDIENCE
      },
      config.jwtAccessSecret,
      {
        expiresIn: config.tokenExpiryRefresh
      } as jwt.SignOptions
    );
  }

  
  static verifyAccessToken(token: string): TokenPayload {
    try {
      const decoded = jwt.verify(token, config.jwtAccessSecret) as TokenPayload;
      if (decoded.type !== 'access' || decoded.iss !== ISSUER || decoded.aud !== AUDIENCE) {
        throw new Error('INVALID_TOKEN_TYPE');
      }
      return decoded;
    } catch (err: any) {
      if (err?.name === 'TokenExpiredError' || err?.message === 'Token expired') {
        throw new Error('TOKEN_EXPIRED');
      }
      throw new Error('INVALID_TOKEN');
    }
  }

  
  static verifyRefreshToken(token: string): TokenPayload {
    try {
      const decoded = jwt.verify(token, config.jwtAccessSecret) as TokenPayload;
      if (decoded.type !== 'refresh' || decoded.iss !== ISSUER || decoded.aud !== AUDIENCE) {
        throw new Error('INVALID_TOKEN_TYPE');
      }
      return decoded;
    } catch (err: any) {
      if (err?.name === 'TokenExpiredError' || err?.message === 'Token expired') {
        throw new Error('REFRESH_TOKEN_EXPIRED');
      }
      throw new Error('INVALID_REFRESH_TOKEN');
    }
  }

  
  static decodeToken(token: string): any {
    return jwt.decode(token);
  }

  
  static getTokenExpiration(token: string): Date | null {
    try {
      const decoded = jwt.decode(token) as { exp?: number };
      if (decoded?.exp) return new Date(decoded.exp * 1000);
      return null;
    } catch {
      return null;
    }
  }

  
  static isTokenExpired(token: string): boolean {
    const exp = this.getTokenExpiration(token);
    return !exp || exp < new Date();
  }

  
  static generateTokenFamily(): string {
    return randomUUID();
  }

  
  static generateOtpToken(payload: { userIdentifier: string; otpType: string }): string {
    const tokenPayload = {
      userIdentifier: payload.userIdentifier,
      otpType: payload.otpType,
      jti: randomUUID(),
      type: 'otp' as const,
      iss: ISSUER,
      aud: AUDIENCE
    };

    return jwt.sign(tokenPayload, config.jwtAccessSecret, {
      expiresIn: '10m'
    } as jwt.SignOptions);
  }

  
  static getTokenId(token: string): string | null {
    try {
      const decoded = jwt.decode(token) as { jti?: string };
      return decoded?.jti ?? null;
    } catch {
      return null;
    }
  }

  
  static generatePasswordResetToken(userId: string): string {
    const payload = {
      sub: userId,
      jti: randomUUID(),
      type: 'password_reset' as const,
      iss: ISSUER,
      aud: AUDIENCE
    };
    return jwt.sign(payload, config.jwtAccessSecret, {
      expiresIn: config.passwordResetExpiry
    } as jwt.SignOptions);
  }

  static verifyPasswordResetToken(token: string): { userId: string; jti: string } {
    try {
      const decoded = jwt.verify(token, config.jwtAccessSecret) as TokenPayload;
      if (decoded.type !== 'password_reset' || decoded.iss !== ISSUER || decoded.aud !== AUDIENCE) {
        throw new Error('INVALID_TOKEN_TYPE');
      }
      return { userId: decoded.sub, jti: decoded.jti! };
    } catch (err: any) {
      if (err?.name === 'TokenExpiredError' || err?.message === 'Token expired') {
        throw new Error('PASSWORD_RESET_TOKEN_EXPIRED');
      }
      throw new Error('INVALID_PASSWORD_RESET_TOKEN');
    }
  }

  static generateSsoExchangeToken(payload: { userId: string; continueUrl?: string }): string {
    const tokenPayload = {
      sub: payload.userId,
      jti: randomUUID(),
      type: 'sso_exchange' as const,
      iss: ISSUER,
      aud: AUDIENCE,
      continueUrl: payload.continueUrl,
    };

    return jwt.sign(tokenPayload, config.jwtAccessSecret, {
      expiresIn: config.ssoExchangeExpiry,
    } as jwt.SignOptions);
  }

  static verifySsoExchangeToken(token: string): { userId: string; continueUrl?: string } {
    try {
      const decoded = jwt.verify(token, config.jwtAccessSecret) as SsoExchangeTokenPayload;
      if (decoded.type !== 'sso_exchange' || decoded.iss !== ISSUER || decoded.aud !== AUDIENCE) {
        throw new Error('INVALID_TOKEN_TYPE');
      }
      return {
        userId: decoded.sub,
        ...(decoded.continueUrl ? { continueUrl: decoded.continueUrl } : {})
      };
    } catch (err: any) {
      if (err?.name === 'TokenExpiredError' || err?.message === 'Token expired') {
        throw new Error('SSO_EXCHANGE_TOKEN_EXPIRED');
      }
      throw new Error('INVALID_SSO_EXCHANGE_TOKEN');
    }
  }
}
