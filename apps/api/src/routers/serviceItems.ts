import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { queryWithTenant, db } from '../db';
import { TRPCError } from '@trpc/server';

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

interface ServiceItem {
  id: string;
  tenant_id: string;
  service_date: Date;
  type: string;
  sequence: number;
  title: string | null;
  content: string | null;
  ccli_number: string | null;
  artist: string | null;
  scripture_ref: string | null;
  speaker: string | null;
  planning_center_id: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export const serviceItemsRouter = router({
  // List service items for a bulletin by service date
  list: protectedProcedure
    .input(z.object({ bulletinIssueId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId!;

      // First, get the service date from the bulletin issue
      const bulletinQuery = `
        SELECT issue_date
        FROM bulletin_issue
        WHERE id = $1 AND deleted_at IS NULL
      `;

      const bulletinResult = await queryWithTenant<{ issue_date: Date }>(
        tenantId,
        bulletinQuery,
        [input.bulletinIssueId]
      );

      if (bulletinResult.rows.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Bulletin not found',
        });
      }

      const serviceDate = bulletinResult.rows[0].issue_date;

      // Get service items for this date
      const itemsQuery = `
        SELECT
          id,
          tenant_id,
          service_date,
          type,
          sequence,
          title,
          content,
          ccli_number,
          artist,
          scripture_ref,
          speaker,
          created_at,
          updated_at
        FROM service_item
        WHERE service_date = $1 AND deleted_at IS NULL
        ORDER BY sequence ASC
      `;

      const result = await queryWithTenant<ServiceItem>(tenantId, itemsQuery, [serviceDate]);

      return {
        items: result.rows.map((row) => ({
          id: row.id,
          tenantId: row.tenant_id,
          serviceDate: row.service_date,
          type: row.type,
          sequence: row.sequence,
          title: row.title,
          content: row.content,
          ccliNumber: row.ccli_number,
          artist: row.artist,
          scriptureRef: row.scripture_ref,
          speaker: row.speaker,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        })),
      };
    }),

  // Create service item
  create: protectedProcedure
    .input(
      z.object({
        bulletinIssueId: z.string().uuid(),
        type: ServiceItemTypeSchema,
        title: z.string().min(1),
        content: z.string().optional(),
        ccliNumber: z.string().optional(),
        artist: z.string().optional(),
        scriptureRef: z.string().optional(),
        speaker: z.string().optional(),
        sequence: z.number().int().min(0),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId!;

      // Validation: CCLI required for songs
      if (input.type === 'Song' && !input.ccliNumber) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'CCLI number required for songs',
        });
      }

      // Get service date from bulletin
      const bulletinQuery = `
        SELECT issue_date
        FROM bulletin_issue
        WHERE id = $1 AND deleted_at IS NULL
      `;

      const bulletinResult = await queryWithTenant<{ issue_date: Date }>(
        tenantId,
        bulletinQuery,
        [input.bulletinIssueId]
      );

      if (bulletinResult.rows.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Bulletin not found',
        });
      }

      const serviceDate = bulletinResult.rows[0].issue_date;

      const insertQuery = `
        INSERT INTO service_item (
          tenant_id,
          service_date,
          type,
          sequence,
          title,
          content,
          ccli_number,
          artist,
          scripture_ref,
          speaker
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING
          id,
          tenant_id,
          service_date,
          type,
          sequence,
          title,
          content,
          ccli_number,
          artist,
          scripture_ref,
          speaker,
          created_at,
          updated_at
      `;

      const result = await queryWithTenant<ServiceItem>(tenantId, insertQuery, [
        tenantId,
        serviceDate,
        input.type,
        input.sequence,
        input.title,
        input.content || null,
        input.ccliNumber || null,
        input.artist || null,
        input.scriptureRef || null,
        input.speaker || null,
      ]);

      const row = result.rows[0];
      return {
        id: row.id,
        tenantId: row.tenant_id,
        serviceDate: row.service_date,
        type: row.type,
        sequence: row.sequence,
        title: row.title,
        content: row.content,
        ccliNumber: row.ccli_number,
        artist: row.artist,
        scriptureRef: row.scripture_ref,
        speaker: row.speaker,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    }),

  // Update service item
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        type: ServiceItemTypeSchema.optional(),
        title: z.string().min(1).optional(),
        content: z.string().optional(),
        ccliNumber: z.string().optional(),
        artist: z.string().optional(),
        scriptureRef: z.string().optional(),
        speaker: z.string().optional(),
        sequence: z.number().int().min(0).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId!;

      // Check if item exists
      const existsQuery = `
        SELECT type FROM service_item
        WHERE id = $1 AND deleted_at IS NULL
      `;

      const exists = await queryWithTenant<{ type: string }>(tenantId, existsQuery, [input.id]);

      if (exists.rows.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Service item not found',
        });
      }

      // Validate CCLI for songs
      const itemType = input.type || exists.rows[0].type;
      if (itemType === 'Song' && input.ccliNumber === null) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'CCLI number required for songs',
        });
      }

      const updateQuery = `
        UPDATE service_item
        SET type = COALESCE($2, type),
            title = COALESCE($3, title),
            content = COALESCE($4, content),
            ccli_number = COALESCE($5, ccli_number),
            artist = COALESCE($6, artist),
            scripture_ref = COALESCE($7, scripture_ref),
            speaker = COALESCE($8, speaker),
            sequence = COALESCE($9, sequence),
            updated_at = NOW()
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING id
      `;

      await queryWithTenant(tenantId, updateQuery, [
        input.id,
        input.type,
        input.title,
        input.content,
        input.ccliNumber,
        input.artist,
        input.scriptureRef,
        input.speaker,
        input.sequence,
      ]);

      return { success: true };
    }),

  // Delete service item
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId!;

      const deleteQuery = `
        UPDATE service_item
        SET deleted_at = NOW()
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING id
      `;

      const result = await queryWithTenant(tenantId, deleteQuery, [input.id]);

      if (result.rows.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Service item not found',
        });
      }

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
            sequence: z.number().int().min(0),
          })
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId!;

      // Use transaction for atomic updates
      const client = await db.connect();
      try {
        await client.query('BEGIN');
        await client.query(`SET LOCAL app.tenant_id = '${tenantId}'`);

        // Update each item's sequence
        for (const item of input.items) {
          await client.query(
            `UPDATE service_item
             SET sequence = $1, updated_at = NOW()
             WHERE id = $2 AND deleted_at IS NULL`,
            [item.sequence, item.id]
          );
        }

        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

      return { success: true };
    }),
});
