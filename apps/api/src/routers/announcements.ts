import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { queryWithTenant } from '../db';
import { TRPCError } from '@trpc/server';

const AnnouncementPrioritySchema = z.enum(['Urgent', 'High', 'Normal']);

interface Announcement {
  id: string;
  tenant_id: string;
  title: string;
  body: string;
  priority: 'Urgent' | 'High' | 'Normal';
  category: string | null;
  is_active: boolean;
  starts_at: Date;
  expires_at: Date | null;
  submitted_by: string | null;
  approved_by: string | null;
  approved_at: Date | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export const announcementsRouter = router({
  listActive: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = ctx.tenantId!;

    const queryText = `
      SELECT
        id,
        tenant_id,
        title,
        body,
        priority,
        category,
        is_active,
        starts_at,
        expires_at,
        created_at,
        updated_at
      FROM announcement
      WHERE deleted_at IS NULL
        AND is_active = true
        AND (expires_at IS NULL OR expires_at > NOW())
      ORDER BY
        CASE priority
          WHEN 'Urgent' THEN 1
          WHEN 'High' THEN 2
          WHEN 'Normal' THEN 3
        END,
        starts_at DESC
      LIMIT 20
    `;

    const result = await queryWithTenant<Announcement>(tenantId, queryText);

    return {
      announcements: result.rows.map((row) => ({
        id: row.id,
        tenantId: row.tenant_id,
        title: row.title,
        body: row.body,
        priority: row.priority,
        category: row.category,
        isActive: row.is_active,
        startsAt: row.starts_at,
        expiresAt: row.expires_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
    };
  }),

  list: protectedProcedure
    .input(
      z.object({
        includeExpired: z.boolean().default(false),
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ input, ctx }) => {
      const { includeExpired, limit } = input;
      const tenantId = ctx.tenantId!;

      let queryText = `
        SELECT
          id,
          tenant_id,
          title,
          body,
          priority,
          category,
          is_active,
          starts_at,
          expires_at,
          approved_by,
          approved_at,
          created_at,
          updated_at
        FROM announcement
        WHERE deleted_at IS NULL
      `;

      if (!includeExpired) {
        queryText += ` AND (expires_at IS NULL OR expires_at > NOW())`;
      }

      queryText += `
        ORDER BY
          CASE priority
            WHEN 'Urgent' THEN 1
            WHEN 'High' THEN 2
            WHEN 'Normal' THEN 3
          END,
          starts_at DESC
        LIMIT $1
      `;

      const result = await queryWithTenant<Announcement>(tenantId, queryText, [limit]);

      return {
        announcements: result.rows.map((row) => ({
          id: row.id,
          tenantId: row.tenant_id,
          title: row.title,
          body: row.body,
          priority: row.priority,
          category: row.category,
          isActive: row.is_active,
          startsAt: row.starts_at,
          expiresAt: row.expires_at,
          approvedBy: row.approved_by,
          approvedAt: row.approved_at,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        })),
      };
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId!;

      const queryText = `
        SELECT
          id,
          tenant_id,
          title,
          body,
          priority,
          category,
          is_active,
          starts_at,
          expires_at,
          submitted_by,
          approved_by,
          approved_at,
          created_at,
          updated_at
        FROM announcement
        WHERE id = $1 AND deleted_at IS NULL
      `;

      const result = await queryWithTenant<Announcement>(tenantId, queryText, [input.id]);

      if (result.rows.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Announcement not found',
        });
      }

      const row = result.rows[0];
      return {
        id: row.id,
        tenantId: row.tenant_id,
        title: row.title,
        body: row.body,
        priority: row.priority,
        category: row.category,
        isActive: row.is_active,
        startsAt: row.starts_at,
        expiresAt: row.expires_at,
        submittedBy: row.submitted_by,
        approvedBy: row.approved_by,
        approvedAt: row.approved_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(60),
        body: z.string().min(1).max(300),
        priority: AnnouncementPrioritySchema.default('Normal'),
        category: z.string().optional(),
        expiresAt: z.string().datetime().optional(),
        isActive: z.boolean().default(true),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId!;
      const userId = ctx.userId; // Submitted by current user

      const insertQuery = `
        INSERT INTO announcement (
          tenant_id,
          title,
          body,
          priority,
          category,
          is_active,
          expires_at,
          submitted_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING
          id,
          tenant_id,
          title,
          body,
          priority,
          category,
          is_active,
          starts_at,
          expires_at,
          submitted_by,
          created_at,
          updated_at
      `;

      const result = await queryWithTenant<Announcement>(tenantId, insertQuery, [
        tenantId,
        input.title,
        input.body,
        input.priority,
        input.category || null,
        input.isActive,
        input.expiresAt ? new Date(input.expiresAt) : null,
        userId || null,
      ]);

      const row = result.rows[0];
      return {
        id: row.id,
        tenantId: row.tenant_id,
        title: row.title,
        body: row.body,
        priority: row.priority,
        category: row.category,
        isActive: row.is_active,
        startsAt: row.starts_at,
        expiresAt: row.expires_at,
        submittedBy: row.submitted_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        title: z.string().min(1).max(60).optional(),
        body: z.string().min(1).max(300).optional(),
        priority: AnnouncementPrioritySchema.optional(),
        category: z.string().optional(),
        expiresAt: z.string().datetime().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId!;

      // Check if announcement exists
      const existsQuery = `
        SELECT id FROM announcement
        WHERE id = $1 AND deleted_at IS NULL
      `;

      const exists = await queryWithTenant(tenantId, existsQuery, [input.id]);

      if (exists.rows.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Announcement not found',
        });
      }

      const updateQuery = `
        UPDATE announcement
        SET title = COALESCE($2, title),
            body = COALESCE($3, body),
            priority = COALESCE($4, priority),
            category = COALESCE($5, category),
            expires_at = COALESCE($6, expires_at),
            is_active = COALESCE($7, is_active),
            updated_at = NOW()
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING id
      `;

      await queryWithTenant(tenantId, updateQuery, [
        input.id,
        input.title,
        input.body,
        input.priority,
        input.category,
        input.expiresAt ? new Date(input.expiresAt) : null,
        input.isActive,
      ]);

      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId!;

      const deleteQuery = `
        UPDATE announcement
        SET deleted_at = NOW()
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING id
      `;

      const result = await queryWithTenant(tenantId, deleteQuery, [input.id]);

      if (result.rows.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Announcement not found',
        });
      }

      return { success: true };
    }),

  approve: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId!;
      const userId = ctx.userId;

      const approveQuery = `
        UPDATE announcement
        SET approved_by = $2,
            approved_at = NOW(),
            updated_at = NOW()
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING id
      `;

      const result = await queryWithTenant(tenantId, approveQuery, [input.id, userId]);

      if (result.rows.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Announcement not found',
        });
      }

      return { success: true };
    }),
});
