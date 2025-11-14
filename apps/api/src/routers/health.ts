import { router, publicProcedure } from '../trpc';
import { z } from 'zod';

export const healthRouter = router({
  check: publicProcedure.query(() => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '0.1.0',
    };
  }),

  ping: publicProcedure
    .input(z.object({ message: z.string().optional() }))
    .query(({ input }) => {
      return {
        pong: true,
        message: input.message || 'pong',
      };
    }),
});
