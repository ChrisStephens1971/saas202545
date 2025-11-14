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
    .query(async ({ input, ctx }) => {
      // TODO: Implement database query
      return {
        people: [],
        total: 0,
        limit: input.limit,
        offset: input.offset,
      };
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      // TODO: Implement database query
      return null;
    }),

  create: protectedProcedure
    .input(
      z.object({
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        householdId: z.string().uuid().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // TODO: Implement database insert
      return { id: 'placeholder-id', ...input };
    }),
});
