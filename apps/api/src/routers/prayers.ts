import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { queryWithTenant } from '../db';
import { TRPCError } from '@trpc/server';

export const prayersRouter = router({
  // ============================================================================
  // PRAYER REQUESTS
  // ============================================================================

  list: protectedProcedure
    .input(
      z.object({
        status: z.enum(['active', 'answered', 'archived']).optional(),
        visibility: z.enum(['public', 'leaders_only', 'private']).optional(),
        personId: z.string().uuid().optional(),
        isUrgent: z.boolean().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      const { status, visibility, personId, isUrgent, limit, offset } = input;
      const tenantId = ctx.tenantId!;

      let queryText = `
        SELECT
          pr.*,
          p.first_name,
          p.last_name,
          (SELECT COUNT(*) FROM prayer_request_prayer WHERE prayer_request_id = pr.id) as prayer_count
        FROM prayer_request pr
        LEFT JOIN person p ON pr.person_id = p.id
        WHERE pr.deleted_at IS NULL
      `;
      const queryParams: any[] = [];

      if (status !== undefined) {
        queryParams.push(status);
        queryText += ` AND pr.status = $${queryParams.length}`;
      }

      if (visibility !== undefined) {
        queryParams.push(visibility);
        queryText += ` AND pr.visibility = $${queryParams.length}`;
      }

      if (personId !== undefined) {
        queryParams.push(personId);
        queryText += ` AND pr.person_id = $${queryParams.length}`;
      }

      if (isUrgent !== undefined) {
        queryParams.push(isUrgent);
        queryText += ` AND pr.is_urgent = $${queryParams.length}`;
      }

      queryText += ` ORDER BY pr.is_urgent DESC, pr.created_at DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
      queryParams.push(limit, offset);

      const result = await queryWithTenant(tenantId, queryText, queryParams);

      const countQuery = `
        SELECT COUNT(*) as total
        FROM prayer_request
        WHERE deleted_at IS NULL
        ${status !== undefined ? `AND status = $1` : ''}
        ${visibility !== undefined ? `AND visibility = $${status !== undefined ? 2 : 1}` : ''}
        ${personId !== undefined ? `AND person_id = $${(status !== undefined ? 1 : 0) + (visibility !== undefined ? 1 : 0) + 1}` : ''}
        ${isUrgent !== undefined ? `AND is_urgent = $${(status !== undefined ? 1 : 0) + (visibility !== undefined ? 1 : 0) + (personId !== undefined ? 1 : 0) + 1}` : ''}
      `;
      const countParams: any[] = [];
      if (status !== undefined) countParams.push(status);
      if (visibility !== undefined) countParams.push(visibility);
      if (personId !== undefined) countParams.push(personId);
      if (isUrgent !== undefined) countParams.push(isUrgent);

      const countResult = await queryWithTenant(tenantId, countQuery, countParams);

      return {
        requests: result.rows,
        total: parseInt(countResult.rows[0].total, 10),
      };
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId!;

      const result = await queryWithTenant(
        tenantId,
        `SELECT
          pr.*,
          p.first_name,
          p.last_name,
          p.email,
          p.phone
         FROM prayer_request pr
         LEFT JOIN person p ON pr.person_id = p.id
         WHERE pr.id = $1 AND pr.deleted_at IS NULL`,
        [input.id]
      );

      if (result.rows.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Prayer request not found' });
      }

      const request = result.rows[0];

      // Get prayers for this request
      const prayersResult = await queryWithTenant(
        tenantId,
        `SELECT
          prp.id,
          prp.person_id,
          prp.note,
          prp.prayed_at,
          p.first_name,
          p.last_name
         FROM prayer_request_prayer prp
         LEFT JOIN person p ON prp.person_id = p.id
         WHERE prp.prayer_request_id = $1
         ORDER BY prp.prayed_at DESC`,
        [input.id]
      );

      return {
        ...request,
        prayers: prayersResult.rows,
      };
    }),

  create: protectedProcedure
    .input(
      z.object({
        personId: z.string().uuid().optional(),
        requesterName: z.string().max(255).optional(),
        title: z.string().min(1).max(255),
        description: z.string().min(1),
        status: z.enum(['active', 'answered', 'archived']).default('active'),
        visibility: z.enum(['public', 'leaders_only', 'private']).default('public'),
        isUrgent: z.boolean().default(false),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId!;

      const result = await queryWithTenant(
        tenantId,
        `INSERT INTO prayer_request
          (person_id, requester_name, title, description, status, visibility, is_urgent)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [
          input.personId,
          input.requesterName,
          input.title,
          input.description,
          input.status,
          input.visibility,
          input.isUrgent,
        ]
      );

      return result.rows[0];
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        title: z.string().min(1).max(255).optional(),
        description: z.string().min(1).optional(),
        status: z.enum(['active', 'answered', 'archived']).optional(),
        visibility: z.enum(['public', 'leaders_only', 'private']).optional(),
        isUrgent: z.boolean().optional(),
        answerNote: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId!;
      const { id, ...updateData } = input;

      const setClauses: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (updateData.title) {
        setClauses.push(`title = $${paramIndex++}`);
        values.push(updateData.title);
      }
      if (updateData.description) {
        setClauses.push(`description = $${paramIndex++}`);
        values.push(updateData.description);
      }
      if (updateData.status) {
        setClauses.push(`status = $${paramIndex++}`);
        values.push(updateData.status);
        if (updateData.status === 'answered') {
          setClauses.push(`answered_at = NOW()`);
        }
      }
      if (updateData.visibility) {
        setClauses.push(`visibility = $${paramIndex++}`);
        values.push(updateData.visibility);
      }
      if (updateData.isUrgent !== undefined) {
        setClauses.push(`is_urgent = $${paramIndex++}`);
        values.push(updateData.isUrgent);
      }
      if (updateData.answerNote !== undefined) {
        setClauses.push(`answer_note = $${paramIndex++}`);
        values.push(updateData.answerNote);
      }

      if (setClauses.length === 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'No fields to update' });
      }

      values.push(id);
      const result = await queryWithTenant(
        tenantId,
        `UPDATE prayer_request SET ${setClauses.join(', ')} WHERE id = $${paramIndex} AND deleted_at IS NULL RETURNING id`,
        values
      );

      if (result.rows.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Prayer request not found' });
      }

      return result.rows[0];
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId!;

      const result = await queryWithTenant(
        tenantId,
        `UPDATE prayer_request SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING id`,
        [input.id]
      );

      if (result.rows.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Prayer request not found' });
      }

      return result.rows[0];
    }),

  // ============================================================================
  // PRAYERS (tracking who prayed)
  // ============================================================================

  recordPrayer: protectedProcedure
    .input(
      z.object({
        prayerRequestId: z.string().uuid(),
        personId: z.string().uuid().optional(),
        note: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const personId = input.personId || ctx.userId;
      const tenantId = ctx.tenantId!;

      if (!personId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Person ID required' });
      }

      // Check if user already prayed for this request
      const existing = await queryWithTenant(
        tenantId,
        `SELECT id FROM prayer_request_prayer
         WHERE prayer_request_id = $1 AND person_id = $2`,
        [input.prayerRequestId, personId]
      );

      if (existing.rows.length > 0) {
        // Update existing prayer
        const result = await queryWithTenant(
          tenantId,
          `UPDATE prayer_request_prayer
           SET note = $1, prayed_at = NOW()
           WHERE id = $2
           RETURNING id`,
          [input.note, existing.rows[0].id]
        );

        return result.rows[0];
      } else {
        // Create new prayer record
        const result = await queryWithTenant(
          tenantId,
          `INSERT INTO prayer_request_prayer (prayer_request_id, person_id, note)
           VALUES ($1, $2, $3)
           RETURNING id`,
          [input.prayerRequestId, personId, input.note]
        );

        return result.rows[0];
      }
    }),

  listPrayers: protectedProcedure
    .input(
      z.object({
        prayerRequestId: z.string().uuid(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId!;

      const result = await queryWithTenant(
        tenantId,
        `SELECT
          prp.id,
          prp.person_id,
          prp.note,
          prp.prayed_at,
          p.first_name,
          p.last_name,
          p.photo_url
         FROM prayer_request_prayer prp
         LEFT JOIN person p ON prp.person_id = p.id
         WHERE prp.prayer_request_id = $1
         ORDER BY prp.prayed_at DESC
         LIMIT $2 OFFSET $3`,
        [input.prayerRequestId, input.limit, input.offset]
      );

      const countResult = await queryWithTenant(
        tenantId,
        `SELECT COUNT(*) as total
         FROM prayer_request_prayer
         WHERE prayer_request_id = $1`,
        [input.prayerRequestId]
      );

      return {
        prayers: result.rows,
        total: parseInt(countResult.rows[0].total, 10),
      };
    }),

  // ============================================================================
  // STATISTICS
  // ============================================================================

  getStats: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = ctx.tenantId!;

    const activeResult = await queryWithTenant(
      tenantId,
      `SELECT COUNT(*) as count
       FROM prayer_request
       WHERE deleted_at IS NULL AND status = 'active'`,
      []
    );

    const answeredResult = await queryWithTenant(
      tenantId,
      `SELECT COUNT(*) as count
       FROM prayer_request
       WHERE deleted_at IS NULL AND status = 'answered'`,
      []
    );

    const urgentResult = await queryWithTenant(
      tenantId,
      `SELECT COUNT(*) as count
       FROM prayer_request
       WHERE deleted_at IS NULL AND status = 'active' AND is_urgent = true`,
      []
    );

    const totalPrayersResult = await queryWithTenant(
      tenantId,
      `SELECT COUNT(*) as count
       FROM prayer_request_prayer`,
      []
    );

    return {
      active: parseInt(activeResult.rows[0].count, 10),
      answered: parseInt(answeredResult.rows[0].count, 10),
      urgent: parseInt(urgentResult.rows[0].count, 10),
      total_prayers: parseInt(totalPrayersResult.rows[0].count, 10),
    };
  }),
});
