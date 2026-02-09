import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import { PrismaClient } from '@prisma/client';
import { config } from './config/config';
import { logger } from './utils/logger';
import { healthRoutes } from './routes/health';
import { databaseRoutes } from './routes/database';
import { predictionRoutes } from './routes/predictions';

export const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

const app = express();

// When behind nginx/reverse proxy, trust X-Forwarded-* so rate limiter and IP logging work correctly
app.set('trust proxy', 1);

if (config.cors.enabled) {
  const allowAllOrigins = config.cors.allowedOrigins.includes('*');

  app.use((request, response, next) => {
    const origin = request.headers.origin;

    if (allowAllOrigins) {
      response.header('Access-Control-Allow-Origin', '*');
    } else if (origin && config.cors.allowedOrigins.includes(origin)) {
      response.header('Access-Control-Allow-Origin', origin);
      response.header('Access-Control-Allow-Credentials', 'true');
      response.header('Vary', 'Origin');
    }

    response.header('Access-Control-Allow-Methods', config.cors.allowedMethods);
    response.header('Access-Control-Allow-Headers', config.cors.allowedHeaders);

    if (config.cors.exposedHeaders.length > 0) {
      response.header('Access-Control-Expose-Headers', config.cors.exposedHeaders.join(', '));
    }

    if (config.cors.maxAge) {
      response.header('Access-Control-Max-Age', String(config.cors.maxAge));
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








app.use('/api/v1/health', healthRoutes());
app.use('/api/v1/database', databaseRoutes());
app.use('/api/v1/prediction', predictionRoutes());

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Error:', { err });
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Internal server error'
    }
  });
});

app.use('*', (_req: express.Request, res: express.Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found'
    }
  });
});

async function gracefulShutdown() {
  logger.info('Shutting down gracefully...');
  
  try {
    await prisma.$disconnect();
    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown:', { error: String(error) });
    process.exit(1);
  }
}

async function start() {
  try {
    await prisma.$connect();
    logger.info('Database connected successfully');

    
    app.listen(config.server.port, config.server.host, () => {
      logger.info(`Prediction DB Service running on port ${config.server.port}`);
      logger.info(`Environment: ${config.server.nodeEnv}`);
      const databaseUrl = config.database.url ?? '';
      const dbHost = databaseUrl.includes('@') ? databaseUrl.split('@')[1] : databaseUrl;
      if (dbHost) {
        logger.info(`Database: ${dbHost}`);
      }
    });

    
    process.on('SIGINT', gracefulShutdown);
    process.on('SIGTERM', gracefulShutdown);
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', { error: String(error) });
      gracefulShutdown();
    });
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection', { promise, reason: String(reason) });
      gracefulShutdown();
    });

  } catch (error) {
    logger.error('Failed to start server', { error: String(error) });
    process.exit(1);
  }
}


start();
