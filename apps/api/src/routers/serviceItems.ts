import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { queryWithTenant, db, QueryParam } from '../db';
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

  // Batch save service items (create/update/delete multiple items at once)
  batchSave: protectedProcedure
    .input(
      z.object({
        bulletinIssueId: z.string().uuid(),
        items: z.array(
          z.object({
            id: z.string().uuid().optional(), // If present, update; if not, create
            type: ServiceItemTypeSchema,
            title: z.string(),
            content: z.string().optional(),
            ccliNumber: z.string().optional(),
            artist: z.string().optional(),
            scriptureRef: z.string().optional(),
            speaker: z.string().optional(),
            sequence: z.number().int().min(0),
            delete: z.boolean().optional(), // If true, soft-delete this item
          })
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId!;

      // Get service date from bulletin
      const bulletinQuery = `
        SELECT issue_date, status
        FROM bulletin_issue
        WHERE id = $1 AND deleted_at IS NULL
      `;

      const bulletinResult = await queryWithTenant<{ issue_date: Date; status: string }>(
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

      if (bulletinResult.rows[0].status === 'locked') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot modify service items for locked bulletin',
        });
      }

      const serviceDate = bulletinResult.rows[0].issue_date;

      // Use transaction for atomic batch updates
      const client = await db.connect();
      try {
        await client.query('BEGIN');
        await client.query('SELECT set_config($1, $2, true)', ['app.tenant_id', tenantId]);

        const results: { id: string; action: 'created' | 'updated' | 'deleted' }[] = [];

        for (const item of input.items) {
          // Validate CCLI for songs
          if (item.type === 'Song' && !item.ccliNumber && !item.delete) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: `CCLI number required for song: ${item.title}`,
            });
          }

          if (item.delete && item.id) {
            // Delete existing item
            await client.query(
              `UPDATE service_item SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL`,
              [item.id]
            );
            results.push({ id: item.id, action: 'deleted' });
          } else if (item.id) {
            // Update existing item
            await client.query(
              `UPDATE service_item
               SET type = $2, title = $3, content = $4, ccli_number = $5,
                   artist = $6, scripture_ref = $7, speaker = $8, sequence = $9,
                   updated_at = NOW()
               WHERE id = $1 AND deleted_at IS NULL`,
              [
                item.id,
                item.type,
                item.title,
                item.content || null,
                item.ccliNumber || null,
                item.artist || null,
                item.scriptureRef || null,
                item.speaker || null,
                item.sequence,
              ]
            );
            results.push({ id: item.id, action: 'updated' });
          } else {
            // Create new item
            const insertResult = await client.query<{ id: string }>(
              `INSERT INTO service_item (
                tenant_id, service_date, type, sequence, title, content,
                ccli_number, artist, scripture_ref, speaker
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
              RETURNING id`,
              [
                tenantId,
                serviceDate,
                item.type,
                item.sequence,
                item.title,
                item.content || null,
                item.ccliNumber || null,
                item.artist || null,
                item.scriptureRef || null,
                item.speaker || null,
              ]
            );
            results.push({ id: insertResult.rows[0].id, action: 'created' });
          }
        }

        await client.query('COMMIT');

        return {
          success: true,
          results,
        };
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    }),

  // List recent bulletins with their service items (for copying/reference)
  listRecentBulletins: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(20).default(5),
        excludeBulletinId: z.string().uuid().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId!;

      let bulletinsQuery = `
        SELECT
          bi.id,
          bi.issue_date,
          bi.status,
          (
            SELECT COUNT(*)
            FROM service_item si
            WHERE si.service_date = bi.issue_date
              AND si.deleted_at IS NULL
          ) as item_count
        FROM bulletin_issue bi
        WHERE bi.deleted_at IS NULL
      `;

      const params: QueryParam[] = [];

      if (input.excludeBulletinId) {
        params.push(input.excludeBulletinId);
        bulletinsQuery += ` AND bi.id != $${params.length}`;
      }

      params.push(input.limit);
      bulletinsQuery += ` ORDER BY bi.issue_date DESC LIMIT $${params.length}`;

      const result = await queryWithTenant<{
        id: string;
        issue_date: Date;
        status: string;
        item_count: string;
      }>(tenantId, bulletinsQuery, params);

      return {
        bulletins: result.rows.map((row) => ({
          id: row.id,
          issueDate: row.issue_date,
          serviceDate: row.issue_date, // Include both for compatibility
          status: row.status,
          itemCount: parseInt(row.item_count, 10),
        })),
      };
    }),

  // Copy service items from one bulletin to another
  copyFromBulletin: protectedProcedure
    .input(
      z.object({
        sourceBulletinIssueId: z.string().uuid(),
        targetBulletinIssueId: z.string().uuid(),
        clearExisting: z.boolean().default(false),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId!;

      // Verify target bulletin exists and is not locked
      const targetQuery = `
        SELECT issue_date, status
        FROM bulletin_issue
        WHERE id = $1 AND deleted_at IS NULL
      `;

      const targetResult = await queryWithTenant<{ issue_date: Date; status: string }>(
        tenantId,
        targetQuery,
        [input.targetBulletinIssueId]
      );

      if (targetResult.rows.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Target bulletin not found',
        });
      }

      if (targetResult.rows[0].status === 'locked') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot modify locked bulletin',
        });
      }

      // Verify source bulletin exists
      const sourceQuery = `
        SELECT issue_date
        FROM bulletin_issue
        WHERE id = $1 AND deleted_at IS NULL
      `;

      const sourceResult = await queryWithTenant<{ issue_date: Date }>(
        tenantId,
        sourceQuery,
        [input.sourceBulletinIssueId]
      );

      if (sourceResult.rows.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Source bulletin not found',
        });
      }

      const targetDate = targetResult.rows[0].issue_date;
      const sourceDate = sourceResult.rows[0].issue_date;

      // Use transaction
      const client = await db.connect();
      try {
        await client.query('BEGIN');
        await client.query('SELECT set_config($1, $2, true)', ['app.tenant_id', tenantId]);

        // Clear existing items if requested
        if (input.clearExisting) {
          await client.query(
            `UPDATE service_item SET deleted_at = NOW() WHERE service_date = $1 AND deleted_at IS NULL`,
            [targetDate]
          );
        }

        // Copy items from source to target
        const copyQuery = `
          INSERT INTO service_item (
            tenant_id, service_date, type, sequence, title, content,
            ccli_number, artist, scripture_ref, speaker
          )
          SELECT
            tenant_id, $2, type, sequence, title, content,
            ccli_number, artist, scripture_ref, speaker
          FROM service_item
          WHERE service_date = $1 AND deleted_at IS NULL
          RETURNING id
        `;

        const copyResult = await client.query<{ id: string }>(copyQuery, [sourceDate, targetDate]);

        await client.query('COMMIT');

        return {
          success: true,
          copiedCount: copyResult.rows.length,
        };
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    }),

  // Get service templates (predefined service orders)
  templates: protectedProcedure
    .query(async ({ ctx }) => {
      const tenantId = ctx.tenantId!;

      // Try to query from service_template table if it exists
      try {
        const queryText = `
          SELECT id, name, description, default_items
          FROM service_template
          WHERE tenant_id = $1 AND deleted_at IS NULL
          ORDER BY name
        `;

        const result = await queryWithTenant<{
          id: string;
          name: string;
          description: string | null;
          default_items: unknown;
        }>(tenantId, queryText, [tenantId]);

        if (result.rows.length > 0) {
          // Return array directly (frontend expects to call .map(), .find(), etc.)
          return result.rows.map((row) => ({
            key: row.id,
            name: row.name,
            description: row.description,
            items: row.default_items as {
              type: string;
              title: string;
              sequence: number;
            }[] || [],
          }));
        }
      } catch {
        // Table doesn't exist, fall through to defaults
      }

      // Return default templates as array
      return [
        {
          key: 'default-sunday',
          name: 'Sunday Morning Service',
          description: 'Traditional Sunday morning worship service',
          items: [
            { type: 'Welcome', title: 'Welcome & Announcements', sequence: 0 },
            { type: 'CallToWorship', title: 'Call to Worship', sequence: 1 },
            { type: 'Song', title: 'Opening Hymn', sequence: 2 },
            { type: 'Prayer', title: 'Opening Prayer', sequence: 3 },
            { type: 'Scripture', title: 'Scripture Reading', sequence: 4 },
            { type: 'Song', title: 'Hymn of Preparation', sequence: 5 },
            { type: 'Sermon', title: 'Sermon', sequence: 6 },
            { type: 'Song', title: 'Hymn of Response', sequence: 7 },
            { type: 'Offering', title: 'Offering', sequence: 8 },
            { type: 'Benediction', title: 'Benediction', sequence: 9 },
          ],
        },
        {
          key: 'communion-sunday',
          name: 'Communion Sunday',
          description: 'Sunday service with communion celebration',
          items: [
            { type: 'Welcome', title: 'Welcome & Announcements', sequence: 0 },
            { type: 'CallToWorship', title: 'Call to Worship', sequence: 1 },
            { type: 'Song', title: 'Opening Hymn', sequence: 2 },
            { type: 'Prayer', title: 'Opening Prayer', sequence: 3 },
            { type: 'Scripture', title: 'Scripture Reading', sequence: 4 },
            { type: 'Sermon', title: 'Sermon', sequence: 5 },
            { type: 'Communion', title: 'The Lord\'s Supper', sequence: 6 },
            { type: 'Song', title: 'Hymn of Response', sequence: 7 },
            { type: 'Offering', title: 'Offering', sequence: 8 },
            { type: 'Benediction', title: 'Benediction', sequence: 9 },
          ],
        },
        {
          key: 'simple-service',
          name: 'Simple Service',
          description: 'Minimal service order for special occasions',
          items: [
            { type: 'Welcome', title: 'Welcome', sequence: 0 },
            { type: 'Song', title: 'Hymn', sequence: 1 },
            { type: 'Scripture', title: 'Scripture', sequence: 2 },
            { type: 'Sermon', title: 'Message', sequence: 3 },
            { type: 'Benediction', title: 'Closing', sequence: 4 },
          ],
        },
      ];
    }),
});
