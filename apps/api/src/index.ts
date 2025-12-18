import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { appRouter } from './routers';
import { createContext } from './context';
import { logger } from './utils/logger';
import { checkDatabaseHealth } from './db';
import { validateEncryptionConfig } from './utils/encryption';
import { IS_PROD, IS_DEV } from './config/env';
import { corsOptions, logCorsConfig } from './config/cors';
import { csrfProtection, logCsrfConfig } from './security/csrf';

// Load .env first, then .env.local (which takes precedence for local overrides)
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local'), override: true });

const app = express();
const PORT = process.env.PORT || 8045;
const isProduction = IS_PROD;

/**
 * SECURITY FIX (C4): Environment-Aware Rate Limiting
 *
 * In development: Higher limits to avoid blocking normal dev workflows
 * In production: Strict limits to prevent abuse
 *
 * Dev limits: 1000 requests per minute (plenty for testing)
 * Prod limits: 100 requests per 15 minutes (configurable via env vars)
 *
 * Configurable via environment variables (production only):
 * - RATE_LIMIT_WINDOW_MS: Time window in milliseconds (default: 15 minutes)
 * - RATE_LIMIT_MAX_REQUESTS: Max requests per window for general endpoints (default: 100)
 * - AUTH_RATE_LIMIT_MAX_REQUESTS: Max requests per window for auth endpoints (default: 10)
 *
 * See: docs/SECURITY-AUDIT-2025-12-04.md (C4)
 */
const rateLimitWindowMs = IS_DEV
  ? 60000 // 1 minute window in dev
  : parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10); // 15 minutes in prod
const rateLimitMaxRequests = IS_DEV
  ? 1000 // 1000 requests per minute in dev
  : parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10);
const authRateLimitMaxRequests = IS_DEV
  ? 100 // 100 auth attempts per minute in dev
  : parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS || '10', 10);

// General rate limiter for all endpoints
const generalLimiter = rateLimit({
  windowMs: rateLimitWindowMs,
  max: rateLimitMaxRequests,
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Skip rate limiting for tRPC routes in development to avoid dev workflow issues
  skip: (req) => {
    if (IS_DEV && req.path.startsWith('/trpc')) {
      return true;
    }
    return false;
  },
  message: {
    error: 'Too many requests, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
  handler: (req, res, _next, options) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      userAgent: req.get('User-Agent'),
    });
    // For tRPC routes, return a tRPC-compatible error format
    if (req.path.startsWith('/trpc')) {
      res.status(429).json({
        error: {
          message: 'Rate limit exceeded. Please try again later.',
          code: -32029, // Custom tRPC error code for rate limiting
          data: {
            code: 'TOO_MANY_REQUESTS',
            httpStatus: 429,
          },
        },
      });
    } else {
      res.status(429).json(options.message);
    }
  },
});

// Stricter rate limiter for authentication-related endpoints
const authLimiter = rateLimit({
  windowMs: rateLimitWindowMs,
  max: authRateLimitMaxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  // Skip auth rate limiting in development
  skip: () => IS_DEV,
  message: {
    error: 'Too many authentication attempts, please try again later.',
    code: 'AUTH_RATE_LIMIT_EXCEEDED',
  },
  handler: (req, res, _next, options) => {
    logger.warn('Auth rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      userAgent: req.get('User-Agent'),
    });
    // Return tRPC-compatible error format for /trpc routes
    if (req.path.startsWith('/trpc')) {
      res.status(429).json({
        error: {
          message: 'Too many authentication attempts. Please try again later.',
          code: -32029,
          data: {
            code: 'TOO_MANY_REQUESTS',
            httpStatus: 429,
          },
        },
      });
    } else {
      res.status(429).json(options.message);
    }
  },
});

