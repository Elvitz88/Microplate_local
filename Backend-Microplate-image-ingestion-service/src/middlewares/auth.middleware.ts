import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface AuthConfig {
  jwtSecret: string;
  jwtIssuer?: string;
  jwtAudience?: string;
}

export const authenticateToken = (config: AuthConfig) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.split(' ')[1];

      if (!token) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'MISSING_TOKEN',
            message: 'Access token is required'
          }
        });
      }

      
      const decoded = jwt.verify(token, config.jwtSecret, {
        issuer: config.jwtIssuer,
        audience: config.jwtAudience
      }) as any;

      
      (req as any).user = {
        id: decoded.sub || decoded.id,
        email: decoded.email,
        role: decoded.role || 'user',
        iat: decoded.iat,
        exp: decoded.exp
      };

      next();
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'TOKEN_EXPIRED',
            message: 'Access token has expired'
          }
        });
      }

      if (error instanceof jwt.JsonWebTokenError) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid access token'
          }
        });
      }

      return res.status(500).json({
        success: false,
        error: {
          code: 'AUTH_ERROR',
          message: 'Authentication error'
        }
      });
    }
  };
};
