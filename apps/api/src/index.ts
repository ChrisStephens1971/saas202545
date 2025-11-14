import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { appRouter } from './routers';
import { createContext } from './context';
import { logger } from './utils/logger';
import { checkDatabaseHealth } from './db';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8045;

// Middleware
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3045'],
    credentials: true,
  })
);
app.use(express.json());

// Health check
app.get('/health', async (_req, res) => {
  const dbHealthy = await checkDatabaseHealth();
  res.json({
    status: dbHealthy ? 'ok' : 'degraded',
    database: dbHealthy ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

// tRPC endpoint
app.use(
  '/trpc',
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

// Start server
async function start() {
  // Check database connection
  const dbHealthy = await checkDatabaseHealth();
  if (!dbHealthy) {
    logger.warn('Database connection failed - API will start but may not function correctly');
    logger.warn('Ensure PostgreSQL is running and DATABASE_URL is configured');
  } else {
    logger.info('Database connection verified');
  }

  app.listen(PORT, () => {
    logger.info(`API server running on http://localhost:${PORT}`);
    logger.info(`tRPC endpoint: http://localhost:${PORT}/trpc`);
  });
}

start().catch((error) => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});
