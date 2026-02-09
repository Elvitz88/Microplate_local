import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import { PrismaClient } from '@prisma/client';
import packageJson from '../package.json';
import { authenticateToken } from './middleware/auth.middleware';
import { csvService } from './services/csv.service';
import interfaceRoutes from './routes/interface.routes';
import sharedRoutes from './routes/shared.routes';
import { logger } from '@/utils/logger';

export const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

const app = express();
const PORT = Number(process.env['PORT'] || 6405);

app.set('trust proxy', 1);

const enableCors = (process.env['ENABLE_CORS'] || 'true') === 'true';
const parseCsv = (value: string | undefined, fallback: string[]) =>
  (value ? value.split(',') : fallback).map((item) => item.trim()).filter((item) => item.length > 0);
const allowedOrigins = parseCsv(process.env['CORS_ALLOWED_ORIGINS'], ['*']);
const allowedMethods = process.env['CORS_ALLOWED_METHODS'] || 'GET,POST,PUT,PATCH,DELETE,OPTIONS';
const allowedHeaders = process.env['CORS_ALLOWED_HEADERS'] || 'Origin, X-Requested-With, Content-Type, Accept, Authorization';
const exposedHeaders = parseCsv(process.env['CORS_EXPOSED_HEADERS'], []);
const maxAge = parseInt(process.env['CORS_MAX_AGE'] || '600');

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


app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));


app.use(morgan('combined'));


const limiter = rateLimit({
  windowMs: Number(process.env['RATE_LIMIT_WINDOW_MS'] || 60 * 1000),  // Default: 1 minute
  max: Number(process.env['RATE_LIMIT_MAX'] || 10000),  // Default: 10000 requests per window
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests'
    }
  }
});
app.use(limiter);


const authConfig = {
  jwtSecret: process.env['JWT_SECRET'] || process.env['JWT_ACCESS_SECRET'] || 'your-super-secret-access-key',
  jwtIssuer: process.env['JWT_ISSUER'] || 'microplate-auth-service',
  jwtAudience: process.env['JWT_AUDIENCE'] || 'microplate-api'
};


const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Labware Interface Service API',
      description: 'Labware Interface Service for Microplate AI',
      version: packageJson.version
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  },
  apis: ['./src/routes/*.ts']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.get('/docs', (_req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(swaggerUi.generateHTML(swaggerSpec));
});

app.get('/health', (_req, res) => {
  res.json({ status: 'healthy' });
});

app.get('/ready', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ready' });
  } catch (_error) {
    res.status(503).json({ status: 'not-ready' });
  }
});

app.use('/api/v1/interface', authenticateToken(authConfig), interfaceRoutes);
app.use('/api/v1/shared', authenticateToken(authConfig), sharedRoutes);

app.use('/api/v1/labware', authenticateToken(authConfig), (req: any, res) => {
  res.json({
    success: true,
    message: 'Labware interface service is running',
    user: req.user,
    endpoints: {
      
      generate: 'POST /api/v1/interface/generate',
      files: 'GET /api/v1/interface/files',
      file: 'GET /api/v1/interface/files/:id',
      delete: 'DELETE /api/v1/interface/files/:id',
      
      sharedFiles: 'GET /api/v1/shared/interface-files',
      sharedFile: 'GET /api/v1/shared/interface-files/:id',
      sharedBySample: 'GET /api/v1/shared/interface-files/sample/:sampleNo',
      sharedStats: 'GET /api/v1/shared/interface-files/statistics'
    }
  });
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

app.use('*', (_req, res) => {
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
    await prisma.$connect();
    logger.info('Database connected successfully');

    // Using PVC storage instead of MinIO - no initialization needed
    logger.info('PVC storage ready');

    await csvService.cleanupOldFiles(24);
    logger.info('Temporary files cleanup completed');

    app.listen(PORT, '0.0.0.0', () => {
      logger.info(`Labware Interface Service running on port ${PORT}`);
      logger.info(`API documentation available at http://localhost:${PORT}/docs`);
      logger.info('Available endpoints:');
      logger.info('  POST /api/v1/interface/generate - Generate interface CSV file');
      logger.info('  GET  /api/v1/interface/files - List interface files');
      logger.info('  GET  /api/v1/interface/files/:id - Get interface file details');
      logger.info('  DELETE /api/v1/interface/files/:id - Delete interface file');
    });
  } catch (err) {
    logger.error('Failed to start server', { error: err });
    process.exit(1);
  }
};

process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { promise, reason });
  process.exit(1);
});

start();
