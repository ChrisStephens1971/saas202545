import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { Context } from './context';
import { logger } from './utils/logger';
import { AppRole, PlatformRole } from './auth/types';

const isProduction = process.env.NODE_ENV === 'production';

/**
 * SECURITY: Production-safe error formatting
 *
 * In production:
 * - Never expose stack traces or internal error details to clients
 * - Return generic error messages for unexpected errors
 * - Log full error details server-side for debugging
 *
 * In development:
 * - Include more details to aid debugging
 * - Still avoid exposing secrets in error messages
 */
const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error, ctx }) {
    // Always log the full error server-side
    logger.error('tRPC error occurred', {
      code: shape.code,
      message: error.message,
      path: shape.data?.path,
      userId: ctx?.userId,
      tenantId: ctx?.tenantId,
      // Only log stack in non-production to avoid log bloat
      ...(isProduction ? {} : { stack: error.stack }),
      // Include cause details for debugging
      cause: error.cause instanceof Error ? error.cause.message : undefined,
    });

    // In production, sanitize error responses
    if (isProduction) {
      // List of tRPC error codes that are safe to expose with their messages
      // These correspond to TRPC_ERROR_CODE_KEY values
      const safeErrorCodes = [
        'BAD_REQUEST',
        'UNAUTHORIZED',
        'FORBIDDEN',
        'NOT_FOUND',
        'CONFLICT',
        'TOO_MANY_REQUESTS',
        'PARSE_ERROR',
      ];

      // For Zod validation errors, provide field-level feedback (safe)
      const zodError =
        error.cause instanceof Error && error.cause.name === 'ZodError'
          ? error.cause
          : null;

      // Check if this is an expected error type that's safe to expose
      // error.code is the tRPC error code string (e.g., 'BAD_REQUEST')
      const isSafeError = safeErrorCodes.includes(error.code);

      if (!isSafeError) {
        // For internal errors, return generic message
        return {
          ...shape,
          message: 'An unexpected error occurred. Please try again later.',
          data: {
            ...shape.data,
            // Include a correlation ID for support
            errorId: generateErrorId(),
            // Never include stack or cause in production
            stack: undefined,
            zodError: null,
          },
        };
      }

      // For safe errors, still strip implementation details
      return {
        ...shape,
        data: {
          ...shape.data,
          zodError,
          // Never include stack in production
          stack: undefined,
        },
      };
    }

    // In development, include more details for debugging
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof Error && error.cause.name === 'ZodError'
            ? error.cause
            : null,
        // Include stack in development (but not in the shape itself, only in data)
        devStack: error.stack,
      },
    };
  },
});

/**
 * Generate a unique error ID for correlation
 * This allows users to report errors and support to find them in logs
 */
function generateErrorId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `ERR-${timestamp}-${random}`.toUpperCase();
}

// Base router and procedure
export const router = t.router;
export const publicProcedure = t.procedure;

// Middleware for authenticated procedures
const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.userId) {
    logger.warn('Unauthorized access attempt');
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({
    ctx: {
      ...ctx,
      userId: ctx.userId,
    },
  });
});

// Middleware for tenant context
const hasTenant = t.middleware(({ ctx, next }) => {
  if (!ctx.tenantId) {
    logger.warn('Missing tenant context');
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Tenant context required',
    });
  }
  return next({
    ctx: {
      ...ctx,
      tenantId: ctx.tenantId,
    },
  });
});

// Middleware for role-based access control
const hasRole = (allowedRoles: AppRole[]) =>
  t.middleware(({ ctx, next }) => {
    if (!ctx.userRole) {
      logger.warn('User role not found in context');
      throw new TRPCError({ code: 'UNAUTHORIZED' });
    }

    if (!allowedRoles.includes(ctx.userRole)) {
      logger.warn(`Access denied for role: ${ctx.userRole}`, {
        allowedRoles,
        userRole: ctx.userRole,
      });
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Insufficient permissions',
      });
    }

    return next({
      ctx: {
        ...ctx,
        userRole: ctx.userRole,
      },
    });
  });

export const protectedProcedure = t.procedure.use(isAuthed).use(hasTenant);

// Role-specific procedures
export const adminProcedure = protectedProcedure.use(hasRole(['admin']));
export const editorProcedure = protectedProcedure.use(hasRole(['admin', 'editor']));
export const submitterProcedure = protectedProcedure.use(hasRole(['admin', 'editor', 'submitter']));
export const viewerProcedure = protectedProcedure.use(hasRole(['admin', 'editor', 'submitter', 'viewer']));
export const kioskProcedure = protectedProcedure.use(hasRole(['kiosk']));

/**
 * SECURITY: Platform-level role middleware
 *
 * Platform roles grant cross-tenant permissions and are separate from tenant roles.
 * These should be used sparingly and only for platform-level operations like:
 * - Tenant creation/management
 * - Platform-wide configuration
 * - Cross-tenant support access
 *
 * All platform role operations are logged for auditing purposes.
 */
const hasPlatformRole = (allowedRoles: PlatformRole[]) =>
  t.middleware(({ ctx, next, path }) => {
    if (!ctx.userId) {
      logger.warn('Platform role check failed: not authenticated');
      throw new TRPCError({ code: 'UNAUTHORIZED' });
    }

    if (!ctx.platformRole) {
      logger.warn('Platform role check failed: no platform role', {
        userId: ctx.userId,
      });
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Platform administrator access required',
      });
    }

    if (!allowedRoles.includes(ctx.platformRole)) {
      logger.warn(`Platform access denied for role: ${ctx.platformRole}`, {
        allowedRoles,
        platformRole: ctx.platformRole,
        userId: ctx.userId,
      });
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Insufficient platform permissions',
      });
    }

    // SECURITY AUDIT: Log all successful platform role operations
    // This is critical for security monitoring and incident response
    logger.info('Platform role operation executed', {
      event: 'PLATFORM_ADMIN_OPERATION',
      userId: ctx.userId,
      platformRole: ctx.platformRole,
      procedure: path,
      tenantContext: ctx.tenantId || 'none',
      timestamp: new Date().toISOString(),
    });

    return next({
      ctx: {
        ...ctx,
        platformRole: ctx.platformRole,
      },
    });
  });

/**
 * Platform admin procedure - for multi-tenant management operations
 *
 * SECURITY FIX (H3): Platform Admin Isolation Model
 *
 * This procedure:
 * - Requires authentication
 * - Does NOT require tenant context (platform admins operate across tenants)
 * - Requires platform_admin role in the JWT
 *
 * IMPORTANT SECURITY NOTES:
 * 1. Platform admins bypass tenant isolation BY DESIGN for administrative purposes
 * 2. All platform admin operations are logged to 'PLATFORM_ADMIN_OPERATION' events
 * 3. Platform admin access should be:
 *    - Granted only to Verdaio operations staff
 *    - Subject to regular access reviews
 *    - Monitored via security event logging
 * 4. Routers using this procedure MUST:
 *    - Validate any tenantId parameters explicitly
 *    - Log tenant-specific operations for audit trail
 *    - Never expose bulk cross-tenant data without explicit justification
 *
 * See: docs/SECURITY-AUDIT-2025-12-04.md (H3), docs/PLATFORM-ADMIN-OPERATIONS.md
 */
export const platformAdminProcedure = t.procedure
  .use(isAuthed)
  .use(hasPlatformRole(['platform_admin']));
