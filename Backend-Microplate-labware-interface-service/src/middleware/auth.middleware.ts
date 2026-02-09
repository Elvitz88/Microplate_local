import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    iat: number;
    exp: number;
  };
}

interface AuthConfig {
  jwtSecret: string;
  jwtIssuer?: string;
  jwtAudience?: string;
}

export const authenticateToken = (config: AuthConfig) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.split(' ')[1];
      
      logger.debug('🔍 Auth middleware: Authorization header', { authorization: authHeader });
      logger.debug('🔍 Auth middleware: Extracted token', {
        tokenPreview: token ? `${token.substring(0, 20)}...` : 'No token',
      });
      logger.debug('🔍 Auth middleware: Config', {
        jwtSecret: config.jwtSecret ? 'Secret set' : 'No secret',
        jwtIssuer: config.jwtIssuer,
        jwtAudience: config.jwtAudience,
      });

      if (!token) {
        logger.warn('❌ Auth middleware: No token provided');
        res.status(401).json({
          success: false,
          error: {
            code: 'MISSING_TOKEN',
            message: 'Access token is required'
          }
        });
        return;
      }

      logger.debug('🔍 Auth middleware: Verifying token with options', {
        issuer: config.jwtIssuer,
        audience: config.jwtAudience,
      });
      
      const decoded = jwt.verify(token, config.jwtSecret, {
        issuer: config.jwtIssuer,
        audience: config.jwtAudience
      }) as any;
      
      logger.info('✅ Auth middleware: Token verified successfully', {
        sub: decoded.sub,
        iss: decoded.iss,
        aud: decoded.aud,
        exp: decoded.exp,
        iat: decoded.iat,
      });

      req.user = {
        id: decoded.sub || decoded.id,
        email: decoded.email,
        role: decoded.role || 'user',
        iat: decoded.iat,
        exp: decoded.exp
      };

      next();
    } catch (error) {
      logger.error('❌ Auth middleware: Token verification failed', { error });
      
      if (error instanceof jwt.TokenExpiredError) {
        logger.warn('❌ Auth middleware: Token expired');
        res.status(401).json({
          success: false,
          error: {
            code: 'TOKEN_EXPIRED',
            message: 'Access token has expired'
          }
        });
        return;
      }

      if (error instanceof jwt.JsonWebTokenError) {
        logger.warn('❌ Auth middleware: Invalid token', { message: error.message });
        res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid access token'
          }
        });
        return;
      }

      logger.error('❌ Auth middleware: Unknown auth error', { error });
      res.status(500).json({
        success: false,
        error: {
          code: 'AUTH_ERROR',
          message: 'Authentication error'
        }
      });
      return;
    }
  };
};
