import { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import { logger } from './utils/logger';
import { verifyToken } from './auth/jwt';
import { AppRole } from './auth/types';

export interface Context {
  tenantId?: string;
  userId?: string;
  userRole?: AppRole;
}

export async function createContext({
  req,
  res,
}: CreateExpressContextOptions): Promise<Context> {
  // Extract tenant from subdomain or header
  const tenantId = req.headers['x-tenant-id'] as string | undefined;

  // Extract user from auth token
  const authHeader = req.headers.authorization;
  let userId: string | undefined;
  let userRole: AppRole | undefined;

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const payload = verifyToken(token);

    if (payload) {
      userId = payload.userId;
      userRole = payload.role;
    }
  }

  logger.debug('Context created', { tenantId, userId, userRole });

  return {
    tenantId,
    userId,
    userRole,
  };
}
