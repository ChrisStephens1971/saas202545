/**
 * Admin Tenant Plan Router
 *
 * Admin-only endpoints for viewing and updating tenant subscription plans.
 */

import { router, adminProcedure } from '../trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { logger } from '../utils/logger';
import { PlanId, TenantPlanInfo } from '@elder-first/types';
import {
  getTenantPlanInfo,
  applyPlanDefaultsToTenant,
  updateTenantPlan,
} from '../utils/planDefaults';

export const adminTenantPlanRouter = router({
  /**
   * Get plan info for the current tenant.
   *
   * Returns the tenant's current plan, plan defaults, current AI config,
   * and whether the config has been overridden from defaults.
   */
  getForCurrentTenant: adminProcedure.query(async ({ ctx }): Promise<TenantPlanInfo> => {
    try {
      logger.info('[Admin Tenant Plan] Getting plan info', { tenantId: ctx.tenantId });

      const planInfo = await getTenantPlanInfo(ctx);

      if (!planInfo) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Tenant not found',
        });
      }

      logger.info('[Admin Tenant Plan] Plan info retrieved', {
        tenantId: ctx.tenantId,
        plan: planInfo.plan,
        isOverridden: planInfo.isOverridden,
      });

      return planInfo;
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      logger.error('[Admin Tenant Plan] Failed to get plan info', { error, tenantId: ctx.tenantId });
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get tenant plan info',
      });
    }
  }),

  /**
   * Update the plan for the current tenant.
   *
   * Optionally applies the new plan's AI defaults.
   *
   * Input:
   *   - plan: The new plan ID (core, starter, standard, plus)
   *   - applyDefaults: Whether to reset AI config to plan defaults (default: true)
   */
  updatePlanForCurrentTenant: adminProcedure
    .input(
      z.object({
        plan: z.enum(['core', 'starter', 'standard', 'plus']),
        applyDefaults: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }): Promise<TenantPlanInfo> => {
      try {
        logger.info('[Admin Tenant Plan] Updating plan', {
          tenantId: ctx.tenantId,
          newPlan: input.plan,
          applyDefaults: input.applyDefaults,
        });

        const planInfo = await updateTenantPlan(ctx, input.plan as PlanId, input.applyDefaults);

        logger.info('[Admin Tenant Plan] Plan updated', {
          tenantId: ctx.tenantId,
          plan: planInfo.plan,
          isOverridden: planInfo.isOverridden,
        });

        return planInfo;
      } catch (error) {
        logger.error('[Admin Tenant Plan] Failed to update plan', {
          error,
          tenantId: ctx.tenantId,
          plan: input.plan,
        });
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update tenant plan',
        });
      }
    }),

  /**
   * Reset the current tenant's AI config to plan defaults.
   *
   * This does not change the plan, only resets the AI config to match
   * the current plan's defaults.
   */
  resetToDefaults: adminProcedure.mutation(async ({ ctx }): Promise<TenantPlanInfo> => {
    try {
      logger.info('[Admin Tenant Plan] Resetting to defaults', { tenantId: ctx.tenantId });

      const planInfo = await applyPlanDefaultsToTenant(ctx);

      logger.info('[Admin Tenant Plan] Reset to defaults complete', {
        tenantId: ctx.tenantId,
        plan: planInfo.plan,
      });

      return planInfo;
    } catch (error) {
      logger.error('[Admin Tenant Plan] Failed to reset to defaults', { error, tenantId: ctx.tenantId });
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to reset AI config to plan defaults',
      });
    }
  }),
});
