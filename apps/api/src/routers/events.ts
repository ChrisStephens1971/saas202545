import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';

export const eventsRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        startDate: z.string().datetime().optional(),
        endDate: z.string().datetime().optional(),
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ input: _input, ctx: _ctx }) => {
      // TODO: Implement database query
      return {
        events: [],
        total: 0,
      };
    }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(200),
        description: z.string().optional(),
        startAt: z.string().datetime(),
        endAt: z.string().datetime(),
        location: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx: _ctx }) => {
      // TODO: Implement database insert
      return { id: 'placeholder-id', ...input };
    }),
});
