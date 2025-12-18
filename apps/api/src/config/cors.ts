/**
 * Centralized CORS Configuration
 *
 * SECURITY FIX (Phase 3 - M1): Harden CORS configuration with strict origin validation.
 *
 * This module provides:
 * - Explicit origin validation (no wildcards in production)
 * - Environment-specific configurations
 * - Structured logging for CORS violations
 *
 * @module config/cors
 * @see docs/SECURITY-AUDIT-2025-12-04.md
 */

import { CorsOptions } from 'cors';
import { logger } from '../utils/logger';
import { IS_DEV, IS_PROD_LIKE } from './env';
import { logCorsViolation } from '../logging/securityLogger';

/**
 * Default allowed origins for development (localhost only).
 *
 * IMPORTANT: Keep in sync with the ports defined in:
 * - apps/web/package.json (dev script port)
 * - apps/api/package.json (dev script port)
 * - docs/api/DEV-CORS-NOTES.md
 */
const DEFAULT_DEV_ORIGINS = [
  'http://localhost:3045',
  'http://127.0.0.1:3045',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3500', // Dev web app port (commonly used)
  'http://127.0.0.1:3500',
];

/**
 * Parse ALLOWED_ORIGINS environment variable into an array.
 * Handles whitespace trimming and empty values.
 */
function parseAllowedOrigins(): string[] {
  const envOrigins = process.env.ALLOWED_ORIGINS;

  if (!envOrigins || envOrigins.trim() === '') {
    // In production-like environments, require explicit origins
    if (IS_PROD_LIKE) {
      logger.warn('CORS: No ALLOWED_ORIGINS set in production-like environment');
      return []; // Deny all if not configured
    }
    return DEFAULT_DEV_ORIGINS;
  }

  // Split by comma, trim whitespace, filter empty strings
  return envOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

/**
 * Validate that an origin string is well-formed.
 * - Must start with http:// or https://
 * - No wildcards allowed in production
 * - No trailing slashes
 */
function isValidOrigin(origin: string): boolean {
  // Must start with http:// or https://
  if (!origin.startsWith('http://') && !origin.startsWith('https://')) {
    return false;
  }

  // No trailing slash
  if (origin.endsWith('/')) {
    return false;
  }

  // In production, reject wildcards
  if (IS_PROD_LIKE && origin.includes('*')) {
    logger.error('CORS: Wildcard origins not allowed in production', { origin });
    return false;
  }

  // Basic URL structure validation
  try {
    new URL(origin);
    return true;
  } catch {
    return false;
  }
}

/**
 * The list of allowed origins, parsed and validated.
 */
const ALLOWED_ORIGINS = parseAllowedOrigins().filter(isValidOrigin);

/**
 * Check if an origin is allowed.
 * Exact match only - no pattern matching for security.
 */
export function isOriginAllowed(origin: string | undefined): boolean {
  // No origin header = same-origin request (allowed)
  if (!origin) {
    return true;
  }

  // In development, also allow requests without strict checking
  if (IS_DEV && ALLOWED_ORIGINS.length === 0) {
    return true;
  }

  // Exact match required
  return ALLOWED_ORIGINS.includes(origin);
}

/**
 * CORS origin validation function for use with the cors middleware.
 * Implements strict origin checking with logging.
 */
type CorsCallback = (err: Error | null, allow?: boolean) => void;

const originValidator = (origin: string | undefined, callback: CorsCallback): void => {
  // Allow requests with no origin (same-origin, Postman, etc.)
  // Note: In production, this is typically fine as cookies won't be sent cross-origin
  if (!origin) {
    callback(null, true);
    return;
  }

  if (isOriginAllowed(origin)) {
    callback(null, true);
  } else {
    // SECURITY FIX (Phase 3 - M4): Use security logger for CORS violations
    logCorsViolation({
      origin,
    });
    callback(new Error('CORS origin not allowed'), false);
  }
};

/**
 * CORS configuration options.
 * Used by the express cors middleware.
 */
export const corsOptions: CorsOptions = {
  origin: originValidator,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-Tenant-Slug',
    'X-Tenant-Id',
    'X-CSRF-Token',
  ],
  exposedHeaders: ['RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset'],
  maxAge: 86400, // 24 hours - reduce preflight requests
  optionsSuccessStatus: 200, // Some legacy browsers choke on 204
};

/**
 * Get the list of configured allowed origins.
 * Useful for debugging and health checks.
 */
export function getAllowedOrigins(): readonly string[] {
  return Object.freeze([...ALLOWED_ORIGINS]);
}

/**
 * Log CORS configuration on startup (development only).
 */
export function logCorsConfig(): void {
  if (IS_DEV) {
    logger.info('CORS configuration', {
      allowedOrigins: ALLOWED_ORIGINS,
      credentials: true,
      environment: IS_DEV ? 'development' : 'production-like',
    });
  } else {
    // In production, log without revealing full origin list
    logger.info('CORS configured', {
      originCount: ALLOWED_ORIGINS.length,
      credentials: true,
    });
  }
}
