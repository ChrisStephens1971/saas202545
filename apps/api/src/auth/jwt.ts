import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { AuthToken, User } from './types';
import { logger } from '../utils/logger';
import { IS_PROD_LIKE, IS_TEST } from '../config/env';

/**
 * SECURITY FIX (C3): JWT secret configuration with no hardcoded fallbacks.
 *
 * - Production/Staging: MUST have JWT_SECRET or NEXTAUTH_SECRET set (fail fast otherwise)
 * - Development: Generate random secret at runtime if not set (tokens invalid after restart)
 * - Test: Use TEST_JWT_SECRET if available, otherwise generate random
 *
 * The server will fail to start in production/staging without proper secrets configured.
 * See: docs/SECURITY-AUDIT-2025-12-04.md (C3)
 */
const JWT_SECRET = (() => {
  const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;

  if (secret && secret.length >= 32) {
    return secret;
  }

  // In production or staging, fail fast - never allow the server to start without proper secrets
  if (IS_PROD_LIKE) {
    throw new Error(
      'FATAL: JWT_SECRET or NEXTAUTH_SECRET environment variable must be set in production/staging. ' +
      'The secret must be at least 32 characters. ' +
      'The server cannot start without proper JWT secrets configured.'
    );
  }

  // For tests, use TEST_JWT_SECRET if available
  if (IS_TEST && process.env.TEST_JWT_SECRET) {
    return process.env.TEST_JWT_SECRET;
  }

  // In development/test, generate a random secret at runtime
  // Tokens will be invalid after restart - this is intentional for security
  const randomSecret = crypto.randomBytes(32).toString('hex');
  console.warn(
    '[SECURITY] JWT_SECRET not set or too short. ' +
    'Generated random secret for this session. ' +
    'Tokens will be INVALID after server restart. ' +
    'Set JWT_SECRET in .env for persistent tokens.'
  );
  return randomSecret;
})();

const JWT_EXPIRY = '12h';

export function generateToken(user: User): string {
  const payload = {
    userId: user.id,
    role: user.role,
    tenantId: user.tenantId,
    personId: user.personId,
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRY,
  });
}

/**
 * Verify a JWT token and return the decoded payload.
 *
 * SECURITY FIX (H1): Log verification failures for security monitoring.
 * Failures are logged with context but never include the raw token.
 *
 * See: docs/SECURITY-AUDIT-2025-12-04.md (H1)
 *
 * @param token - The JWT token to verify
 * @param context - Optional context for logging (e.g., tenantId, requestId)
 * @returns The decoded token payload, or null if verification failed
 */
export function verifyToken(
  token: string,
  context?: { tenantId?: string; requestId?: string }
): AuthToken | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthToken;
    return decoded;
  } catch (error) {
    // SECURITY FIX (H1): Log JWT verification failures for security monitoring
    // Do NOT log the raw token - it could be a valid token from another system
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorName = error instanceof Error ? error.name : 'UnknownError';

    // Extract subject/userId from token without verification for logging context only
    // This is safe because we're not trusting the data, just logging it
    let tokenSubject: string | undefined;
    try {
      const payload = jwt.decode(token) as { userId?: string; sub?: string } | null;
      tokenSubject = payload?.userId || payload?.sub;
    } catch {
      // Ignore decode errors - token may be completely malformed
    }

    logger.warn('JWT verification failed', {
      event: 'JWT_VERIFICATION_FAILURE',
      reason: errorName,
      errorMessage,
      subject: tokenSubject || 'unknown',
      tenantId: context?.tenantId || 'unknown',
      requestId: context?.requestId,
      // Never log the raw token
      tokenPresent: !!token,
      tokenLength: token?.length || 0,
    });

    return null;
  }
}
