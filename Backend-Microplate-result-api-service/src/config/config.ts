import dotenv from 'dotenv';


dotenv.config();

const parseList = (value: string | undefined, defaults: string[]): string[] => {
  if (!value) {
    return defaults;
  }

  const items = value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  return items.length > 0 ? items : defaults;
};

export const config = {
  
  server: {
    port: parseInt(process.env.PORT || '6404', 10),
    host: process.env.HOST || '0.0.0.0',
    nodeEnv: process.env.NODE_ENV || 'development',
  },

  
  cors: {
    enabled: process.env.ENABLE_CORS !== 'false',
    allowedOrigins: parseList(process.env.CORS_ALLOWED_ORIGINS, ['http://localhost:6410']),
    allowedMethods: process.env.CORS_ALLOWED_METHODS || 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    allowedHeaders:
      process.env.CORS_ALLOWED_HEADERS ||
      'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Request-ID',
    exposedHeaders: parseList(process.env.CORS_EXPOSED_HEADERS, ['X-Request-ID']),
    maxAge: parseInt(process.env.CORS_MAX_AGE || '600', 10),
  },

  
  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/microplates',
  },


  
  websocket: {
    path: process.env.WEBSOCKET_PATH || '/api/v1/result/ws',
    pingInterval: parseInt(process.env.WEBSOCKET_PING_INTERVAL || '30000', 10),
    pongTimeout: parseInt(process.env.WEBSOCKET_PONG_TIMEOUT || '5000', 10),
    enabled: process.env.ENABLE_WEBSOCKET === 'true',
  },

  
  pagination: {
    defaultPageSize: parseInt(process.env.DEFAULT_PAGE_SIZE || '20', 10),
    maxPageSize: parseInt(process.env.MAX_PAGE_SIZE || '100', 10),
  },

  
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'pretty',
  },

  
  services: {
    predictionDb: process.env.PREDICTION_DB_SERVICE_URL || 'http://prediction-db-service:6403',
    imageService: process.env.IMAGE_SERVICE_URL || 'http://image-ingestion-service:6402',
  },

  
  features: {
    websocket: process.env.ENABLE_WEBSOCKET === 'true',
    databaseNotifications: process.env.ENABLE_DATABASE_NOTIFICATIONS === 'true',
  },

  
  api: {
    baseUrl: process.env.API_BASE_URL || 'http://localhost:6400',
    version: 'v1',
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX || '10000', 10),
  },
} as const;


if (!config.database.url) {
  throw new Error('DATABASE_URL is required');
}

