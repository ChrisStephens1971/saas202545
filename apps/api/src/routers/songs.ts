import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { queryWithTenant, QueryParam } from '../db';
import { TRPCError } from '@trpc/server';
import { pgCountToNumber } from '../lib/dbNumeric';

export interface Song {
  id: string;
  tenant_id: string;
  title: string;
  alternate_title: string | null;
  first_line: string | null;
  tune_name: string | null;
  hymn_number: string | null;
  hymnal_code: string | null;
  author: string | null;
  composer: string | null;
  is_public_domain: boolean;
  ccli_number: string | null;
  copyright_notice: string | null;
  default_key: string | null;
  default_tempo: number | null;
  lyrics: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

/** Subset of Song fields for search results */
interface SongSearchRow {
  id: string;
  title: string;
  hymn_number: string | null;
  hymnal_code: string | null;
  ccli_number: string | null;
  author: string | null;
  is_public_domain: boolean;
}

/** Result of a bulk create operation */
type BulkCreateResult =
  | { success: true; song: ReturnType<typeof transformSong> }
  | { success: false; title: string; error: string };

// Zod schemas for input validation
const createSongSchema = z.object({
  title: z.string().min(1).max(255),
  alternateTitle: z.string().max(255).optional(),
  firstLine: z.string().max(500).optional(),
  tuneName: z.string().max(100).optional(),
  hymnNumber: z.string().max(20).optional(),
  hymnalCode: z.string().max(20).optional(),
  author: z.string().max(255).optional(),
  composer: z.string().max(255).optional(),
  isPublicDomain: z.boolean().optional(),
  ccliNumber: z.string().max(50).optional(),
  copyrightNotice: z.string().optional(),
  defaultKey: z.string().max(10).optional(),
  defaultTempo: z.number().int().min(20).max(300).optional(),
  lyrics: z.string().optional(),
});

const updateSongSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(255).optional(),
  alternateTitle: z.string().max(255).nullable().optional(),
  firstLine: z.string().max(500).nullable().optional(),
  tuneName: z.string().max(100).nullable().optional(),
  hymnNumber: z.string().max(20).nullable().optional(),
  hymnalCode: z.string().max(20).nullable().optional(),
  author: z.string().max(255).nullable().optional(),
  composer: z.string().max(255).nullable().optional(),
  isPublicDomain: z.boolean().optional(),
  ccliNumber: z.string().max(50).nullable().optional(),
  copyrightNotice: z.string().nullable().optional(),
  defaultKey: z.string().max(10).nullable().optional(),
  defaultTempo: z.number().int().min(20).max(300).nullable().optional(),
  lyrics: z.string().nullable().optional(),
});

// Field mapping from camelCase to snake_case
const fieldMap: Record<string, string> = {
  alternateTitle: 'alternate_title',
  firstLine: 'first_line',
  tuneName: 'tune_name',
  hymnNumber: 'hymn_number',
  hymnalCode: 'hymnal_code',
  isPublicDomain: 'is_public_domain',
  ccliNumber: 'ccli_number',
  copyrightNotice: 'copyright_notice',
  defaultKey: 'default_key',
  defaultTempo: 'default_tempo',
};

