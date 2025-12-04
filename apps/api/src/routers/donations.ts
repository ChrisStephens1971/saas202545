import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { queryWithTenant } from '../db';
import { TRPCError } from '@trpc/server';

export const donationsRouter = router({
  // ============================================================================
  // CAMPAIGNS
  // ============================================================================

  listCampaigns: protectedProcedure
    .input(
      z.object({
        isActive: z.boolean().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      const { isActive, limit, offset } = input;
      const tenantId = ctx.tenantId!;

      let queryText = `
        SELECT
          dc.*,
          COALESCE(SUM(d.amount), 0) as total_raised,
          COUNT(d.id) as donation_count
        FROM donation_campaign dc
        LEFT JOIN donation d ON dc.id = d.campaign_id AND d.status = 'completed' AND d.deleted_at IS NULL
        WHERE dc.deleted_at IS NULL
      `;

      const queryParams: any[] = [];

      if (isActive !== undefined) {
        queryParams.push(isActive);
        queryText += ` AND dc.is_active = $${queryParams.length}`;
      }

      queryText += ` GROUP BY dc.id ORDER BY dc.created_at DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
      queryParams.push(limit, offset);

      const result = await queryWithTenant(tenantId, queryText, queryParams);

      const countQuery = `
        SELECT COUNT(*) as total
        FROM donation_campaign
        WHERE deleted_at IS NULL
        ${isActive !== undefined ? `AND is_active = $1` : ''}
      `;
      const countResult = await queryWithTenant(
        tenantId,
        countQuery,
        isActive !== undefined ? [isActive] : []
      );

      return {
        campaigns: result.rows,
        total: parseInt(countResult.rows[0].total, 10),
      };
    }),

  getCampaign: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const { id } = input;
      const tenantId = ctx.tenantId!;

      const result = await queryWithTenant(
        tenantId,
        `SELECT
          dc.*,
          COALESCE(SUM(d.amount), 0) as total_raised,
          COUNT(d.id) as donation_count
        FROM donation_campaign dc
        LEFT JOIN donation d ON dc.id = d.campaign_id AND d.status = 'completed' AND d.deleted_at IS NULL
        WHERE dc.id = $1 AND dc.deleted_at IS NULL
        GROUP BY dc.id`,
        [id]
      );

      if (result.rows.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Campaign not found' });
      }

      return result.rows[0];
    }),

  createCampaign: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        description: z.string().optional(),
        goalAmount: z.number().positive().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        isActive: z.boolean().default(true),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId!;

      const result = await queryWithTenant(
        tenantId,
        `INSERT INTO donation_campaign (
          tenant_id, name, description, goal_amount, start_date, end_date, is_active, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [
          tenantId,
          input.name,
          input.description || null,
          input.goalAmount || null,
          input.startDate || null,
          input.endDate || null,
          input.isActive,
          ctx.userId || null,
        ]
      );

      return result.rows[0];
    }),

  updateCampaign: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        goalAmount: z.number().positive().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...updates } = input;
      const tenantId = ctx.tenantId!;

      const setClauses: string[] = [];
      const values: any[] = [id];
      let paramIndex = 2;

      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined) {
          const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
          setClauses.push(`${snakeKey} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
      });

      if (setClauses.length === 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'No fields to update' });
      }

      const result = await queryWithTenant(
        tenantId,
        `UPDATE donation_campaign
        SET ${setClauses.join(', ')}
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Campaign not found' });
      }

      return result.rows[0];
    }),

  deleteCampaign: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const { id } = input;
      const tenantId = ctx.tenantId!;

      const result = await queryWithTenant(
        tenantId,
        `UPDATE donation_campaign
        SET deleted_at = NOW()
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING id`,
        [id]
      );

      if (result.rows.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Campaign not found' });
      }

      return { success: true };
    }),

  // ============================================================================
  // DONATIONS
  // ============================================================================

  list: protectedProcedure
    .input(
      z.object({
        personId: z.string().uuid().optional(),
        campaignId: z.string().uuid().optional(),
        status: z.enum(['pending', 'completed', 'failed', 'refunded', 'cancelled']).optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      const { personId, campaignId, status, startDate, endDate, limit, offset } = input;
      const tenantId = ctx.tenantId!;

      let queryText = `
        SELECT
          d.*,
          p.first_name,
          p.last_name,
          p.email,
          dc.name as campaign_name
        FROM donation d
        LEFT JOIN person p ON d.person_id = p.id
        LEFT JOIN donation_campaign dc ON d.campaign_id = dc.id
        WHERE d.deleted_at IS NULL
      `;

      const queryParams: any[] = [];

      if (personId) {
        queryParams.push(personId);
        queryText += ` AND d.person_id = $${queryParams.length}`;
      }

      if (campaignId) {
        queryParams.push(campaignId);
        queryText += ` AND d.campaign_id = $${queryParams.length}`;
      }

      if (status) {
        queryParams.push(status);
        queryText += ` AND d.status = $${queryParams.length}`;
      }

      if (startDate) {
        queryParams.push(startDate);
        queryText += ` AND d.donation_date >= $${queryParams.length}`;
      }

      if (endDate) {
        queryParams.push(endDate);
        queryText += ` AND d.donation_date <= $${queryParams.length}`;
      }

      queryText += ` ORDER BY d.donation_date DESC, d.created_at DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
      queryParams.push(limit, offset);

      const result = await queryWithTenant(tenantId, queryText, queryParams);

      // Build count query
      let countQuery = `
        SELECT COUNT(*) as total
        FROM donation
        WHERE deleted_at IS NULL
      `;
      const countParams: any[] = [];
      let countParamIndex = 1;

      if (personId) {
        countParams.push(personId);
        countQuery += ` AND person_id = $${countParamIndex++}`;
      }
      if (campaignId) {
        countParams.push(campaignId);
        countQuery += ` AND campaign_id = $${countParamIndex++}`;
      }
      if (status) {
        countParams.push(status);
        countQuery += ` AND status = $${countParamIndex++}`;
      }
      if (startDate) {
        countParams.push(startDate);
        countQuery += ` AND donation_date >= $${countParamIndex++}`;
      }
      if (endDate) {
        countParams.push(endDate);
        countQuery += ` AND donation_date <= $${countParamIndex++}`;
      }

      const countResult = await queryWithTenant(tenantId, countQuery, countParams);

      return {
        donations: result.rows,
        total: parseInt(countResult.rows[0].total, 10),
      };
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const { id } = input;
      const tenantId = ctx.tenantId!;

      const result = await queryWithTenant(
        tenantId,
        `SELECT
          d.*,
          p.first_name,
          p.last_name,
          p.email,
          dc.name as campaign_name
        FROM donation d
        LEFT JOIN person p ON d.person_id = p.id
        LEFT JOIN donation_campaign dc ON d.campaign_id = dc.id
        WHERE d.id = $1 AND d.deleted_at IS NULL`,
        [id]
      );

      if (result.rows.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Donation not found' });
      }

      return result.rows[0];
    }),

  create: protectedProcedure
    .input(
      z.object({
        personId: z.string().uuid().optional(),
        donorName: z.string().max(255).optional(),
        donorEmail: z.string().email().optional(),
        amount: z.number().positive(),
        donationMethod: z.enum(['cash', 'check', 'credit_card', 'debit_card', 'bank_transfer', 'online', 'other']),
        donationFrequency: z.enum(['one_time', 'weekly', 'monthly', 'quarterly', 'yearly']).default('one_time'),
        status: z.enum(['pending', 'completed', 'failed', 'refunded', 'cancelled']).default('completed'),
        campaignId: z.string().uuid().optional(),
        fundName: z.string().max(255).optional(),
        donationDate: z.string().optional(),
        transactionId: z.string().max(255).optional(),
        checkNumber: z.string().max(50).optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId!;

      const result = await queryWithTenant(
        tenantId,
        `INSERT INTO donation (
          tenant_id, person_id, donor_name, donor_email, amount,
          donation_method, donation_frequency, status, campaign_id, fund_name,
          donation_date, transaction_id, check_number, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *`,
        [
          tenantId,
          input.personId || null,
          input.donorName || null,
          input.donorEmail || null,
          input.amount,
          input.donationMethod,
          input.donationFrequency,
          input.status,
          input.campaignId || null,
          input.fundName || null,
          input.donationDate || new Date().toISOString().split('T')[0],
          input.transactionId || null,
          input.checkNumber || null,
          input.notes || null,
        ]
      );

      return result.rows[0];
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        amount: z.number().positive().optional(),
        status: z.enum(['pending', 'completed', 'failed', 'refunded', 'cancelled']).optional(),
        notes: z.string().optional(),
        receiptSent: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...updates } = input;
      const tenantId = ctx.tenantId!;

      const setClauses: string[] = [];
      const values: any[] = [id];
      let paramIndex = 2;

      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined) {
          const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
          setClauses.push(`${snakeKey} = $${paramIndex}`);

          // Special handling for receiptSent
          if (key === 'receiptSent' && value === true) {
            values.push(value);
            paramIndex++;
            setClauses.push(`receipt_sent_at = NOW()`);
          } else {
            values.push(value);
            paramIndex++;
          }
        }
      });

      if (setClauses.length === 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'No fields to update' });
      }

      const result = await queryWithTenant(
        tenantId,
        `UPDATE donation
        SET ${setClauses.join(', ')}
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Donation not found' });
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
        `UPDATE donation
        SET deleted_at = NOW()
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING id`,
        [id]
      );

      if (result.rows.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Donation not found' });
      }

      return { success: true };
    }),

  // ============================================================================
  // STATS & REPORTS
  // ============================================================================

  getStats: protectedProcedure
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId!;
      const startDate = input.startDate || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
      const endDate = input.endDate || new Date().toISOString().split('T')[0];

      const result = await queryWithTenant(
        tenantId,
        `SELECT * FROM get_donation_stats($1, $2, $3)`,
        [tenantId, startDate, endDate]
      );

      return result.rows[0];
    }),

  getMonthlyStats: protectedProcedure
    .input(
      z.object({
        year: z.number().int().min(2000).max(2100),
      })
    )
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId!;

      const result = await queryWithTenant(
        tenantId,
        `SELECT
          EXTRACT(MONTH FROM donation_date) as month,
          COALESCE(SUM(amount), 0) as total_amount,
          COUNT(*) as donation_count
        FROM donation
        WHERE deleted_at IS NULL
          AND status = 'completed'
          AND EXTRACT(YEAR FROM donation_date) = $1
        GROUP BY EXTRACT(MONTH FROM donation_date)
        ORDER BY month`,
        [input.year]
      );

      return result.rows;
    }),
});
