import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { queryWithTenant, QueryParam } from '../db';
import { TRPCError } from '@trpc/server';
import {
  SermonOutlineSchema,
  SermonPathStageSchema,
  SermonStatusSchema,
} from '@elder-first/types';
import { pgCountToNumber } from '../lib/dbNumeric';

export interface SermonSeries {
  id: string;
  tenant_id: string;
  title: string;
  description: string | null;
  slug: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface SermonOutlinePoint {
  label: string;
  scriptureRef?: string;
  summary?: string;
  notes?: string;
}

export interface SermonOutline {
  passage?: string;
  audienceFocus?: string;
  bigIdea?: string;
  mainPoints: SermonOutlinePoint[];
  application?: string;
  callToAction?: string;
  extraNotes?: string;
}

export interface Sermon {
  id: string;
  tenant_id: string;
  series_id: string | null;
  title: string;
  preacher: string | null;
  primary_scripture: string | null;
  additional_scripture: string | null;
  sermon_date: Date;
  manuscript: string | null;
  audio_url: string | null;
  video_url: string | null;
  tags: string[] | null;
  // Sermon Builder fields
  outline: SermonOutline | null;
  path_stage: string;
  status: string;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export const sermonsRouter = router({
  // ============================================================================
  // SERMON SERIES
  // ============================================================================

  listSeries: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      const { limit, offset } = input;
      const tenantId = ctx.tenantId!;

      const queryText = `
        SELECT
          ss.*,
          COUNT(s.id) as sermon_count
        FROM sermon_series ss
        LEFT JOIN sermon s ON ss.id = s.series_id AND s.deleted_at IS NULL
        WHERE ss.deleted_at IS NULL
        GROUP BY ss.id
        ORDER BY ss.created_at DESC
        LIMIT $1 OFFSET $2
      `;

      const countQuery = `
        SELECT COUNT(*) as total
        FROM sermon_series
        WHERE deleted_at IS NULL
      `;

      const [dataResult, countResult] = await Promise.all([
        queryWithTenant(tenantId, queryText, [limit, offset]),
        queryWithTenant(tenantId, countQuery, []),
      ]);

      return {
        series: dataResult.rows,
        total: pgCountToNumber(countResult.rows[0].total),
      };
    }),

  getSeries: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const { id } = input;
      const tenantId = ctx.tenantId!;

      const result = await queryWithTenant<SermonSeries>(
        tenantId,
        `SELECT * FROM sermon_series WHERE id = $1 AND deleted_at IS NULL`,
        [id]
      );

      if (result.rows.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Sermon series not found' });
      }

