import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';

export const announcementsRouter = router({
  listActive: protectedProcedure.query(async ({ ctx }) => {
    // TODO: Implement database query for active announcements
    return {
      announcements: [],
    };
  }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(60),
        body: z.string().min(1).max(300),
        priority: z.enum(['high', 'normal', 'low']).default('normal'),
        category: z.string().optional(),
        expiresAt: z.string().datetime().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // TODO: Implement database insert with approval workflow
      return { id: 'placeholder-id', status: 'pending', ...input };
    }),
});
