import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';


dotenv.config({ path: path.resolve(__dirname, '../../.env') });


const configSchema = z.object({
  server: z.object({
    port: z.number().default(6406),
    host: z.string().default('0.0.0.0'),
    nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  }),
  database: z.object({
    url: z.string().min(1, 'DATABASE_URL is required'),
  }),
  logging: z.object({
    level: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
    format: z.enum(['json', 'pretty']).default('json'),
  }),
  cors: z.object({
    enabled: z.boolean().default(true),
    allowedOrigins: z.array(z.string()).default(['*']),
    allowedMethods: z.string().default('GET,POST,PUT,PATCH,DELETE,OPTIONS'),
    allowedHeaders: z.string().default('Origin, X-Requested-With, Content-Type, Accept, Authorization'),
    exposedHeaders: z.array(z.string()).default([]),
    maxAge: z.number().default(600),
  }),
});

const parseCsv = (value: string | undefined, fallback: string[]): string[] => {
  if (!value) {
    return fallback;
  }

  const parts = value
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  return parts.length > 0 ? parts : fallback;
};


const rawConfig = {
  server: {
    port: parseInt(process.env['PORT'] || '6406'),
    host: process.env['HOST'] || '0.0.0.0',
    nodeEnv: (process.env['NODE_ENV'] || 'development') as 'development' | 'production' | 'test',
  },
  database: {
    url: process.env['DATABASE_URL'] || '',
  },
  logging: {
    level: (process.env['LOG_LEVEL'] || 'info') as 'error' | 'warn' | 'info' | 'debug',
    format: (process.env['LOG_FORMAT'] || 'json') as 'json' | 'pretty',
  },
  cors: {
    enabled: (process.env['ENABLE_CORS'] || 'true') === 'true',
    allowedOrigins: parseCsv(process.env['CORS_ALLOWED_ORIGINS'], ['*']),
    allowedMethods: process.env['CORS_ALLOWED_METHODS'] || 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    allowedHeaders:
      process.env['CORS_ALLOWED_HEADERS'] || 'Origin, X-Requested-With, Content-Type, Accept, Authorization',
    exposedHeaders: parseCsv(process.env['CORS_EXPOSED_HEADERS'], []),
    maxAge: parseInt(process.env['CORS_MAX_AGE'] || '600'),
  },
};

export const config = configSchema.parse(rawConfig);

