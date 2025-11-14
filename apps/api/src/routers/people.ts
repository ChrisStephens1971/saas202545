import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';

export const peopleRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input, ctx: _ctx }) => {
      // TODO: Implement database query with full-text search
      return {
        people: [],
        total: 0,
        limit: input.limit,
        offset: input.offset,
      };
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx: _ctx }) => {
      // TODO: Implement database query
      return null;
    }),

  create: protectedProcedure
    .input(
      z.object({
        firstName: z.string().min(1).max(100),
        lastName: z.string().min(1).max(100),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        dateOfBirth: z.string().date().optional(),
        gender: z.string().optional(),
        householdId: z.string().uuid().optional(),
        memberSince: z.string().date().optional(),
        membershipStatus: z.enum(['member', 'attendee', 'visitor']).default('member'),
      })
    )
    .mutation(async ({ input, ctx: _ctx }) => {
      // TODO: Implement database insert
      return {
        id: 'placeholder-uuid',
        tenantId: _ctx.tenantId!,
        ...input,
        photoUrl: null,
        planningCenterId: null,
        externalId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        firstName: z.string().min(1).max(100).optional(),
        lastName: z.string().min(1).max(100).optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        dateOfBirth: z.string().date().optional(),
        gender: z.string().optional(),
        householdId: z.string().uuid().optional(),
        memberSince: z.string().date().optional(),
        membershipStatus: z.enum(['member', 'attendee', 'visitor']).optional(),
      })
    )
    .mutation(async ({ input, ctx: _ctx }) => {
      // TODO: Implement database update
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx: _ctx }) => {
      // TODO: Implement soft delete
      return { success: true };
    }),
});
