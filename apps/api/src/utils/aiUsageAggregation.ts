/**
 * AI Usage Aggregation Utilities
 *
 * Shared logic for aggregating AI usage data from ai_usage_events table.
 * Used by both CLI script and tRPC endpoint.
 */

import { Pool } from 'pg';
import { calculateUsageCost, getModelPricing } from '../config/aiPricing';

/**
 * Summary row for AI usage by tenant and feature.
 */
export type AiUsageSummaryRow = {
  tenantId: string;
  feature: string;
  calls: number;
  tokensIn: number;
  tokensOut: number;
  costInUSD: number;
};

/**
 * Full summary response including totals.
 */
export type AiUsageSummary = {
  from: string;  // ISO date string
  to: string;    // ISO date string
  rows: AiUsageSummaryRow[];
  totals: {
    calls: number;
    tokensIn: number;
    tokensOut: number;
    costInUSD: number;
  };
  unknownModels: string[];  // Models found but not in pricing config
};

/**
 * Input parameters for aggregation query.
 */
export type AiUsageQueryParams = {
  from: Date;
  to: Date;
  tenantId?: string | null;
};

/**
 * Raw row from database query (before cost calculation).
 */
interface RawUsageRow {
  tenant_id: string;
  feature: string;
  model: string;
  calls: string;        // COUNT returns bigint as string
  tokens_in: string;    // SUM returns bigint as string
  tokens_out: string;   // SUM returns bigint as string
}

/**
 * Aggregate AI usage from the database.
 *
 * Since cost depends on the model used per row, and rows might use different models,
 * we need to aggregate per (tenant_id, feature, model) first, then combine.
 *
 * @param db - Database connection pool
 * @param params - Query parameters (date range, optional tenant filter)
 * @returns Aggregated usage summary
 */
export async function aggregateAiUsage(
  db: Pool,
  params: AiUsageQueryParams
): Promise<AiUsageSummary> {
  const { from, to, tenantId } = params;

  // Build query - aggregate by tenant_id, feature, model
  // This allows us to calculate cost correctly per model
  let query = `
    SELECT
      tenant_id,
      feature,
      model,
      COUNT(*) as calls,
      COALESCE(SUM(tokens_in), 0) as tokens_in,
      COALESCE(SUM(tokens_out), 0) as tokens_out
    FROM ai_usage_events
    WHERE created_at >= $1 AND created_at < $2
  `;

  const queryParams: (Date | string)[] = [from, to];

  if (tenantId) {
    query += ` AND tenant_id = $3`;
    queryParams.push(tenantId);
  }

  query += ` GROUP BY tenant_id, feature, model ORDER BY tenant_id, feature, model`;

  const result = await db.query<RawUsageRow>(query, queryParams);

  // Aggregate results by (tenant_id, feature), calculating cost per model
  const aggregated = new Map<string, AiUsageSummaryRow>();
  const unknownModelsSet = new Set<string>();

  for (const row of result.rows) {
    const key = `${row.tenant_id}|${row.feature}`;
    const calls = parseInt(row.calls, 10);
    const tokensIn = parseInt(row.tokens_in, 10);
    const tokensOut = parseInt(row.tokens_out, 10);

    // Check if model pricing is known
    if (!getModelPricing(row.model)) {
      unknownModelsSet.add(row.model);
    }

    // Calculate cost for this model
    const cost = calculateUsageCost(row.model, tokensIn, tokensOut);

    // Add to aggregate
    const existing = aggregated.get(key);
    if (existing) {
      existing.calls += calls;
      existing.tokensIn += tokensIn;
      existing.tokensOut += tokensOut;
      existing.costInUSD += cost;
    } else {
      aggregated.set(key, {
        tenantId: row.tenant_id,
        feature: row.feature,
        calls,
        tokensIn,
        tokensOut,
        costInUSD: cost,
      });
    }
  }

  // Convert to sorted array
  const rows = Array.from(aggregated.values()).sort((a, b) => {
    const tenantCompare = a.tenantId.localeCompare(b.tenantId);
    if (tenantCompare !== 0) return tenantCompare;
    return a.feature.localeCompare(b.feature);
  });

  // Calculate totals
  const totals = rows.reduce(
    (acc, row) => ({
      calls: acc.calls + row.calls,
      tokensIn: acc.tokensIn + row.tokensIn,
      tokensOut: acc.tokensOut + row.tokensOut,
      costInUSD: acc.costInUSD + row.costInUSD,
    }),
    { calls: 0, tokensIn: 0, tokensOut: 0, costInUSD: 0 }
  );

  return {
    from: from.toISOString(),
    to: to.toISOString(),
    rows,
    totals,
    unknownModels: Array.from(unknownModelsSet),
  };
}
