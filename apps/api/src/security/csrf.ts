/**
 * CSRF Protection Module
 *
 * SECURITY FIX (Phase 3 - M2): Implement CSRF protection using double-submit cookie pattern.
 *
 * This module provides:
 * - CSRF token generation using cryptographically secure random bytes
 * - Double-submit cookie pattern validation
 * - Express middleware for automatic protection
 * - Integration with existing cookie-based authentication
 *
 * How it works:
 * 1. Server generates a random CSRF token and sets it in a cookie (HttpOnly: false so JS can read it)
 * 2. Client reads the cookie and sends the token in the X-CSRF-Token header
 * 3. Server validates that the header matches the cookie
 *
 * This pattern is secure because:
 * - Attackers cannot read cookies from other domains due to Same-Origin Policy
 * - Therefore, attackers cannot include the correct token in their forged requests
 *
 * @module security/csrf
 * @see docs/SECURITY-AUDIT-2025-12-04.md
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { logger } from '../utils/logger';
import { IS_PROD_LIKE, IS_DEV } from '../config/env';
import { logCsrfFailure } from '../logging/securityLogger';

/**
 * CSRF cookie name
 */
export const CSRF_COOKIE_NAME = 'XSRF-TOKEN';

/**
 * CSRF header name (matches Angular/Axios conventions)
 */
export const CSRF_HEADER_NAME = 'X-CSRF-Token';

/**
 * Token length in bytes (32 bytes = 256 bits of entropy)
 */
const TOKEN_LENGTH = 32;

/**
 * HTTP methods that require CSRF validation (state-changing operations)
 */
const CSRF_PROTECTED_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

/**
 * Paths that should be exempt from CSRF protection.
 * These are typically:
 * - Public API endpoints with token-based auth (not cookie-based)
 * - Webhook endpoints from external services
 */
const CSRF_EXEMPT_PATHS: string[] = [
  '/health',
  '/trpc/bulletins.getPublicBulletin', // Public bulletin endpoint uses token auth
  '/trpc/bulletins.trackInteraction', // Analytics tracking (public)
];

/**
 * Additional exempt path patterns (regex-based).
 * Use sparingly - prefer explicit paths above.
 */
const CSRF_EXEMPT_PATTERNS: RegExp[] = [
  // Webhook endpoints if any
  /^\/webhooks\//,
];

/**
 * Generate a cryptographically secure CSRF token.
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(TOKEN_LENGTH).toString('hex');
}

/**
 * Check if a request path is exempt from CSRF protection.
 */
function isExemptPath(path: string): boolean {
  // Check explicit paths
  if (CSRF_EXEMPT_PATHS.includes(path)) {
    return true;
  }

  // Check patterns
  for (const pattern of CSRF_EXEMPT_PATTERNS) {
    if (pattern.test(path)) {
      return true;
    }
  }

  return false;
}

/**
 * Check if a request method requires CSRF protection.
 */
function requiresCsrfProtection(method: string): boolean {
  return CSRF_PROTECTED_METHODS.includes(method.toUpperCase());
}

/**
 * Constant-time string comparison to prevent timing attacks.
 */
function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * CSRF token cookie options.
 */
function getCookieOptions() {
  return {
    httpOnly: false, // Must be readable by JS for double-submit pattern
    secure: IS_PROD_LIKE, // HTTPS only in production
    sameSite: 'lax' as const, // Prevent CSRF from third-party sites
    path: '/',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours (matches session duration)
  };
}

/**
 * CSRF Protection Middleware
 *
 * Implements double-submit cookie pattern:
 * 1. On every request, ensure a CSRF token cookie exists
 * 2. For state-changing requests (POST, PUT, PATCH, DELETE),
 *    validate that the X-CSRF-Token header matches the cookie
 *
 * @param options Configuration options
 * @param options.enabled Whether CSRF protection is enabled (default: true in production)
 */
export function csrfProtection(options: { enabled?: boolean } = {}) {
  // Default: enabled in production-like environments
  const enabled = options.enabled ?? IS_PROD_LIKE;

  return (req: Request, res: Response, next: NextFunction) => {
    // Skip if disabled
    if (!enabled) {
      return next();
    }

    // Get existing token from cookie or generate new one
    let cookieToken = req.cookies?.[CSRF_COOKIE_NAME];

    // If no token exists, generate one
    if (!cookieToken) {
      cookieToken = generateCsrfToken();
      res.cookie(CSRF_COOKIE_NAME, cookieToken, getCookieOptions());
    }

    // For safe methods (GET, HEAD, OPTIONS), no validation needed
    if (!requiresCsrfProtection(req.method)) {
      return next();
    }

    // Check if path is exempt
    if (isExemptPath(req.path)) {
      return next();
    }

    // Get token from header
    const headerToken = req.get(CSRF_HEADER_NAME);

    // Validate token
    if (!headerToken) {
      // SECURITY FIX (Phase 3 - M4): Use security logger for CSRF failures
      logCsrfFailure({
        reason: 'missing',
        ip: req.ip,
        path: req.path,
        method: req.method,
        userAgent: req.get('User-Agent'),
      });

      return res.status(403).json({
        error: 'CSRF token missing',
        code: 'CSRF_TOKEN_MISSING',
      });
    }

    // Compare tokens using constant-time comparison
    if (!safeCompare(headerToken, cookieToken)) {
      // SECURITY FIX (Phase 3 - M4): Use security logger for CSRF failures
      logCsrfFailure({
        reason: 'invalid',
        ip: req.ip,
        path: req.path,
        method: req.method,
        userAgent: req.get('User-Agent'),
      });

      return res.status(403).json({
        error: 'CSRF token invalid',
        code: 'CSRF_TOKEN_INVALID',
      });
    }

    // Token valid, proceed
    next();
  };
}

/**
 * Middleware to set CSRF token cookie on responses.
 * Use this on routes that render HTML (login pages, etc.)
 * to ensure the token is available for subsequent requests.
 */
export function ensureCsrfToken() {
  return (req: Request, res: Response, next: NextFunction) => {
    // If no CSRF cookie exists, set one
    if (!req.cookies?.[CSRF_COOKIE_NAME]) {
      const token = generateCsrfToken();
      res.cookie(CSRF_COOKIE_NAME, token, getCookieOptions());
    }
    next();
  };
}

/**
 * Log CSRF configuration on startup.
 */
export function logCsrfConfig(): void {
  if (IS_DEV) {
    logger.info('CSRF protection configured', {
      enabled: IS_PROD_LIKE,
      cookieName: CSRF_COOKIE_NAME,
      headerName: CSRF_HEADER_NAME,
      protectedMethods: CSRF_PROTECTED_METHODS,
      exemptPaths: CSRF_EXEMPT_PATHS,
    });
  } else {
    logger.info('CSRF protection enabled', {
      protectedMethods: CSRF_PROTECTED_METHODS,
    });
  }
}
