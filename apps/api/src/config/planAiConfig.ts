/**
 * Plan AI Configuration
 *
 * Defines the AI defaults for each subscription plan.
 * These values are applied to new tenants and can be used
 * to reset a tenant's AI configuration to plan defaults.
 */

import { PlanId, PlanAiDefaults } from '@elder-first/types';

/**
 * AI defaults for each subscription plan.
 *
 * Plan tiers:
 * - core: AI disabled, no tokens
 * - starter: AI enabled, 50,000 tokens/month
 * - standard: AI enabled, 250,000 tokens/month
 * - plus: AI enabled, 1,000,000 tokens/month
 */
export const PLAN_AI_DEFAULTS: Record<PlanId, PlanAiDefaults> = {
  core: {
    aiEnabled: false,
    aiLimitTokens: 0,
  },
  starter: {
    aiEnabled: true,
    aiLimitTokens: 50_000,
  },
  standard: {
    aiEnabled: true,
    aiLimitTokens: 250_000,
  },
  plus: {
    aiEnabled: true,
    aiLimitTokens: 1_000_000,
  },
};

/**
 * Get AI defaults for a plan.
 *
 * @param planId - The plan identifier
 * @returns The AI defaults for that plan
 */
export function getPlanAiDefaults(planId: PlanId): PlanAiDefaults {
  return PLAN_AI_DEFAULTS[planId];
}

/**
 * Get all plan IDs in order of tier (lowest to highest).
 */
export const PLAN_IDS_ORDERED: PlanId[] = ['core', 'starter', 'standard', 'plus'];

/**
 * Plan display names for UI.
 */
export const PLAN_DISPLAY_NAMES: Record<PlanId, string> = {
  core: 'Core',
  starter: 'Starter',
  standard: 'Standard',
  plus: 'Plus',
};