      return result.rows[0];
    }),

  createSeries: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(200),
        description: z.string().optional(),
        slug: z.string().max(100).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId!;

      const result = await queryWithTenant<SermonSeries>(
        tenantId,
        `INSERT INTO sermon_series (tenant_id, title, description, slug)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [tenantId, input.title, input.description || null, input.slug || null]
      );

      return result.rows[0];
    }),

  updateSeries: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        title: z.string().min(1).max(200).optional(),
        description: z.string().optional(),
        slug: z.string().max(100).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...updates } = input;
      const tenantId = ctx.tenantId!;

      const setClauses: string[] = [];
      const values: QueryParam[] = [id];
      let paramIndex = 2;

      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined) {
          setClauses.push(`${key} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
      });

      if (setClauses.length === 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'No fields to update' });
      }

      const result = await queryWithTenant<SermonSeries>(
        tenantId,
        `UPDATE sermon_series
         SET ${setClauses.join(', ')}
         WHERE id = $1 AND deleted_at IS NULL
         RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Sermon series not found' });
      }

      return result.rows[0];
    }),

  deleteSeries: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const { id } = input;
      const tenantId = ctx.tenantId!;

      const result = await queryWithTenant(
        tenantId,
        `UPDATE sermon_series
         SET deleted_at = NOW()
         WHERE id = $1 AND deleted_at IS NULL
         RETURNING id`,
        [id]
      );

      if (result.rows.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Sermon series not found' });
      }

      return { success: true };
    }),

  // ============================================================================
  // SERMONS
  // ============================================================================

  list: protectedProcedure
    .input(
      z.object({
        seriesId: z.string().uuid().optional(),
        preacher: z.string().optional(),
        startDate: z.string().optional(), // ISO date
        endDate: z.string().optional(), // ISO date
        search: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      const { seriesId, preacher, startDate, endDate, search, limit, offset } = input;
      const tenantId = ctx.tenantId!;

      let queryText = `
        SELECT
          s.*,
          ss.title as series_title
        FROM sermon s
        LEFT JOIN sermon_series ss ON s.series_id = ss.id AND ss.deleted_at IS NULL
        WHERE s.deleted_at IS NULL
      `;

      const queryParams: QueryParam[] = [];

      if (seriesId) {
        queryParams.push(seriesId);
        queryText += ` AND s.series_id = $${queryParams.length}`;
      }

      if (preacher) {
        queryParams.push(preacher);
        queryText += ` AND s.preacher ILIKE $${queryParams.length}`;
      }

      if (startDate) {
        queryParams.push(startDate);
        queryText += ` AND s.sermon_date >= $${queryParams.length}`;
      }

      if (endDate) {
        queryParams.push(endDate);
        queryText += ` AND s.sermon_date <= $${queryParams.length}`;
      }

      if (search) {
        queryParams.push(`%${search}%`);
        queryText += ` AND (s.title ILIKE $${queryParams.length} OR s.primary_scripture ILIKE $${queryParams.length})`;
      }

      queryText += ` ORDER BY s.sermon_date DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
      queryParams.push(limit, offset);

      // Build count query with same filters
      let countQuery = `
        SELECT COUNT(*) as total
        FROM sermon s
        WHERE s.deleted_at IS NULL
      `;
      const countParams: QueryParam[] = [];
      if (seriesId) {
        countParams.push(seriesId);
        countQuery += ` AND s.series_id = $${countParams.length}`;
      }
      if (preacher) {
        countParams.push(preacher);
        countQuery += ` AND s.preacher ILIKE $${countParams.length}`;
      }
      if (startDate) {
        countParams.push(startDate);
        countQuery += ` AND s.sermon_date >= $${countParams.length}`;
      }
      if (endDate) {
        countParams.push(endDate);
        countQuery += ` AND s.sermon_date <= $${countParams.length}`;
      }
      if (search) {
        countParams.push(`%${search}%`);
        countQuery += ` AND (s.title ILIKE $${countParams.length} OR s.primary_scripture ILIKE $${countParams.length})`;
      }

      const [dataResult, countResult] = await Promise.all([
        queryWithTenant(tenantId, queryText, queryParams),
        queryWithTenant(tenantId, countQuery, countParams),
      ]);

      return {
        sermons: dataResult.rows,
        total: pgCountToNumber(countResult.rows[0].total),
      };
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const { id } = input;
      const tenantId = ctx.tenantId!;

      const result = await queryWithTenant<Sermon>(
        tenantId,
        `SELECT
          s.*,
          ss.title as series_title
        FROM sermon s
        LEFT JOIN sermon_series ss ON s.series_id = ss.id AND ss.deleted_at IS NULL
        WHERE s.id = $1 AND s.deleted_at IS NULL`,
        [id]
      );

      if (result.rows.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Sermon not found' });
      }

      return result.rows[0];
    }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(200),
        sermonDate: z.string(), // ISO date
        seriesId: z.string().uuid().optional(),
        preacher: z.string().max(150).optional(),
        primaryScripture: z.string().max(100).optional(),
        additionalScripture: z.string().optional(),
        manuscript: z.string().optional(),
        audioUrl: z.string().optional(),
        videoUrl: z.string().optional(),
        tags: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId!;

      const result = await queryWithTenant<Sermon>(
        tenantId,
        `INSERT INTO sermon (
          tenant_id, series_id, title, sermon_date, preacher,
          primary_scripture, additional_scripture, manuscript,
          audio_url, video_url, tags
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [
          tenantId,
          input.seriesId || null,
          input.title,
          input.sermonDate,
          input.preacher || null,
          input.primaryScripture || null,
          input.additionalScripture || null,
          input.manuscript || null,
          input.audioUrl || null,
          input.videoUrl || null,
          input.tags || null,
        ]
      );

      return result.rows[0];
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        title: z.string().min(1).max(200).optional(),
        sermonDate: z.string().optional(),
        seriesId: z.string().uuid().nullable().optional(),
        preacher: z.string().max(150).nullable().optional(),
        primaryScripture: z.string().max(100).nullable().optional(),
        additionalScripture: z.string().nullable().optional(),
        manuscript: z.string().nullable().optional(),
        audioUrl: z.string().nullable().optional(),
        videoUrl: z.string().nullable().optional(),
        tags: z.array(z.string()).nullable().optional(),
        // Sermon Builder fields
        outline: SermonOutlineSchema.nullable().optional(),
        pathStage: SermonPathStageSchema.optional(),
        status: SermonStatusSchema.optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...updates } = input;
      const tenantId = ctx.tenantId!;

      const setClauses: string[] = [];
      const values: QueryParam[] = [id];
      let paramIndex = 2;

      // Map camelCase to snake_case
      const fieldMap: Record<string, string> = {
        sermonDate: 'sermon_date',
        seriesId: 'series_id',
        primaryScripture: 'primary_scripture',
        additionalScripture: 'additional_scripture',
        audioUrl: 'audio_url',
        videoUrl: 'video_url',
        pathStage: 'path_stage',
      };

      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined) {
          const dbField = fieldMap[key] || key;
          setClauses.push(`${dbField} = $${paramIndex}`);
          // For outline, stringify to JSON
          if (key === 'outline' && value !== null) {
            values.push(JSON.stringify(value));
          } else {
            values.push(value);
          }
          paramIndex++;
        }
      });

      if (setClauses.length === 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'No fields to update' });
      }

      const result = await queryWithTenant<Sermon>(
        tenantId,
        `UPDATE sermon
         SET ${setClauses.join(', ')}, updated_at = NOW()
         WHERE id = $1 AND deleted_at IS NULL
         RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Sermon not found' });
      }

      return result.rows[0];
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const { id } = input;
      const tenantId = ctx.tenantId!;

      const result = await queryWithTenant(
        tenantId,
        `UPDATE sermon
         SET deleted_at = NOW()
         WHERE id = $1 AND deleted_at IS NULL
         RETURNING id`,
        [id]
      );

      if (result.rows.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Sermon not found' });
      }

      return { success: true };
    }),

  // ============================================================================
  // HELPER: LIST SERMONS FOR SELECT (Bulletin Linkage)
  // ============================================================================

  listForSelect: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ input, ctx }) => {
      const { search, limit } = input;
      const tenantId = ctx.tenantId!;

      let queryText = `
        SELECT
          s.id,
          s.title,
          s.sermon_date,
          s.preacher,
          s.primary_scripture,
          ss.title as series_title
        FROM sermon s
        LEFT JOIN sermon_series ss ON s.series_id = ss.id AND ss.deleted_at IS NULL
        WHERE s.deleted_at IS NULL
      `;

      const queryParams: QueryParam[] = [];

      if (search) {
        queryParams.push(`%${search}%`);
        queryText += ` AND (s.title ILIKE $${queryParams.length} OR s.preacher ILIKE $${queryParams.length})`;
      }

      queryText += ` ORDER BY s.sermon_date DESC LIMIT $${queryParams.length + 1}`;
      queryParams.push(limit);

      const result = await queryWithTenant(tenantId, queryText, queryParams);

      return result.rows;
    }),

  // ============================================================================
  // SERMON BUILDER: SET STATUS & SYNC TO SERVICE ITEMS
  // ============================================================================

  /**
   * Set sermon status to "ready" and sync to linked service items.
   * This updates any service items linked to this sermon with the latest
   * sermon data (title, preacher, scripture).
   */
  setReadyAndSync: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id } = input;
      const tenantId = ctx.tenantId!;

      // First, update the sermon status to ready
      const sermonResult = await queryWithTenant<Sermon>(
        tenantId,
        `UPDATE sermon
         SET status = 'ready', updated_at = NOW()
         WHERE id = $1 AND deleted_at IS NULL
         RETURNING *`,
        [id]
      );

      if (sermonResult.rows.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Sermon not found' });
      }

      const sermon = sermonResult.rows[0];

      // Find and update any service items linked to this sermon
      const updateServiceItemsQuery = `
        UPDATE service_item
        SET
          title = COALESCE($2, title),
          scripture_ref = COALESCE($3, scripture_ref),
          speaker = COALESCE($4, speaker),
          updated_at = NOW()
        WHERE sermon_id = $1 AND deleted_at IS NULL
        RETURNING id
      `;

      const serviceItemsResult = await queryWithTenant(
        tenantId,
        updateServiceItemsQuery,
        [
          id,
          sermon.title,
          sermon.primary_scripture,
          sermon.preacher,
        ]
      );

      return {
        sermon,
        syncedServiceItems: serviceItemsResult.rows.length,
      };
    }),

  // ============================================================================
  // STATS
  // ============================================================================

  stats: protectedProcedure
    .input(
      z.object({
        startDate: z.string(), // ISO date
        endDate: z.string(), // ISO date
      })
    )
    .query(async ({ input, ctx }) => {
      const { startDate, endDate } = input;
      const tenantId = ctx.tenantId!;

      const result = await queryWithTenant(
        tenantId,
        `SELECT * FROM get_sermon_stats($1, $2, $3)`,
        [tenantId, startDate, endDate]
      );

      return result.rows[0];
    }),
});
