/**
 * Admin AI Usage Router
 *
 * Admin-only endpoints for viewing AI usage statistics and costs.
 *
 * SECURITY FIX (C8): Enforces tenant isolation
 * - Tenant admins can only view their own tenant's AI usage
 * - tenantId parameter removed to prevent cross-tenant data access
 *
 * See: docs/SECURITY-AUDIT-2025-12-04.md (C8)
 */

import { router, adminProcedure } from '../trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { db } from '../db';
import { logger } from '../utils/logger';
import { aggregateAiUsage, AiUsageSummary } from '../utils/aiUsageAggregation';
import { getAiQuotaStatusForTenant } from '../utils/aiQuota';
import { AiQuotaStatus } from '@elder-first/types';

export const adminAiUsageRouter = router({
  /**
   * Get AI usage summary for a date range.
   *
   * Returns aggregated usage by tenant and feature, including estimated costs.
   * Admin-only endpoint.
   *
   * SECURITY FIX (C8): Removed tenantId parameter to enforce tenant isolation.
   * Tenant admins can only view their own tenant's usage data.
   *
   * Input:
   *   - from: ISO date string (start of range, inclusive)
   *   - to: ISO date string (end of range, exclusive)
   *
   * Response:
   *   - from/to: Date range
   *   - rows: Array of { tenantId, feature, calls, tokensIn, tokensOut, costInUSD }
   *   - totals: Aggregate totals
   *   - unknownModels: Models found without pricing configuration
   */
  summary: adminProcedure
    .input(
      z.object({
        from: z.string().refine((val) => !isNaN(Date.parse(val)), {
          message: 'from must be a valid ISO date string',
        }),
        to: z.string().refine((val) => !isNaN(Date.parse(val)), {
          message: 'to must be a valid ISO date string',
        }),
        // SECURITY FIX (C8): Removed tenantId parameter - use ctx.tenantId from auth
        // If cross-tenant access is needed in future, use platformAdminProcedure
      })
    )
    .query(async ({ input, ctx }): Promise<AiUsageSummary> => {
      try {
        const fromDate = new Date(input.from);
        const toDate = new Date(input.to);

        // Validate date range
        if (fromDate >= toDate) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: '"from" date must be before "to" date',
          });
        }

        // Limit date range to prevent excessive queries (max 1 year)
        const oneYear = 365 * 24 * 60 * 60 * 1000;
        if (toDate.getTime() - fromDate.getTime() > oneYear) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Date range cannot exceed 1 year',
          });
        }

        // SECURITY FIX (C8): Always use ctx.tenantId from auth, not user input
        const tenantId = ctx.tenantId!;

        logger.info('[Admin AI Usage] Generating summary', {
          from: input.from,
          to: input.to,
          tenantId,
        });

        const summary = await aggregateAiUsage(db, {
          from: fromDate,
          to: toDate,
          tenantId, // SECURITY FIX (C8): Always filter by authenticated tenant
        });

        logger.info('[Admin AI Usage] Summary generated', {
          rowCount: summary.rows.length,
          totalCalls: summary.totals.calls,
          totalCost: summary.totals.costInUSD,
        });

        return summary;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        logger.error('[Admin AI Usage] Failed to generate summary', { error });
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to generate AI usage summary',
        });
      }
    }),

  /**
   * Get quick stats for the current month.
   *
   * Convenience endpoint that returns usage for the current calendar month.
   *
   * SECURITY FIX (C8): Enforces tenant isolation - only returns current tenant's usage.
   */
  currentMonth: adminProcedure.query(async ({ ctx }): Promise<AiUsageSummary> => {
    try {
      const now = new Date();
      const fromDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const toDate = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);

      // SECURITY FIX (C8): Always filter by authenticated tenant
      const tenantId = ctx.tenantId!;

      logger.info('[Admin AI Usage] Generating current month summary', { tenantId });

      const summary = await aggregateAiUsage(db, {
        from: fromDate,
        to: toDate,
        tenantId, // SECURITY FIX (C8): Always filter by authenticated tenant
      });

      return summary;
    } catch (error) {
      logger.error('[Admin AI Usage] Failed to generate current month summary', { error });
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to generate AI usage summary',
      });
    }
  }),

  /**
   * Get AI quota status for the current tenant.
   *
   * Returns the tenant's AI configuration and current usage vs limit.
   *
   * Response:
   *   - enabled: Whether AI is enabled for this tenant
   *   - limitTokens: Monthly token limit (null = no limit)
   *   - usedTokens: Tokens used this month
   *   - remainingTokens: Tokens remaining (null if no limit)
   *   - overLimit: Whether the tenant has exceeded their limit
   */
  quotaForCurrentTenant: adminProcedure.query(async ({ ctx }): Promise<AiQuotaStatus> => {
    try {
      logger.info('[Admin AI Usage] Getting quota status for tenant', { tenantId: ctx.tenantId });

      const quota = await getAiQuotaStatusForTenant(ctx);

      logger.info('[Admin AI Usage] Quota status retrieved', {
        tenantId: ctx.tenantId,
        enabled: quota.enabled,
        limitTokens: quota.limitTokens,
        usedTokens: quota.usedTokens,
        overLimit: quota.overLimit,
      });

      return quota;
    } catch (error) {
      logger.error('[Admin AI Usage] Failed to get quota status', { error, tenantId: ctx.tenantId });
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get AI quota status',
      });
    }
  }),
});
