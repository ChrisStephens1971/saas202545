import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';

const ServiceItemTypeSchema = z.enum([
  'Welcome',
  'CallToWorship',
  'Song',
  'Prayer',
  'Scripture',
  'Sermon',
  'Offering',
  'Communion',
  'Benediction',
  'Announcement',
  'Other',
]);

export const serviceItemsRouter = router({
  // List service items for a bulletin
  list: protectedProcedure
    .input(z.object({ bulletinIssueId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      // TODO: Implement database query
      return {
        items: [],
      };
    }),

  // Create service item
  create: protectedProcedure
    .input(
      z.object({
        bulletinIssueId: z.string().uuid(),
        type: ServiceItemTypeSchema,
        title: z.string().min(1),
        description: z.string().optional(),
        ccliNumber: z.string().optional(),
        orderIndex: z.number().int().min(0),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Validation: CCLI required for songs
      if (input.type === 'Song' && !input.ccliNumber) {
        throw new Error('CCLI number required for songs');
      }

      // TODO: Implement database insert
      return {
        id: 'placeholder-uuid',
        tenantId: ctx.tenantId!,
        bulletinIssueId: input.bulletinIssueId,
        type: input.type,
        title: input.title,
        description: input.description || null,
        ccliNumber: input.ccliNumber || null,
        orderIndex: input.orderIndex,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }),

  // Update service item
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        type: ServiceItemTypeSchema.optional(),
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        ccliNumber: z.string().optional(),
        orderIndex: z.number().int().min(0).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // TODO: Implement database update
      return { success: true };
    }),

  // Delete service item
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      // TODO: Implement delete
      return { success: true };
    }),

  // Reorder service items
  reorder: protectedProcedure
    .input(
      z.object({
        bulletinIssueId: z.string().uuid(),
        items: z.array(
          z.object({
            id: z.string().uuid(),
            orderIndex: z.number().int().min(0),
          })
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // TODO: Update order indices for all items
      return { success: true };
    }),
});
