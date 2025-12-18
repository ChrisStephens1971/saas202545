import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { queryWithTenant, QueryParam } from '../db';
import { TRPCError } from '@trpc/server';
import { pgCountToNumber, pgDecimalToNumber } from '../lib/dbNumeric';

/** Row type for tax statement summary queries */
interface TaxStatementSummaryRow {
  person_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  envelope_number: string | null;
  total_amount: string | number;
  currency: string | null;
  donation_count: string | number;
  latest_delivery: { method: string; deliveredAt: string } | null;
}

/** Row type for person donation detail queries */
interface PersonDonationRow {
  id: string;
  amount: string | number;
  currency: string | null;
  donation_date: Date;
  donation_method: string | null;
  check_number: string | null;
  fund_name: string | null;
}

/** Row type for tax statement delivery records */
interface TaxStatementDeliveryRow {
  id: string;
  person_id: string;
  year: number;
  method: string;
  destination: string | null;
  delivered_at: Date;
  notes: string | null;
  created_at: Date;
}

/** Row type for CSV export queries */
interface DonationExportRow {
  person_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  total_amount: string | number;
  currency: string | null;
  donation_count: string | number;
}

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

      const queryParams: QueryParam[] = [];

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
        total: pgCountToNumber(countResult.rows[0].total),
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
      const values: QueryParam[] = [id];
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

      const queryParams: QueryParam[] = [];

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
      const countParams: QueryParam[] = [];
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
        total: pgCountToNumber(countResult.rows[0].total),
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
      const values: QueryParam[] = [id];
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

  // ============================================================================
  // TAX STATEMENTS
  // ============================================================================

  // Get tax summary for a specific person and year
  getTaxSummaryByPerson: protectedProcedure
    .input(
      z.object({
        personId: z.string().uuid(),
        year: z.number().int().min(2000).max(2100),
        includeFundBreakdown: z.boolean().default(true),
      })
    )
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId!;

      const result = await queryWithTenant(
        tenantId,
        `SELECT * FROM get_tax_summary_by_person($1::uuid, $2::uuid, $3, $4)`,
        [tenantId, input.personId, input.year, input.includeFundBreakdown]
      );

      if (result.rows.length === 0 || result.rows[0].total_amount === null) {
        return {
          personId: input.personId,
          year: input.year,
          totalAmount: 0,
          currency: 'USD',
          fundBreakdown: [],
        };
      }

      const row = result.rows[0];
      return {
        personId: row.person_id,
        year: row.year,
        totalAmount: parseFloat(row.total_amount || 0),
        currency: row.currency || 'USD',
        fundBreakdown: row.fund_breakdown || [],
      };
    }),

  // Get tax summaries for all givers in a year
  getTaxSummariesForYear: protectedProcedure
    .input(
      z.object({
        year: z.number().int().min(2000).max(2100),
      })
    )
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId!;

      // Get tax summaries with optional latest delivery info
      const result = await queryWithTenant<TaxStatementSummaryRow>(
        tenantId,
        `SELECT
           p.id as person_id,
           p.first_name,
           p.last_name,
           p.email,
           p.envelope_number,
           COALESCE(SUM(d.amount), 0) as total_amount,
           'USD' as currency,
           COUNT(d.id) as donation_count,
           (
             SELECT json_build_object(
               'method', tsd.method,
               'deliveredAt', tsd.delivered_at
             )
             FROM tax_statement_delivery tsd
             WHERE tsd.person_id = p.id
               AND tsd.year = $2
             ORDER BY tsd.delivered_at DESC
             LIMIT 1
           ) as latest_delivery
         FROM person p
         LEFT JOIN donation d ON d.person_id = p.id
           AND d.status = 'completed'
           AND d.deleted_at IS NULL
           AND d.is_tax_deductible = true
           AND EXTRACT(YEAR FROM d.donation_date) = $2
         WHERE p.deleted_at IS NULL
         GROUP BY p.id, p.first_name, p.last_name, p.email, p.envelope_number
         HAVING COUNT(d.id) > 0
         ORDER BY p.last_name, p.first_name`,
        [tenantId, input.year]
      );

      // Calculate grand total for all summaries
      const grandTotal = result.rows.reduce((acc, row) =>
        acc + (parseFloat(String(row.total_amount)) || 0), 0
      );

      return {
        summaries: result.rows.map((row) => ({
          personId: row.person_id,
          firstName: row.first_name,
          lastName: row.last_name,
          email: row.email,
          envelopeNumber: row.envelope_number,
          totalAmount: pgDecimalToNumber(row.total_amount),
          currency: row.currency || 'USD',
          donationCount: pgCountToNumber(row.donation_count),
          latestDelivery: row.latest_delivery ? {
            method: row.latest_delivery.method,
            deliveredAt: row.latest_delivery.deliveredAt,
          } : null,
        })),
        year: input.year,
        totalAmount: grandTotal,
      };
    }),

  // Get tax statement for a person (with donation details)
  getTaxStatementForPerson: protectedProcedure
    .input(
      z.object({
        personId: z.string().uuid(),
        year: z.number().int().min(2000).max(2100),
      })
    )
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId!;

      // Get person info
      const personResult = await queryWithTenant(
        tenantId,
        `SELECT id, first_name, last_name, email, address, city, state, postal_code, envelope_number
         FROM person
         WHERE id = $1 AND deleted_at IS NULL`,
        [input.personId]
      );

      if (personResult.rows.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Person not found' });
      }

      const person = personResult.rows[0];

      // Get tax summary
      const summaryResult = await queryWithTenant(
        tenantId,
        `SELECT * FROM get_tax_summary_by_person($1::uuid, $2::uuid, $3, true)`,
        [tenantId, input.personId, input.year]
      );

      // Get individual donations for the year
      const donationsResult = await queryWithTenant<PersonDonationRow>(
        tenantId,
        `SELECT
           d.id,
           d.amount,
           d.currency,
           d.donation_date,
           d.donation_method,
           d.check_number,
           f.name as fund_name
         FROM donation d
         LEFT JOIN fund f ON d.fund_id = f.id
         WHERE d.person_id = $1
           AND d.is_tax_deductible = true
           AND d.status = 'completed'
           AND d.deleted_at IS NULL
           AND EXTRACT(YEAR FROM d.donation_date) = $2
         ORDER BY d.donation_date`,
        [input.personId, input.year]
      );

      const summary = summaryResult.rows[0] || { total_amount: 0, fund_breakdown: [] };

      // Get org branding for tax statement header
      const brandResult = await queryWithTenant(
        tenantId,
        `SELECT church_name, legal_name, address, city, state, postal_code, phone, email, ein, logo_url, tax_statement_footer
         FROM brand_pack
         WHERE is_active = true
         LIMIT 1`,
        []
      );

      const brand = brandResult.rows[0] || {};

      return {
        person: {
          id: person.id,
          firstName: person.first_name,
          lastName: person.last_name,
          email: person.email,
          address: person.address,
          city: person.city,
          state: person.state,
          postalCode: person.postal_code,
          envelopeNumber: person.envelope_number,
        },
        fullName: `${person.first_name || ''} ${person.last_name || ''}`.trim(),
        email: person.email,
        envelopeNumber: person.envelope_number,
        year: input.year,
        totalAmount: parseFloat(summary.total_amount || 0),
        currency: summary.currency || 'USD',
        fundBreakdown: summary.fund_breakdown || [],
        donationCount: donationsResult.rows.length,
        orgBranding: {
          churchName: brand.church_name || '',
          legalName: brand.legal_name || brand.church_name || '',
          address: brand.address || '',
          addressLine1: brand.address || '',
          addressLine2: '',
          city: brand.city || '',
          state: brand.state || '',
          postalCode: brand.postal_code || '',
          country: 'USA',
          phone: brand.phone || '',
          email: brand.email || '',
          ein: brand.ein || '',
          logoUrl: brand.logo_url || null,
          taxStatementFooter: brand.tax_statement_footer || 'No goods or services were provided in exchange for these contributions.',
        },
        donations: donationsResult.rows.map((row) => ({
          id: row.id,
          amount: parseFloat(String(row.amount)) || 0,
          currency: row.currency || 'USD',
          date: row.donation_date,
          method: row.donation_method,
          checkNumber: row.check_number,
          fundName: row.fund_name,
        })),
      };
    }),

  // Get delivery history for a person's tax statements
  getTaxStatementDeliveryHistory: protectedProcedure
    .input(
      z.object({
        personId: z.string().uuid(),
        year: z.number().int().min(2000).max(2100).optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId!;

      let queryText = `
        SELECT
          tsd.id,
          tsd.person_id,
          tsd.year,
          tsd.method,
          tsd.destination,
          tsd.delivered_at,
          tsd.notes,
          tsd.created_at
        FROM tax_statement_delivery tsd
        WHERE tsd.tenant_id = $1 AND tsd.person_id = $2
      `;

      const params: (string | number)[] = [tenantId, input.personId];

      if (input.year) {
        queryText += ` AND tsd.year = $3`;
        params.push(input.year);
      }

      queryText += ` ORDER BY tsd.delivered_at DESC`;

      const result = await queryWithTenant<TaxStatementDeliveryRow>(tenantId, queryText, params);

      // Return array directly (frontend expects this)
      return result.rows.map((row) => ({
        id: row.id,
        personId: row.person_id,
        year: row.year,
        method: row.method,
        destination: row.destination,
        deliveredAt: row.delivered_at,
        notes: row.notes,
        createdAt: row.created_at,
      }));
    }),

  // Log a tax statement delivery
  logTaxStatementDelivery: protectedProcedure
    .input(
      z.object({
        personId: z.string().uuid(),
        year: z.number().int().min(2000).max(2100),
        method: z.enum(['printed', 'emailed', 'other']),
        destination: z.string().max(255).optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId!;
      const userId = ctx.userId;

      const result = await queryWithTenant(
        tenantId,
        `INSERT INTO tax_statement_delivery (
          tenant_id, person_id, year, method, destination, created_by, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *`,
        [
          tenantId,
          input.personId,
          input.year,
          input.method,
          input.destination || null,
          userId || null,
          input.notes || null,
        ]
      );

      const row = result.rows[0];
      return {
        id: row.id,
        personId: row.person_id,
        year: row.year,
        method: row.method,
        destination: row.destination,
        deliveredAt: row.delivered_at,
        notes: row.notes,
        createdAt: row.created_at,
      };
    }),

  // Export tax summaries as CSV (returns CSV string)
  exportTaxSummariesCsv: protectedProcedure
    .input(
      z.object({
        year: z.number().int().min(2000).max(2100),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId!;

      const result = await queryWithTenant<DonationExportRow>(
        tenantId,
        `SELECT * FROM get_tax_summaries_for_year($1::uuid, $2)`,
        [tenantId, input.year]
      );

      // Build CSV content
      const headers = ['Person ID', 'First Name', 'Last Name', 'Email', 'Total Amount', 'Currency', 'Donation Count'];
      const rows = result.rows.map((row) => [
        row.person_id,
        row.first_name || '',
        row.last_name || '',
        row.email || '',
        parseFloat(String(row.total_amount)) || 0,
        row.currency || 'USD',
        row.donation_count,
      ]);

      // Escape CSV fields
      const escapeField = (field: unknown): string => {
        const str = String(field);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const csvContent = [
        headers.join(','),
        ...rows.map((row) => row.map(escapeField).join(',')),
      ].join('\n');

      return {
        csv: csvContent,
        filename: `tax-summaries-${input.year}.csv`,
        year: input.year,
        recordCount: result.rows.length,
        generatedAt: new Date().toISOString(),
      };
    }),
});
