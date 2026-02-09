import { Router } from 'express';
import client from 'prom-client';
import { PrismaClient } from '@prisma/client';
import packageJson from '../../package.json';

const prisma = new PrismaClient();
const router = Router();


router.get('/healthz', async (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'auth-service',
    version: packageJson.version
  });
});


router.get('/readyz', async (_req, res) => {
  try {
    
    await prisma.$queryRaw`SELECT 1`;
    
    res.json({
      status: 'ready',
      timestamp: new Date().toISOString(),
      service: 'auth-service',
      checks: {
        database: 'ok'
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      service: 'auth-service',
      checks: {
        database: 'error'
      },
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});


const register = new client.Registry();
client.collectDefaultMetrics({ register });


const httpRequestCounter = new client.Counter({
  name: 'auth_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status'] as const,
});
register.registerMetric(httpRequestCounter);


router.use((req, res, next) => {
  res.on('finish', () => {
    httpRequestCounter.inc({ method: req.method, route: req.path, status: String(res.statusCode) });
  });
  next();
});

router.get('/metrics', async (_req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.send(metrics);
  } catch (_error) {
    res.status(500).send('# Metrics collection error');
  }
});

export { router as healthRoutes };