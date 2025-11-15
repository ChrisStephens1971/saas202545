import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { Context } from './context';
import { logger } from './utils/logger';
import { AppRole } from './auth/types';

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof Error && error.cause.name === 'ZodError'
            ? error.cause
            : null,
      },
    };
  },
});

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