// Helper to transform db row to camelCase response
function transformSong(row: Song) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    title: row.title,
    alternateTitle: row.alternate_title,
    firstLine: row.first_line,
    tuneName: row.tune_name,
    hymnNumber: row.hymn_number,
    hymnalCode: row.hymnal_code,
    author: row.author,
    composer: row.composer,
    isPublicDomain: row.is_public_domain,
    ccliNumber: row.ccli_number,
    copyrightNotice: row.copyright_notice,
    defaultKey: row.default_key,
    defaultTempo: row.default_tempo,
    lyrics: row.lyrics,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const songsRouter = router({
  // ============================================================================
  // LIST / SEARCH SONGS
  // ============================================================================

  list: protectedProcedure
    .input(
      z.object({
        query: z.string().optional(),
        hymnalCode: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      const { query, hymnalCode, limit, offset } = input;
      const tenantId = ctx.tenantId!;

      let queryText = `
        SELECT *
        FROM song
        WHERE deleted_at IS NULL
      `;

      const queryParams: QueryParam[] = [];

      // Search filter
      if (query) {
        queryParams.push(`%${query}%`);
        queryText += `
          AND (
            title ILIKE $${queryParams.length}
            OR alternate_title ILIKE $${queryParams.length}
            OR first_line ILIKE $${queryParams.length}
            OR tune_name ILIKE $${queryParams.length}
            OR hymn_number ILIKE $${queryParams.length}
            OR ccli_number ILIKE $${queryParams.length}
          )
        `;
      }

      // Hymnal filter
      if (hymnalCode) {
        queryParams.push(hymnalCode);
        queryText += ` AND hymnal_code = $${queryParams.length}`;
      }

      queryText += ` ORDER BY title ASC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
      queryParams.push(limit, offset);

      // Build count query with same filters
      let countQuery = `
        SELECT COUNT(*) as total
        FROM song
        WHERE deleted_at IS NULL
      `;
      const countParams: QueryParam[] = [];

      if (query) {
        countParams.push(`%${query}%`);
        countQuery += `
          AND (
            title ILIKE $${countParams.length}
            OR alternate_title ILIKE $${countParams.length}
            OR first_line ILIKE $${countParams.length}
            OR tune_name ILIKE $${countParams.length}
            OR hymn_number ILIKE $${countParams.length}
            OR ccli_number ILIKE $${countParams.length}
          )
        `;
      }

      if (hymnalCode) {
        countParams.push(hymnalCode);
        countQuery += ` AND hymnal_code = $${countParams.length}`;
      }

      const [dataResult, countResult] = await Promise.all([
        queryWithTenant<Song>(tenantId, queryText, queryParams),
        queryWithTenant<{ total: string }>(tenantId, countQuery, countParams),
      ]);

      return {
        songs: dataResult.rows.map(transformSong),
        total: pgCountToNumber(countResult.rows[0].total),
      };
    }),

  // ============================================================================
  // GET SONG BY ID
  // ============================================================================

  byId: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const { id } = input;
      const tenantId = ctx.tenantId!;

      const result = await queryWithTenant<Song>(
        tenantId,
        `SELECT * FROM song WHERE id = $1 AND deleted_at IS NULL`,
        [id]
      );

      if (result.rows.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Song not found' });
      }

      return transformSong(result.rows[0]);
    }),

  // ============================================================================
  // CREATE SONG
  // ============================================================================

  create: protectedProcedure
    .input(createSongSchema)
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId!;

      const result = await queryWithTenant<Song>(
        tenantId,
        `INSERT INTO song (
          tenant_id, title, alternate_title, first_line, tune_name,
          hymn_number, hymnal_code, author, composer, is_public_domain,
          ccli_number, copyright_notice, default_key, default_tempo, lyrics
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *`,
        [
          tenantId,
          input.title,
          input.alternateTitle || null,
          input.firstLine || null,
          input.tuneName || null,
          input.hymnNumber || null,
          input.hymnalCode || null,
          input.author || null,
          input.composer || null,
          input.isPublicDomain ?? false,
          input.ccliNumber || null,
          input.copyrightNotice || null,
          input.defaultKey || null,
          input.defaultTempo || null,
          input.lyrics || null,
        ]
      );

      return transformSong(result.rows[0]);
    }),

  // ============================================================================
  // UPDATE SONG
  // ============================================================================

  update: protectedProcedure
    .input(updateSongSchema)
    .mutation(async ({ input, ctx }) => {
      const { id, ...updates } = input;
      const tenantId = ctx.tenantId!;

      const setClauses: string[] = [];
      const values: QueryParam[] = [id];
      let paramIndex = 2;

      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined) {
          const dbField = fieldMap[key] || key;
          setClauses.push(`${dbField} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
      });

      if (setClauses.length === 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'No fields to update' });
      }

      const result = await queryWithTenant<Song>(
        tenantId,
        `UPDATE song
         SET ${setClauses.join(', ')}
         WHERE id = $1 AND deleted_at IS NULL
         RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Song not found' });
      }

      return transformSong(result.rows[0]);
    }),

  // ============================================================================
  // DELETE SONG
  // ============================================================================

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const { id } = input;
      const tenantId = ctx.tenantId!;

      // Check if any service items reference this song
      const referencesCheck = await queryWithTenant(
        tenantId,
        `SELECT COUNT(*) as count FROM service_item WHERE song_id = $1 AND deleted_at IS NULL`,
        [id]
      );

      const referenceCount = pgCountToNumber(referencesCheck.rows[0].count);

      if (referenceCount > 0) {
        // Null out the song_id on service items instead of blocking deletion
        // This follows a soft-unlink approach
        await queryWithTenant(
          tenantId,
          `UPDATE service_item SET song_id = NULL WHERE song_id = $1 AND deleted_at IS NULL`,
          [id]
        );
      }

      // Soft delete the song
      const result = await queryWithTenant(
        tenantId,
        `UPDATE song
         SET deleted_at = NOW()
         WHERE id = $1 AND deleted_at IS NULL
         RETURNING id`,
        [id]
      );

      if (result.rows.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Song not found' });
      }

      return {
        success: true,
        unlinkedServiceItems: referenceCount,
      };
    }),

  // ============================================================================
  // HELPER: LIST SONGS FOR SELECT (Service Item Linkage)
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
          id,
          title,
          hymn_number,
          hymnal_code,
          ccli_number,
          author,
          is_public_domain
        FROM song
        WHERE deleted_at IS NULL
      `;

      const queryParams: QueryParam[] = [];

      if (search) {
        queryParams.push(`%${search}%`);
        queryText += `
          AND (
            title ILIKE $${queryParams.length}
            OR hymn_number ILIKE $${queryParams.length}
            OR ccli_number ILIKE $${queryParams.length}
          )
        `;
      }

      queryText += ` ORDER BY title ASC LIMIT $${queryParams.length + 1}`;
      queryParams.push(limit);

      const result = await queryWithTenant<SongSearchRow>(tenantId, queryText, queryParams);

      return result.rows.map((row) => ({
        id: row.id,
        title: row.title,
        hymnNumber: row.hymn_number,
        hymnalCode: row.hymnal_code,
        ccliNumber: row.ccli_number,
        author: row.author,
        isPublicDomain: row.is_public_domain,
      }));
    }),

  // ============================================================================
  // BULK IMPORT (For initial data loading)
  // ============================================================================

  bulkCreate: protectedProcedure
    .input(
      z.object({
        songs: z.array(createSongSchema).max(100), // Limit to 100 at a time
      })
    )
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId!;
      const results: BulkCreateResult[] = [];

      for (const song of input.songs) {
        try {
          const result = await queryWithTenant<Song>(
            tenantId,
            `INSERT INTO song (
              tenant_id, title, alternate_title, first_line, tune_name,
              hymn_number, hymnal_code, author, composer, is_public_domain,
              ccli_number, copyright_notice, default_key, default_tempo, lyrics
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            ON CONFLICT (tenant_id, title, COALESCE(hymnal_code, ''), COALESCE(hymn_number, ''))
            WHERE deleted_at IS NULL
            DO UPDATE SET
              alternate_title = EXCLUDED.alternate_title,
              first_line = EXCLUDED.first_line,
              tune_name = EXCLUDED.tune_name,
              author = EXCLUDED.author,
              composer = EXCLUDED.composer,
              is_public_domain = EXCLUDED.is_public_domain,
              ccli_number = EXCLUDED.ccli_number,
              copyright_notice = EXCLUDED.copyright_notice,
              default_key = EXCLUDED.default_key,
              default_tempo = EXCLUDED.default_tempo,
              lyrics = EXCLUDED.lyrics,
              updated_at = NOW()
            RETURNING *`,
            [
              tenantId,
              song.title,
              song.alternateTitle || null,
              song.firstLine || null,
              song.tuneName || null,
              song.hymnNumber || null,
              song.hymnalCode || null,
              song.author || null,
              song.composer || null,
              song.isPublicDomain ?? false,
              song.ccliNumber || null,
              song.copyrightNotice || null,
              song.defaultKey || null,
              song.defaultTempo || null,
              song.lyrics || null,
            ]
          );
          results.push({ success: true, song: transformSong(result.rows[0]) });
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          results.push({ success: false, title: song.title, error: errorMessage });
        }
      }

      return {
        imported: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results,
      };
    }),
});
