/**
 * AI Quota Utilities
 *
 * Helper functions for checking tenant AI quota status and enforcement.
 */

import { db } from '../db';
import { Context } from '../context';
import { logger } from './logger';
import { AiQuotaStatus } from '@elder-first/types';

/**
 * Tenant AI config row from database
 */
interface TenantAiConfigRow {
  ai_enabled: boolean;
  ai_monthly_token_limit: number | null;
}

/**
 * Usage aggregation result
 */
interface UsageAggregateRow {
  total_tokens: string; // bigint comes as string
}

/**
 * Get AI quota status for a tenant.
 *
 * Reads the tenant's AI configuration and current month usage to determine:
 * - Whether AI is enabled for this tenant
 * - The token limit (if any)
 * - Current month's usage
 * - Whether the tenant is over their limit
 *
 * @param ctx - The request context containing tenantId
 * @returns The quota status for the tenant
 */
export async function getAiQuotaStatusForTenant(ctx: Context): Promise<AiQuotaStatus> {
  const tenantId = ctx.tenantId;

  // If no tenantId, treat as disabled (safety fallback)
  if (!tenantId) {
    logger.warn('[AI Quota] No tenantId in context, treating as disabled');
    return {
      enabled: false,
      limitTokens: 0,
      usedTokens: 0,
      remainingTokens: 0,
      overLimit: true,
    };
  }

  try {
    // 1. Load tenant AI config
    const tenantResult = await db.query<TenantAiConfigRow>(
      `SELECT ai_enabled, ai_monthly_token_limit
       FROM tenant
       WHERE id = $1 AND deleted_at IS NULL`,
      [tenantId]
    );

    // If tenant not found, treat as disabled
    if (tenantResult.rows.length === 0) {
      logger.warn('[AI Quota] Tenant not found', { tenantId });
      return {
        enabled: false,
        limitTokens: 0,
        usedTokens: 0,
        remainingTokens: 0,
        overLimit: true,
      };
    }

    const tenantConfig = tenantResult.rows[0];
    const aiEnabled = tenantConfig.ai_enabled;
    const limitTokens = tenantConfig.ai_monthly_token_limit;

    // 2. Aggregate current month's usage
    // Get start and end of current calendar month
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);

    const usageResult = await db.query<UsageAggregateRow>(
      `SELECT COALESCE(SUM(tokens_in + tokens_out), 0) as total_tokens
       FROM ai_usage_events
       WHERE tenant_id = $1
         AND created_at >= $2
         AND created_at < $3`,
      [tenantId, monthStart, monthEnd]
    );

    const usedTokens = parseInt(usageResult.rows[0]?.total_tokens || '0', 10);

    // 3. Compute remaining and overLimit
    let remainingTokens: number | null = null;
    let overLimit = false;

    if (!aiEnabled) {
      // AI disabled = always over limit
      overLimit = true;
      remainingTokens = 0;
    } else if (limitTokens !== null) {
      // Has a limit - compute remaining
      remainingTokens = Math.max(limitTokens - usedTokens, 0);
      overLimit = usedTokens >= limitTokens;
    }
    // else: no limit, remainingTokens stays null, overLimit stays false

    logger.debug('[AI Quota] Status computed', {
      tenantId,
      aiEnabled,
      limitTokens,
      usedTokens,
      remainingTokens,
      overLimit,
    });

    return {
      enabled: aiEnabled,
      limitTokens,
      usedTokens,
      remainingTokens,
      overLimit,
    };
  } catch (error) {
    logger.error('[AI Quota] Failed to compute quota status', { error, tenantId });
    // On error, fail closed (treat as over limit for safety)
    return {
      enabled: false,
      limitTokens: 0,
      usedTokens: 0,
      remainingTokens: 0,
      overLimit: true,
    };
  }
}
