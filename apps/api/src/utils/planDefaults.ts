/**
 * Plan Defaults Utility
 *
 * Helpers for applying plan defaults to tenant AI configuration.
 */

import { db } from '../db';
import { Context } from '../context';
import { logger } from './logger';
import { PlanId, TenantPlanInfo } from '@elder-first/types';
import { getPlanAiDefaults } from '../config/planAiConfig';

/**
 * Tenant plan row from database
 */
interface TenantPlanRow {
  plan: string;
  ai_enabled: boolean;
  ai_monthly_token_limit: number | null;
}

/**
 * Get tenant plan info including current config and whether it's overridden.
 *
 * @param ctx - The request context containing tenantId
 * @returns The tenant's plan info
 */
export async function getTenantPlanInfo(ctx: Context): Promise<TenantPlanInfo | null> {
  const tenantId = ctx.tenantId;

  if (!tenantId) {
    logger.warn('[Plan Defaults] No tenantId in context');
    return null;
  }

  try {
    const result = await db.query<TenantPlanRow>(
      `SELECT plan, ai_enabled, ai_monthly_token_limit
       FROM tenant
       WHERE id = $1 AND deleted_at IS NULL`,
      [tenantId]
    );

    if (result.rows.length === 0) {
      logger.warn('[Plan Defaults] Tenant not found', { tenantId });
      return null;
    }

    const row = result.rows[0];
    const planId = row.plan as PlanId;
    const planDefaults = getPlanAiDefaults(planId);

    // Determine if current config differs from plan defaults
    const isOverridden =
      row.ai_enabled !== planDefaults.aiEnabled ||
      row.ai_monthly_token_limit !== planDefaults.aiLimitTokens;

    return {
      plan: planId,
      planDefaults,
      currentConfig: {
        aiEnabled: row.ai_enabled,
        aiMonthlyTokenLimit: row.ai_monthly_token_limit,
      },
      isOverridden,
    };
  } catch (error) {
    logger.error('[Plan Defaults] Failed to get tenant plan info', { error, tenantId });
    throw error;
  }
}

/**
 * Apply plan defaults to a tenant's AI configuration.
 *
 * This resets the tenant's AI config to match their plan defaults.
 *
 * @param ctx - The request context containing tenantId
 * @returns The updated tenant plan info
 */
export async function applyPlanDefaultsToTenant(ctx: Context): Promise<TenantPlanInfo> {
  const tenantId = ctx.tenantId;

  if (!tenantId) {
    throw new Error('No tenantId in context');
  }

  try {
    // Get current plan
    const planResult = await db.query<{ plan: string }>(
      `SELECT plan FROM tenant WHERE id = $1 AND deleted_at IS NULL`,
      [tenantId]
    );

    if (planResult.rows.length === 0) {
      throw new Error('Tenant not found');
    }

    const planId = planResult.rows[0].plan as PlanId;
    const defaults = getPlanAiDefaults(planId);

    logger.info('[Plan Defaults] Applying plan defaults to tenant', {
      tenantId,
      planId,
      aiEnabled: defaults.aiEnabled,
      aiLimitTokens: defaults.aiLimitTokens,
    });

    // Update tenant with plan defaults
    await db.query(
      `UPDATE tenant
       SET ai_enabled = $2,
           ai_monthly_token_limit = $3,
           updated_at = NOW()
       WHERE id = $1`,
      [tenantId, defaults.aiEnabled, defaults.aiLimitTokens]
    );

    return {
      plan: planId,
      planDefaults: defaults,
      currentConfig: {
        aiEnabled: defaults.aiEnabled,
        aiMonthlyTokenLimit: defaults.aiLimitTokens,
      },
      isOverridden: false,
    };
  } catch (error) {
    logger.error('[Plan Defaults] Failed to apply plan defaults', { error, tenantId });
    throw error;
  }
}

/**
 * Update a tenant's plan and optionally apply defaults.
 *
 * @param ctx - The request context containing tenantId
 * @param newPlanId - The new plan to set
 * @param applyDefaults - Whether to also update AI config to match new plan defaults
 * @returns The updated tenant plan info
 */
export async function updateTenantPlan(
  ctx: Context,
  newPlanId: PlanId,
  applyDefaults: boolean = true
): Promise<TenantPlanInfo> {
  const tenantId = ctx.tenantId;

  if (!tenantId) {
    throw new Error('No tenantId in context');
  }

  try {
    const defaults = getPlanAiDefaults(newPlanId);

    logger.info('[Plan Defaults] Updating tenant plan', {
      tenantId,
      newPlanId,
      applyDefaults,
    });

    if (applyDefaults) {
      // Update plan and AI config together
      await db.query(
        `UPDATE tenant
         SET plan = $2,
             ai_enabled = $3,
             ai_monthly_token_limit = $4,
             updated_at = NOW()
         WHERE id = $1`,
        [tenantId, newPlanId, defaults.aiEnabled, defaults.aiLimitTokens]
      );

      return {
        plan: newPlanId,
        planDefaults: defaults,
        currentConfig: {
          aiEnabled: defaults.aiEnabled,
          aiMonthlyTokenLimit: defaults.aiLimitTokens,
        },
        isOverridden: false,
      };
    } else {
      // Only update plan, keep existing AI config
      const result = await db.query<TenantPlanRow>(
        `UPDATE tenant
         SET plan = $2,
             updated_at = NOW()
         WHERE id = $1
         RETURNING plan, ai_enabled, ai_monthly_token_limit`,
        [tenantId, newPlanId]
      );

      const row = result.rows[0];
      const isOverridden =
        row.ai_enabled !== defaults.aiEnabled ||
        row.ai_monthly_token_limit !== defaults.aiLimitTokens;

      return {
        plan: newPlanId,
        planDefaults: defaults,
        currentConfig: {
          aiEnabled: row.ai_enabled,
          aiMonthlyTokenLimit: row.ai_monthly_token_limit,
        },
        isOverridden,
      };
    }
  } catch (error) {
    logger.error('[Plan Defaults] Failed to update tenant plan', { error, tenantId, newPlanId });
    throw error;
  }
}
