import { Request, Response, NextFunction } from 'express';
import { TokenUtil } from '../utils/token.util';
import { logger } from '../utils/logger';

export type AuthRequest = Request & { userId?: string };

/**
 * Require valid Bearer access token. Sets req.userId from token sub.
 */
export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Missing or invalid Authorization header' }
    });
    return;
  }
  const token = authHeader.slice(7);
  try {
    const payload = TokenUtil.verifyAccessToken(token);
    req.userId = payload.sub;
    next();
  } catch (err: any) {
    logger.debug('Auth middleware failed', { error: err?.message });
    const code = err?.message === 'TOKEN_EXPIRED' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN';
    res.status(401).json({
      success: false,
      error: { code, message: err?.message || 'Invalid or expired token' }
    });
  }
}
