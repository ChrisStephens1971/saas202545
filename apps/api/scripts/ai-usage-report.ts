#!/usr/bin/env tsx
/**
 * AI Usage Report Script
 *
 * Generates a console report of AI usage and estimated costs.
 *
 * Usage:
 *   npm run ai:usage
 *   npm run ai:usage -- --from=2025-12-01 --to=2025-12-31
 *   npm run ai:usage -- --tenant=00000000-0000-0000-0000-000000000001
 *
 * Or directly:
 *   npx tsx scripts/ai-usage-report.ts
 *   npx tsx scripts/ai-usage-report.ts --from=2025-12-01 --to=2025-12-31
 */

import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { aggregateAiUsage, AiUsageSummaryRow } from '../src/utils/aiUsageAggregation';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local'), override: true });

/**
 * Parse command line arguments.
 * Supports: --from=YYYY-MM-DD --to=YYYY-MM-DD --tenant=UUID
 */
function parseArgs(): { from: Date; to: Date; tenantId?: string } {
  const args = process.argv.slice(2);
  const parsed: Record<string, string> = {};

  for (const arg of args) {
    const match = arg.match(/^--(\w+)=(.+)$/);
    if (match) {
      parsed[match[1]] = match[2];
    }
  }

  // Default: current month to date
  const now = new Date();
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const defaultTo = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Tomorrow (exclusive)

  let from = defaultFrom;
  let to = defaultTo;

  if (parsed.from) {
    const fromDate = new Date(parsed.from + 'T00:00:00');
    if (isNaN(fromDate.getTime())) {
      console.error(`Invalid --from date: ${parsed.from}. Use YYYY-MM-DD format.`);
      process.exit(1);
    }
    from = fromDate;
  }

  if (parsed.to) {
    const toDate = new Date(parsed.to + 'T23:59:59.999');
    if (isNaN(toDate.getTime())) {
      console.error(`Invalid --to date: ${parsed.to}. Use YYYY-MM-DD format.`);
      process.exit(1);
    }
    // Add a day since we want the end of the specified day (exclusive)
    to = new Date(toDate.getTime() + 1);
  }

  return {
    from,
    to,
    tenantId: parsed.tenant,
  };
}

/**
 * Format a date as YYYY-MM-DD.
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Format cost with 4 decimal places (for small amounts) or 2 for larger.
 */
function formatCost(cost: number): string {
  if (cost < 0.01) {
    return `$${cost.toFixed(6)}`;
  }
  return `$${cost.toFixed(4)}`;
}

/**
 * Truncate tenant ID for display.
 */
function truncateTenantId(tenantId: string): string {
  if (tenantId.length > 12) {
    return tenantId.substring(0, 8) + '...';
  }
  return tenantId;
}

/**
 * Print the usage report to console.
 */
function printReport(
  fromDate: Date,
  toDate: Date,
  rows: AiUsageSummaryRow[],
  totals: { calls: number; tokensIn: number; tokensOut: number; costInUSD: number },
  unknownModels: string[],
  tenantFilter?: string
): void {
  console.log('\n' + '='.repeat(90));
  console.log(`AI Usage Summary (${formatDate(fromDate)} to ${formatDate(toDate)})`);
  if (tenantFilter) {
    console.log(`Filtered by tenant: ${tenantFilter}`);
  }
  console.log('='.repeat(90) + '\n');

  if (rows.length === 0) {
    console.log('No AI usage events found for the specified date range.\n');
    return;
  }

  // Print header
  const header = [
    'Tenant'.padEnd(12),
    'Feature'.padEnd(25),
    'Calls'.padStart(8),
    'Tokens In'.padStart(12),
    'Tokens Out'.padStart(12),
    'Cost (USD)'.padStart(14),
  ].join(' | ');

  console.log(header);
  console.log('-'.repeat(90));

  // Print rows
  for (const row of rows) {
    const line = [
      truncateTenantId(row.tenantId).padEnd(12),
      row.feature.padEnd(25),
      row.calls.toString().padStart(8),
      row.tokensIn.toLocaleString().padStart(12),
      row.tokensOut.toLocaleString().padStart(12),
      formatCost(row.costInUSD).padStart(14),
    ].join(' | ');
    console.log(line);
  }

  // Print totals
  console.log('-'.repeat(90));
  const totalLine = [
    'TOTAL'.padEnd(12),
    ''.padEnd(25),
    totals.calls.toString().padStart(8),
    totals.tokensIn.toLocaleString().padStart(12),
    totals.tokensOut.toLocaleString().padStart(12),
    formatCost(totals.costInUSD).padStart(14),
  ].join(' | ');
  console.log(totalLine);
  console.log('='.repeat(90) + '\n');

  // Warn about unknown models
  if (unknownModels.length > 0) {
    console.log('⚠️  Warning: Unknown models found (cost treated as $0):');
    for (const model of unknownModels) {
      console.log(`   - ${model}`);
    }
    console.log('   Add pricing for these models in src/config/aiPricing.ts\n');
  }

  // Summary
  console.log('Summary:');
  console.log(`  Total API calls: ${totals.calls}`);
  console.log(`  Total input tokens: ${totals.tokensIn.toLocaleString()}`);
  console.log(`  Total output tokens: ${totals.tokensOut.toLocaleString()}`);
  console.log(`  Estimated cost: ${formatCost(totals.costInUSD)}`);
  console.log('');
}

/**
 * Main function.
 */
async function main(): Promise<void> {
  const { from, to, tenantId } = parseArgs();

  // Validate DATABASE_URL
  if (!process.env.DATABASE_URL) {
    console.error('Error: DATABASE_URL environment variable is not set.');
    console.error('Make sure .env or .env.local exists in apps/api directory.');
    process.exit(1);
  }

  // Create database connection
  const db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });

  try {
    // Test connection
    await db.query('SELECT 1');

    // Run aggregation
    const summary = await aggregateAiUsage(db, { from, to, tenantId });

    // Print report
    printReport(from, to, summary.rows, summary.totals, summary.unknownModels, tenantId);

  } catch (error) {
    console.error('Error generating report:', error);
    process.exit(1);
  } finally {
    await db.end();
  }
}

// Run
main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
