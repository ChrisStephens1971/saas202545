import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { Context } from './context';
import { logger } from './utils/logger';

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

export const protectedProcedure = t.procedure.use(isAuthed).use(hasTenant);
