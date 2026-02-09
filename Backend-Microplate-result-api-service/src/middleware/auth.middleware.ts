import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '@/utils/logger';

const JWT_SECRET = process.env.JWT_ACCESS_SECRET || 'your-secret-key';

export interface AuthRequest extends Request {
    user?: {
        id: string;
        email: string;
        role: string;
        [key: string]: any;
    };
}

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        res.status(401).json({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'No authorization token provided' }
        });
        return;
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
        res.status(401).json({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Invalid token format' }
        });
        return;
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        (req as AuthRequest).user = decoded as any;
        next();
    } catch (error) {
        logger.error('Token verification failed', { error });
        res.status(401).json({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' }
        });
        return;
    }
};
