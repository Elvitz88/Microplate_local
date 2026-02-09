import { Request, Response, NextFunction } from 'express';
import { ErrorResponse } from '@/types/result.types';
import { logger } from '@/utils/logger';


export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly details?: any;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    details?: any,
    isOperational: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

class NotFoundError extends AppError {
  constructor(resource: string, id?: string | number) {
    const message = id ? `${resource} with ID ${id} not found` : `${resource} not found`;
    super(message, 404, 'NOT_FOUND', { resource, id });
  }
}

class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized access') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden access') {
    super(message, 403, 'FORBIDDEN');
  }
}

class ConflictError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 409, 'CONFLICT', details);
  }
}

class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
  }
}

class DatabaseError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 500, 'DATABASE_ERROR', details);
  }
}

class CacheError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 500, 'CACHE_ERROR', details);
  }
}

class ExternalServiceError extends AppError {
  constructor(service: string, message: string, details?: any) {
    super(`External service error (${service}): ${message}`, 502, 'EXTERNAL_SERVICE_ERROR', {
      service,
      ...details,
    });
  }
}

class WebSocketError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 500, 'WEBSOCKET_ERROR', details);
  }
}


export const errorHandler = (
  error: Error,
  request: Request,
  response: Response,
  _next: NextFunction
) => {
  const requestId = (request as any).id || 'unknown';
  
  
  logger.error('Request error occurred', {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    requestId,
    method: request.method,
    url: request.url,
    statusCode: (error as any).statusCode || 500,
  });

  
  let statusCode = (error as any).statusCode || 500;
  let code = 'INTERNAL_ERROR';
  let message = error.message || 'Internal server error';
  let details: any = undefined;

  
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    code = error.code;
    message = error.message;
    details = error.details;
  }
  
  else if ((error as any).validation) {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Validation failed';
    details = (error as any).validation;
  }
  
  else if (error.name === 'UnauthorizedError') {
    statusCode = 401;
    code = 'UNAUTHORIZED';
    message = 'Invalid or missing authentication token';
  }
  
  else if ((error as any).statusCode === 429) {
    statusCode = 429;
    code = 'RATE_LIMIT_EXCEEDED';
    message = 'Too many requests';
  }
  
  else if ((error as any).statusCode === 404) {
    statusCode = 404;
    code = 'NOT_FOUND';
    message = 'Resource not found';
  }

  
  const errorResponse: ErrorResponse = {
    success: false,
    error: {
      code,
      message,
      details,
      requestId,
      timestamp: new Date(),
    },
  };

  
  response.status(statusCode).json(errorResponse);
};


export const createError = {
  validation: (message: string, details?: any) => new ValidationError(message, details),
  notFound: (resource: string, id?: string | number) => new NotFoundError(resource, id),
  unauthorized: (message?: string) => new UnauthorizedError(message),
  forbidden: (message?: string) => new ForbiddenError(message),
  conflict: (message: string, details?: any) => new ConflictError(message, details),
  rateLimit: (message?: string) => new RateLimitError(message),
  database: (message: string, details?: any) => new DatabaseError(message, details),
  cache: (message: string, details?: any) => new CacheError(message, details),
  internal: (message: string, details?: any) => new AppError(message, 500, 'INTERNAL_ERROR', details),
  externalService: (service: string, message: string, details?: any) => 
    new ExternalServiceError(service, message, details),
  websocket: (message: string, details?: any) => new WebSocketError(message, details),
};


export const sendError = (response: Response, error: AppError) => {
  const errorResponse: ErrorResponse = {
    success: false,
    error: {
      code: error.code,
      message: error.message,
      details: error.details,
      requestId: (response as any).request?.id || 'unknown',
      timestamp: new Date(),
    },
  };

  response.status(error.statusCode).json(errorResponse);
};

export const sendSuccess = <T>(response: Response, data: T, statusCode: number = 200) => {
  response.status(statusCode).json({
    success: true,
    data,
  });
};


