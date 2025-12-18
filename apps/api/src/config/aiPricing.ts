/**
 * AI Model Pricing Configuration
 *
 * Central source of truth for AI model pricing.
 * Prices are in USD per 1000 tokens.
 *
 * Updated: 2025-12 (OpenAI pricing as of this date)
 */

export type AiPricing = {
  inputPer1K: number;   // USD per 1000 input tokens
  outputPer1K: number;  // USD per 1000 output tokens
};

/**
 * Pricing map for known AI models.
 * Add new models here as they are used in the codebase.
 */
export const AI_MODEL_PRICING: Record<string, AiPricing> = {
  // GPT-4o Mini - primary model used in ai.ts
  'gpt-4o-mini': { inputPer1K: 0.00015, outputPer1K: 0.00060 },
  'gpt-4o-mini-2024-07-18': { inputPer1K: 0.00015, outputPer1K: 0.00060 },

  // GPT-4o - full model (in case we upgrade)
  'gpt-4o': { inputPer1K: 0.00250, outputPer1K: 0.01000 },
  'gpt-4o-2024-08-06': { inputPer1K: 0.00250, outputPer1K: 0.01000 },

  // GPT-4 Turbo (legacy)
  'gpt-4-turbo': { inputPer1K: 0.01000, outputPer1K: 0.03000 },
  'gpt-4-turbo-preview': { inputPer1K: 0.01000, outputPer1K: 0.03000 },

  // GPT-3.5 Turbo (legacy, cheaper)
  'gpt-3.5-turbo': { inputPer1K: 0.00050, outputPer1K: 0.00150 },
  'gpt-3.5-turbo-0125': { inputPer1K: 0.00050, outputPer1K: 0.00150 },
};

/**
 * Get pricing for a model, with fallback for unknown models.
 *
 * @param model - The model name from the API response
 * @returns Pricing object, or null if model is unknown
 */
export function getModelPricing(model: string): AiPricing | null {
  return AI_MODEL_PRICING[model] ?? null;
}

/**
 * Calculate cost for a single usage event.
 *
 * @param model - Model name
 * @param tokensIn - Number of input tokens
 * @param tokensOut - Number of output tokens
 * @returns Cost in USD, or 0 if model pricing is unknown
 */
export function calculateUsageCost(
  model: string,
  tokensIn: number,
  tokensOut: number
): number {
  const pricing = getModelPricing(model);
  if (!pricing) {
    return 0;
  }
  const inputCost = (tokensIn / 1000) * pricing.inputPer1K;
  const outputCost = (tokensOut / 1000) * pricing.outputPer1K;
  return inputCost + outputCost;
}
