import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { queryWithTenant } from '../db';
import { TRPCError } from '@trpc/server';

// Bulletin status enum
const BulletinStatusSchema = z.enum(['draft', 'approved', 'built', 'locked']);

interface BulletinIssue {
  id: string;
  tenant_id: string;
  issue_date: Date;
  status: 'draft' | 'approved' | 'built' | 'locked';
  brand_pack_id: string | null;
  pdf_url: string | null;
  pdf_large_print_url: string | null;
  slides_json: any | null;
  loop_mp4_url: string | null;
  email_html: string | null;
  propresenter_bundle_url: string | null;
  locked_at: Date | null;
  locked_by: string | null;
  reopened_at: Date | null;
  reopened_by: string | null;
  reopen_reason: string | null;
  content_hash: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export const bulletinsRouter = router({
  // List all bulletins for tenant
  list: protectedProcedure
    .input(
      z.object({
        status: BulletinStatusSchema.optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      const { status, limit, offset } = input;
      const tenantId = ctx.tenantId!;

      let queryText = `
        SELECT
          id,
          tenant_id,
          issue_date,
          status,
          brand_pack_id,
          pdf_url,
          locked_at,
          locked_by,
          created_at,
          updated_at
        FROM bulletin_issue
        WHERE deleted_at IS NULL
      `;

      const queryParams: any[] = [];

      if (status) {
        queryParams.push(status);
        queryText += ` AND status = $${queryParams.length}`;
      }

      queryText += ` ORDER BY issue_date DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
      queryParams.push(limit, offset);

      const countQuery = `
        SELECT COUNT(*) as total
        FROM bulletin_issue
        WHERE deleted_at IS NULL
        ${status ? `AND status = $1` : ''}
      `;

      const [dataResult, countResult] = await Promise.all([
        queryWithTenant<BulletinIssue>(tenantId, queryText, queryParams),
        queryWithTenant<{ total: string }>(tenantId, countQuery, status ? [status] : []),
      ]);

      return {
        bulletins: dataResult.rows.map((row) => ({
          id: row.id,
          tenantId: row.tenant_id,
          serviceDate: row.issue_date,
          status: row.status,
          brandPackId: row.brand_pack_id,
          pdfUrl: row.pdf_url,
          lockedAt: row.locked_at,
          lockedBy: row.locked_by,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        })),
        total: parseInt(countResult.rows[0].total, 10),
        limit,
        offset,
      };
    }),

  // Get single bulletin by ID
  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId!;

      const queryText = `
        SELECT
          id,
          tenant_id,
          issue_date,
          status,
          brand_pack_id,
          pdf_url,
          pdf_large_print_url,
          slides_json,
          locked_at,
          locked_by,
          content_hash,
          created_at,
          updated_at
        FROM bulletin_issue
        WHERE id = $1 AND deleted_at IS NULL
      `;

      const result = await queryWithTenant<BulletinIssue>(tenantId, queryText, [input.id]);

      if (result.rows.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Bulletin not found',
        });
      }

      const row = result.rows[0];
      return {
        id: row.id,
        tenantId: row.tenant_id,
        serviceDate: row.issue_date,
        status: row.status,
        brandPackId: row.brand_pack_id,
        pdfUrl: row.pdf_url,
        pdfLargePrintUrl: row.pdf_large_print_url,
        slidesJson: row.slides_json,
        lockedAt: row.locked_at,
        lockedBy: row.locked_by,
        contentHash: row.content_hash,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    }),

  // Create new bulletin issue
  create: protectedProcedure
    .input(
      z.object({
        serviceDate: z.string().datetime(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId!;
      const serviceDate = new Date(input.serviceDate);

      // Check if bulletin already exists for this date
      const existingQuery = `
        SELECT id FROM bulletin_issue
        WHERE issue_date = $1 AND deleted_at IS NULL
      `;

      const existing = await queryWithTenant(tenantId, existingQuery, [serviceDate]);

      if (existing.rows.length > 0) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Bulletin already exists for this service date',
        });
      }

      const insertQuery = `
        INSERT INTO bulletin_issue (
          tenant_id,
          issue_date,
          status
        ) VALUES ($1, $2, $3)
        RETURNING
          id,
          tenant_id,
          issue_date,
          status,
          created_at,
          updated_at
      `;

      const result = await queryWithTenant<BulletinIssue>(
        tenantId,
        insertQuery,
        [tenantId, serviceDate, 'draft']
      );

      const row = result.rows[0];
      return {
        id: row.id,
        tenantId: row.tenant_id,
        serviceDate: row.issue_date,
        status: row.status,
        lockedAt: null,
        lockedBy: null,
        pdfUrl: null,
        slidesUrl: null,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    }),

  // Update bulletin issue
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        serviceDate: z.string().datetime().optional(),
        status: BulletinStatusSchema.optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId!;

      // Check if bulletin is locked
      const lockCheckQuery = `
        SELECT status FROM bulletin_issue
        WHERE id = $1 AND deleted_at IS NULL
      `;

      const lockCheck = await queryWithTenant<{ status: string }>(
        tenantId,
        lockCheckQuery,
        [input.id]
      );

      if (lockCheck.rows.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Bulletin not found',
        });
      }

      if (lockCheck.rows[0].status === 'locked') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot update locked bulletin',
        });
      }

      const updateQuery = `
        UPDATE bulletin_issue
        SET status = COALESCE($2, status),
            issue_date = COALESCE($3, issue_date),
            updated_at = NOW()
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING id
      `;

      await queryWithTenant(
        tenantId,
        updateQuery,
        [input.id, input.status, input.serviceDate ? new Date(input.serviceDate) : null]
      );

      return { success: true };
    }),

  // Delete bulletin (soft delete)
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId!;

      // Check if bulletin is locked
      const lockCheckQuery = `
        SELECT status FROM bulletin_issue
        WHERE id = $1 AND deleted_at IS NULL
      `;

      const lockCheck = await queryWithTenant<{ status: string }>(
        tenantId,
        lockCheckQuery,
        [input.id]
      );

      if (lockCheck.rows.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Bulletin not found',
        });
      }

      if (lockCheck.rows[0].status === 'locked') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot delete locked bulletin',
        });
      }

      const deleteQuery = `
        UPDATE bulletin_issue
        SET deleted_at = NOW()
        WHERE id = $1 AND deleted_at IS NULL
      `;

      await queryWithTenant(tenantId, deleteQuery, [input.id]);

      return { success: true };
    }),

  // Lock bulletin (Admin only - requires re-auth in production)
  lock: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId!;
      const userId = ctx.userId; // Assumes userId is in context

      // Validate CCLI numbers using database function
      const validationQuery = `SELECT validate_ccli_for_lock($1) as valid`;
      const validationResult = await queryWithTenant<{ valid: boolean }>(
        tenantId,
        validationQuery,
        [input.id]
      );

      if (!validationResult.rows[0].valid) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'All songs must have CCLI numbers before locking',
        });
      }

      // Lock the bulletin
      const lockQuery = `
        UPDATE bulletin_issue
        SET status = 'locked',
            locked_at = NOW(),
            locked_by = $2,
            updated_at = NOW()
        WHERE id = $1 AND status != 'locked' AND deleted_at IS NULL
        RETURNING id
      `;

      const result = await queryWithTenant(tenantId, lockQuery, [input.id, userId]);

      if (result.rows.length === 0) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Bulletin is already locked or not found',
        });
      }

      return { success: true };
    }),
});