/**
 * SECURITY: Security Headers Middleware (Helmet)
 *
 * Adds various HTTP headers to help protect against common web vulnerabilities:
 * - X-Content-Type-Options: nosniff (prevents MIME type sniffing)
 * - X-Frame-Options: DENY (prevents clickjacking)
 * - X-XSS-Protection: 0 (disabled, CSP is more effective)
 * - Strict-Transport-Security: max-age=31536000 (enforces HTTPS)
 * - Content-Security-Policy: default-src 'self' (restricts resource loading)
 *
 * See: docs/SECURITY-AUDIT-2025-12-04.md (Security Headers)
 */
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"], // May need unsafe-inline for some styles
        imgSrc: ["'self'", 'data:', 'blob:'], // Allow data URIs for images
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: isProduction ? [] : null, // Only in production
      },
    },
    crossOriginEmbedderPolicy: false, // May need to disable for some features
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow cross-origin requests for API
  })
);

/**
 * SECURITY FIX (Phase 3 - M1): Hardened CORS Configuration
 *
 * Uses centralized CORS config with:
 * - Strict origin validation (exact match only)
 * - No wildcards in production
 * - Logging for rejected origins
 *
 * See: apps/api/src/config/cors.ts
 */
app.use(cors(corsOptions));
// Increase body size limit to 10MB for canvas layouts with base64 images
app.use(express.json({ limit: '10mb' }));

/**
 * SECURITY FIX (Phase 3 - M2): Cookie Parser for CSRF
 *
 * Required for reading CSRF tokens from cookies.
 */
app.use(cookieParser());

/**
 * SECURITY FIX (Phase 3 - M2): CSRF Protection
 *
 * Implements double-submit cookie pattern:
 * - Sets XSRF-TOKEN cookie on responses
 * - Validates X-CSRF-Token header on state-changing requests
 * - Enabled only in production-like environments by default
 *
 * See: apps/api/src/security/csrf.ts
 */
app.use(csrfProtection());

// SECURITY FIX (C4): Apply rate limiting
// General rate limit for all API requests
app.use(generalLimiter);

// Stricter rate limit for auth-related tRPC procedures
// Note: tRPC procedures are POST requests to /trpc/<procedureName>
// We apply stricter limits to common auth patterns
app.use('/trpc/auth', authLimiter);
app.use('/trpc/tenants.checkSlugAvailability', authLimiter); // Prevent tenant enumeration

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
    onError({ error, path }) {
      // Errors are already logged in the tRPC errorFormatter
      // This is a fallback for any that slip through
      logger.error('tRPC middleware error', {
        path,
        message: error.message,
        code: error.code,
      });
    },
  })
);

/**
 * SECURITY: Global error handler for Express
 *
 * Catches any unhandled errors from non-tRPC routes.
 * In production, returns generic error messages.
 */
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    // Log full error details server-side
    logger.error('Unhandled Express error', {
      message: err.message,
      name: err.name,
      ...(isProduction ? {} : { stack: err.stack }),
    });

    // In production, return generic error
    if (isProduction) {
      res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      });
    } else {
      // In development, include more details
      res.status(500).json({
        error: err.message,
        code: 'INTERNAL_ERROR',
        stack: err.stack,
      });
    }
  }
);

// Start server
async function start() {
  // SECURITY FIX (H10): Validate encryption configuration at startup
  // This will throw in production/staging if APP_ENCRYPTION_KEY is not set
  validateEncryptionConfig();

  // SECURITY FIX (Phase 3 - M1): Log CORS configuration
  logCorsConfig();

  // SECURITY FIX (Phase 3 - M2): Log CSRF configuration
  logCsrfConfig();

  // SECURITY FIX (C4): Log rate limit configuration
  logger.info('Rate limiting configuration', {
    environment: IS_DEV ? 'development' : 'production',
    windowMs: rateLimitWindowMs,
    maxRequests: rateLimitMaxRequests,
    authMaxRequests: authRateLimitMaxRequests,
    trpcSkipped: IS_DEV, // tRPC routes skip rate limiting in dev
  });

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
