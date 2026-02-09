import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import multer from 'multer';
import dotenv from 'dotenv';
import { imageRoutes } from './routes/image.routes';
import { imageFileRoutes } from './routes/imageFile.routes';
import { signedUrlRoutes } from './routes/signedUrl.routes';
import filesRoutes from './routes/files.routes';
import { databaseService } from './services/database.service';
import { authenticateToken } from './middlewares/auth.middleware';
import { logger } from './utils/logger';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 6402);

const enableCors = (process.env.ENABLE_CORS || 'true') === 'true';
const parseCsv = (value?: string, fallback: string[] = ['*']) =>
  (value ? value.split(',') : fallback).map((item) => item.trim()).filter((item) => item.length > 0);
const allowedOrigins = parseCsv(process.env.CORS_ALLOWED_ORIGINS, ['*']);
const allowedMethods = process.env.CORS_ALLOWED_METHODS || 'GET,POST,PUT,PATCH,DELETE,OPTIONS';
const allowedHeaders = process.env.CORS_ALLOWED_HEADERS || 'Origin, X-Requested-With, Content-Type, Accept, Authorization';
const exposedHeaders = parseCsv(process.env.CORS_EXPOSED_HEADERS, []);
const maxAge = parseInt(process.env.CORS_MAX_AGE || '600');

if (enableCors) {
  const allowAllOrigins = allowedOrigins.includes('*');

  app.use((request, response, next) => {
    const origin = request.headers.origin;

    if (allowAllOrigins) {
      response.header('Access-Control-Allow-Origin', '*');
    } else if (origin && allowedOrigins.includes(origin)) {
      response.header('Access-Control-Allow-Origin', origin);
      response.header('Access-Control-Allow-Credentials', 'true');
      response.header('Vary', 'Origin');
    }

    response.header('Access-Control-Allow-Methods', allowedMethods);
    response.header('Access-Control-Allow-Headers', allowedHeaders);

    if (exposedHeaders.length > 0) {
      response.header('Access-Control-Expose-Headers', exposedHeaders.join(', '));
    }

    if (!Number.isNaN(maxAge)) {
      response.header('Access-Control-Max-Age', String(maxAge));
    }

    if (request.method === 'OPTIONS') {
      response.status(204).send();
      return;
    }

    next();
  });
}

app.use(helmet());

// When behind nginx/reverse proxy, trust X-Forwarded-* so rate limiter and IP logging work correctly
app.set('trust proxy', 1);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));


app.use(morgan('combined'));


const limiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60 * 1000),  // Default: 1 minute
  max: Number(process.env.RATE_LIMIT_MAX || 200),  // Default: 200 requests per window
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests'
    }
  }
});
app.use(limiter);


const upload = multer({
  limits: {
    fileSize: Number(process.env.MAX_FILE_SIZE_BYTES || 50 * 1024 * 1024) 
  }
});

const authConfig = {
  jwtSecret: process.env.JWT_ACCESS_SECRET || 'your-secret-key',
  jwtIssuer: process.env.JWT_ISSUER,
  jwtAudience: process.env.JWT_AUDIENCE
};


// All routes under /api/v1/ingestion/ prefix for consistent ingress routing
app.use('/api/v1/ingestion/images', authenticateToken(authConfig), upload.single('file') as any, imageRoutes);
app.use('/api/v1/ingestion/image-files', authenticateToken(authConfig), imageFileRoutes());
app.use('/api/v1/ingestion/signed-urls', authenticateToken(authConfig), signedUrlRoutes());
app.use('/api/v1/ingestion/files', filesRoutes);

app.get('/healthz', (_req: express.Request, res: express.Response) => {
  res.json({ status: 'ok' });
});

app.get('/readyz', async (_req: express.Request, res: express.Response) => {
  try {
    // Using PVC storage instead of MinIO - no bucket check needed
    res.json({ status: 'ready' });
  } catch (err) {
    res.status(503).json({ status: 'not-ready' });
  }
});

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Internal server error', { error: err });
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Internal server error'
    }
  });
});

app.use((_req: express.Request, res: express.Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found'
    }
  });
});

const start = async () => {
  try {
    await databaseService.connect();
    logger.info('Database connected successfully');

    // Using PVC storage instead of MinIO - no bucket check needed
    logger.info('PVC storage ready');

    app.listen(PORT, '0.0.0.0', () => {
      logger.info(`Image ingestion service running on port ${PORT}`);
    });
  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
};

process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  await databaseService.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  await databaseService.disconnect();
  process.exit(0);
});

start();
