import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';

import { authRoutes } from './routes/auth.routes';
import { healthRoutes } from './routes/health.routes';
import { errorHandler } from './middleware/error.middleware';
import { requestLogger } from './middleware/logging.middleware';
import { config } from './config/config';
import { logger } from './utils/logger';
import packageJson from '../package.json';

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
app.use(requestLogger);

const limiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMaxRequests,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests'
    }
  }
});
app.use(limiter);

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Auth Service API',
      description: 'Authentication and Authorization Service for Microplate AI',
      version: packageJson.version
    },
    servers: [
      {
        url: `http://localhost:${config.port}`,
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
  apis: ['./src/routes/*.ts', './src/schemas/*.ts']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.get('/docs', (_req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(swaggerUi.generateHTML(swaggerSpec));
});

app.use('/', healthRoutes);
app.use('/api/v1/auth', authRoutes);
app.use(errorHandler);
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
    app.listen(config.port, '0.0.0.0', () => {
      logger.info(`Auth service running on port ${config.port}`);
      logger.info(`API documentation available at http://localhost:${config.port}/docs`);
    });
  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
};

process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

start();