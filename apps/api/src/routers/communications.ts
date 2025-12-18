import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { queryWithTenant, QueryParam } from '../db';
import { TRPCError } from '@trpc/server';
import { pgCountToNumber } from '../lib/dbNumeric';

export const communicationsRouter = router({
  // ============================================================================
  // TEMPLATES
  // ============================================================================

  listTemplates: protectedProcedure
    .input(
      z.object({
        communicationType: z.enum(['email', 'sms', 'push']).optional(),
        isActive: z.boolean().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      const { communicationType, isActive, limit, offset } = input;
      const tenantId = ctx.tenantId!;

      let queryText = `
        SELECT *
        FROM communication_template
        WHERE deleted_at IS NULL
      `;
      const queryParams: QueryParam[] = [];

      if (communicationType !== undefined) {
        queryParams.push(communicationType);
        queryText += ` AND communication_type = $${queryParams.length}`;
      }

      if (isActive !== undefined) {
        queryParams.push(isActive);
        queryText += ` AND is_active = $${queryParams.length}`;
      }

      queryText += ` ORDER BY created_at DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
      queryParams.push(limit, offset);

      const result = await queryWithTenant(tenantId, queryText, queryParams);

      const countQuery = `
        SELECT COUNT(*) as total
        FROM communication_template
        WHERE deleted_at IS NULL
        ${communicationType !== undefined ? `AND communication_type = $1` : ''}
        ${isActive !== undefined ? `AND is_active = $${communicationType !== undefined ? 2 : 1}` : ''}
      `;
      const countParams: QueryParam[] = [];
      if (communicationType !== undefined) countParams.push(communicationType);
      if (isActive !== undefined) countParams.push(isActive);

      const countResult = await queryWithTenant(tenantId, countQuery, countParams);

      return {
        templates: result.rows,
        total: pgCountToNumber(countResult.rows[0].total),
      };
    }),

  getTemplate: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId!;

      const result = await queryWithTenant(
        tenantId,
        `SELECT * FROM communication_template WHERE id = $1 AND deleted_at IS NULL`,
        [input.id]
      );

      if (result.rows.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Template not found' });
      }

      return result.rows[0];
    }),

  createTemplate: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        description: z.string().optional(),
        communicationType: z.enum(['email', 'sms', 'push']),
        subject: z.string().max(255).optional(),
        body: z.string().min(1),
        variables: z.array(z.string()).optional(),
        isActive: z.boolean().default(true),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId!;
      const userId = ctx.userId!;

      const result = await queryWithTenant(
        tenantId,
        `INSERT INTO communication_template
          (name, description, communication_type, subject, body, variables, is_active, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id`,
        [
          input.name,
          input.description,
          input.communicationType,
          input.subject,
          input.body,
          input.variables ? JSON.stringify(input.variables) : null,
          input.isActive,
          userId,
        ]
      );

      return result.rows[0];
    }),

  updateTemplate: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        subject: z.string().max(255).optional(),
        body: z.string().min(1).optional(),
        variables: z.array(z.string()).optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId!;
      const { id, ...updateData } = input;

      const setClauses: string[] = [];
      const values: QueryParam[] = [];
      let paramIndex = 1;

      if (updateData.name) {
        setClauses.push(`name = $${paramIndex++}`);
        values.push(updateData.name);
      }
      if (updateData.description !== undefined) {
        setClauses.push(`description = $${paramIndex++}`);
        values.push(updateData.description);
      }
      if (updateData.subject !== undefined) {
        setClauses.push(`subject = $${paramIndex++}`);
        values.push(updateData.subject);
      }
      if (updateData.body) {
        setClauses.push(`body = $${paramIndex++}`);
        values.push(updateData.body);
      }
      if (updateData.variables) {
        setClauses.push(`variables = $${paramIndex++}`);
        values.push(JSON.stringify(updateData.variables));
      }
      if (updateData.isActive !== undefined) {
        setClauses.push(`is_active = $${paramIndex++}`);
        values.push(updateData.isActive);
      }

      if (setClauses.length === 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'No fields to update' });
      }

      values.push(id);
      const result = await queryWithTenant(
        tenantId,
        `UPDATE communication_template SET ${setClauses.join(', ')} WHERE id = $${paramIndex} AND deleted_at IS NULL RETURNING id`,
        values
      );

      if (result.rows.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Template not found' });
      }

      return result.rows[0];
    }),

  deleteTemplate: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId!;

      const result = await queryWithTenant(
        tenantId,
        `UPDATE communication_template SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING id`,
        [input.id]
      );

      if (result.rows.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Template not found' });
      }

      return result.rows[0];
    }),

  // ============================================================================
  // CAMPAIGNS
  // ============================================================================

  listCampaigns: protectedProcedure
    .input(
      z.object({
        status: z.enum(['draft', 'scheduled', 'sending', 'sent', 'failed', 'cancelled']).optional(),
        communicationType: z.enum(['email', 'sms', 'push']).optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      const { status, communicationType, limit, offset } = input;
      const tenantId = ctx.tenantId!;

      let queryText = `
        SELECT *
        FROM communication_campaign
        WHERE deleted_at IS NULL
      `;
      const queryParams: QueryParam[] = [];

      if (status !== undefined) {
        queryParams.push(status);
        queryText += ` AND status = $${queryParams.length}`;
      }

      if (communicationType !== undefined) {
        queryParams.push(communicationType);
        queryText += ` AND communication_type = $${queryParams.length}`;
      }

      queryText += ` ORDER BY created_at DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
      queryParams.push(limit, offset);

      const result = await queryWithTenant(tenantId, queryText, queryParams);

      const countQuery = `
        SELECT COUNT(*) as total
        FROM communication_campaign
        WHERE deleted_at IS NULL
        ${status !== undefined ? `AND status = $1` : ''}
        ${communicationType !== undefined ? `AND communication_type = $${status !== undefined ? 2 : 1}` : ''}
      `;
      const countParams: QueryParam[] = [];
      if (status !== undefined) countParams.push(status);
      if (communicationType !== undefined) countParams.push(communicationType);

      const countResult = await queryWithTenant(tenantId, countQuery, countParams);

      return {
        campaigns: result.rows,
        total: pgCountToNumber(countResult.rows[0].total),
      };
    }),

  getCampaign: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId!;

      const result = await queryWithTenant(
        tenantId,
        `SELECT * FROM communication_campaign WHERE id = $1 AND deleted_at IS NULL`,
        [input.id]
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
        templateId: z.string().uuid().optional(),
        communicationType: z.enum(['email', 'sms', 'push']),
        subject: z.string().max(255).optional(),
        body: z.string().min(1),
        status: z.enum(['draft', 'scheduled', 'sending', 'sent', 'failed', 'cancelled']).default('draft'),
        scheduledAt: z.string().optional(),
        audienceFilter: z.record(z.any()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId!;
      const userId = ctx.userId!;

      const result = await queryWithTenant(
        tenantId,
        `INSERT INTO communication_campaign
          (name, description, template_id, communication_type, subject, body, status, scheduled_at, audience_filter, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id`,
        [
          input.name,
          input.description,
          input.templateId,
          input.communicationType,
          input.subject,
          input.body,
          input.status,
          input.scheduledAt,
          input.audienceFilter ? JSON.stringify(input.audienceFilter) : null,
          userId,
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
        subject: z.string().max(255).optional(),
        body: z.string().min(1).optional(),
        status: z.enum(['draft', 'scheduled', 'sending', 'sent', 'failed', 'cancelled']).optional(),
        scheduledAt: z.string().optional(),
        audienceFilter: z.record(z.any()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId!;
      const { id, ...updateData } = input;

      const setClauses: string[] = [];
      const values: QueryParam[] = [];
      let paramIndex = 1;

      if (updateData.name) {
        setClauses.push(`name = $${paramIndex++}`);
        values.push(updateData.name);
      }
      if (updateData.description !== undefined) {
        setClauses.push(`description = $${paramIndex++}`);
        values.push(updateData.description);
      }
      if (updateData.subject !== undefined) {
        setClauses.push(`subject = $${paramIndex++}`);
        values.push(updateData.subject);
      }
      if (updateData.body) {
        setClauses.push(`body = $${paramIndex++}`);
        values.push(updateData.body);
      }
      if (updateData.status) {
        setClauses.push(`status = $${paramIndex++}`);
        values.push(updateData.status);
      }
      if (updateData.scheduledAt !== undefined) {
        setClauses.push(`scheduled_at = $${paramIndex++}`);
        values.push(updateData.scheduledAt);
      }
      if (updateData.audienceFilter) {
        setClauses.push(`audience_filter = $${paramIndex++}`);
        values.push(JSON.stringify(updateData.audienceFilter));
      }

      if (setClauses.length === 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'No fields to update' });
      }

      values.push(id);
      const result = await queryWithTenant(
        tenantId,
        `UPDATE communication_campaign SET ${setClauses.join(', ')} WHERE id = $${paramIndex} AND deleted_at IS NULL RETURNING id`,
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
      const tenantId = ctx.tenantId!;

      const result = await queryWithTenant(
        tenantId,
        `UPDATE communication_campaign SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING id`,
        [input.id]
      );

      if (result.rows.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Campaign not found' });
      }

      return result.rows[0];
    }),

  // ============================================================================
  // LOGS
  // ============================================================================

  listLogs: protectedProcedure
    .input(
      z.object({
        campaignId: z.string().uuid().optional(),
        personId: z.string().uuid().optional(),
        status: z.enum(['draft', 'scheduled', 'sending', 'sent', 'failed', 'cancelled']).optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      const { campaignId, personId, status, limit, offset } = input;
      const tenantId = ctx.tenantId!;

      let queryText = `
        SELECT *
        FROM communication_log
        WHERE 1=1
      `;
      const queryParams: QueryParam[] = [];

      if (campaignId !== undefined) {
        queryParams.push(campaignId);
        queryText += ` AND campaign_id = $${queryParams.length}`;
      }

      if (personId !== undefined) {
        queryParams.push(personId);
        queryText += ` AND person_id = $${queryParams.length}`;
      }

      if (status !== undefined) {
        queryParams.push(status);
        queryText += ` AND status = $${queryParams.length}`;
      }

      queryText += ` ORDER BY created_at DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
      queryParams.push(limit, offset);

      const result = await queryWithTenant(tenantId, queryText, queryParams);

      const countQuery = `
        SELECT COUNT(*) as total
        FROM communication_log
        WHERE 1=1
        ${campaignId !== undefined ? `AND campaign_id = $1` : ''}
        ${personId !== undefined ? `AND person_id = $${campaignId !== undefined ? 2 : 1}` : ''}
        ${status !== undefined ? `AND status = $${(campaignId !== undefined ? 1 : 0) + (personId !== undefined ? 1 : 0) + 1}` : ''}
      `;
      const countParams: QueryParam[] = [];
      if (campaignId !== undefined) countParams.push(campaignId);
      if (personId !== undefined) countParams.push(personId);
      if (status !== undefined) countParams.push(status);

      const countResult = await queryWithTenant(tenantId, countQuery, countParams);

      return {
        logs: result.rows,
        total: pgCountToNumber(countResult.rows[0].total),
      };
    }),

  getCampaignStats: protectedProcedure
    .input(z.object({ campaignId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId!;

      const result = await queryWithTenant(
        tenantId,
        `SELECT total_recipients, sent_count, delivered_count, failed_count, opened_count, clicked_count
         FROM communication_campaign
         WHERE id = $1 AND deleted_at IS NULL`,
        [input.campaignId]
      );

      if (result.rows.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Campaign not found' });
      }

      return result.rows[0];
    }),
});
