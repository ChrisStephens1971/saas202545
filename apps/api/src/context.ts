import { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import { Request } from 'express';
import { logger } from './utils/logger';
import { verifyToken } from './auth/jwt';
import { AppRole, PlatformRole } from './auth/types';

export interface Context {
  tenantId?: string;
  userId?: string;
  userRole?: AppRole;
  platformRole?: PlatformRole;
  req?: Request; // Include request for accessing cookies
}

export async function createContext({
  req,
  res: _res,
}: CreateExpressContextOptions): Promise<Context> {
  // Extract user from auth token FIRST (trusted source)
  const authHeader = req.headers.authorization;
  let userId: string | undefined;
  let userRole: AppRole | undefined;
  let platformRole: PlatformRole | undefined;
  let tokenTenantId: string | undefined;

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    // SECURITY FIX (H1): Pass context to verifyToken for better failure logging
    const headerTenantIdForContext = req.headers['x-tenant-id'] as string | undefined;
    const payload = verifyToken(token, { tenantId: headerTenantIdForContext });

    if (payload) {
      userId = payload.userId;
      userRole = payload.role;
      platformRole = payload.platformRole;
      tokenTenantId = payload.tenantId;
    }
  }

  /**
   * SECURITY: Tenant ID resolution
   *
   * Priority order:
   * 1. JWT token tenantId (most trusted - cryptographically verified)
   * 2. x-tenant-id header (less trusted - used for unauthenticated/public routes)
   *
   * If an authenticated user provides a header that doesn't match their token,
   * we log a warning and use the token value (prevents tenant spoofing).
   */
  const headerTenantId = req.headers['x-tenant-id'] as string | undefined;
  let tenantId: string | undefined;

  if (tokenTenantId) {
    // For authenticated requests, always use the tenant from the verified JWT
    tenantId = tokenTenantId;

    // Log if there's a mismatch (potential attack or client bug)
    if (headerTenantId && headerTenantId !== tokenTenantId) {
      logger.warn('Tenant ID mismatch: header differs from JWT', {
        headerTenantId,
        tokenTenantId,
        userId,
        // Note: Using token value for security
      });
    }
  } else {
    // For unauthenticated requests, use the header (public routes like tenant lookup)
    tenantId = headerTenantId;
  }

  logger.debug('Context created', { tenantId, userId, userRole, platformRole });

  return {
    tenantId,
    userId,
    userRole,
    platformRole,
    req, // Pass request for cookie access
  };
}
