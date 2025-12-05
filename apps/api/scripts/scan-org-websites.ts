#!/usr/bin/env tsx
/**
 * Scan Org Websites Script
 *
 * Scans all brand_pack records and classifies their church_website values as:
 *   - EMPTY: null, undefined, or empty string
 *   - VALID: full URL or bare hostname that can be normalized
 *   - INVALID: garbage that would fail WebsiteSchema validation
 *
 * Table inspected: brand_pack
 * Column inspected: church_website
 *
 * This matches the data model used by:
 *   - apps/api/src/routers/org.ts (updateBranding mutation)
 *   - apps/api/src/lib/orgBranding.ts (getOrgBranding query)
 *
 * Usage:
 *   npx tsx scripts/scan-org-websites.ts
 *   npx tsx scripts/scan-org-websites.ts --normalize
 *   npx tsx scripts/scan-org-websites.ts --normalize --force   (required in production)
 *
 * Options:
 *   --normalize    Update bare hostnames to normalized https:// form
 *                  (INVALID entries are NOT auto-fixed, only logged for review)
 *   --force        Required when running --normalize in NODE_ENV=production
 *
 * IMPORTANT:
 * The classification logic here MUST stay consistent with WebsiteSchema
 * in @elder-first/types (packages/types/src/index.ts).
 * If WebsiteSchema changes, update this script accordingly.
 */

import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables (same pattern as other apps/api scripts)
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local'), override: true });

// ============================================================================
// Types
// ============================================================================

type WebsiteClassification = 'EMPTY' | 'VALID' | 'INVALID';

interface WebsiteCheckResult {
  classification: WebsiteClassification;
  normalized?: string | null;
}

interface BrandPackRow {
  id: string;
  name: string | null;
  church_name: string | null;
  church_website: string | null;
  tenant_id: string;
}

interface ClassifiedRecord {
  id: string;
  label: string;
  rawWebsite: string | null;
  classification: WebsiteClassification;
  normalized?: string | null;
  tenantId: string;
}

// ============================================================================
// Website Classification
// ============================================================================

/**
 * Classify a website value using the same logic as WebsiteSchema.
 *
 * IMPORTANT: This logic MUST stay consistent with WebsiteSchema in @elder-first/types.
 * If WebsiteSchema changes, update this function accordingly.
 *
 * Classification rules:
 * - EMPTY: null, undefined, or empty/whitespace string after trim()
 * - VALID: full URL with http(s):// protocol that parses successfully,
 *          OR a bare hostname that becomes valid when https:// is prepended
 * - INVALID: anything that fails URL parsing even with https:// prefix
 *
 * @param raw - The raw church_website value from the database
 * @returns Classification result with optional normalized value
 */
function classifyWebsite(raw: string | null | undefined): WebsiteCheckResult {
  // EMPTY: null, undefined, or empty/whitespace string
  if (raw === null || raw === undefined) {
    return { classification: 'EMPTY', normalized: null };
  }

  const trimmed = raw.trim();
  if (trimmed === '') {
    return { classification: 'EMPTY', normalized: null };
  }

  // Check if it already has http:// or https:// protocol
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      new URL(trimmed);
      // Already has protocol and is valid - no normalization needed
      return { classification: 'VALID', normalized: trimmed };
    } catch {
      // Has protocol but malformed (e.g., "http://")
      return { classification: 'INVALID' };
    }
  }

  // No protocol - try adding https:// prefix (matches WebsiteSchema auto-normalization)
  const withProtocol = `https://${trimmed}`;
  try {
    new URL(withProtocol);
    // Valid when normalized - needs https:// prefix added
    return { classification: 'VALID', normalized: withProtocol };
  } catch {
    // Still invalid even with protocol
    return { classification: 'INVALID' };
  }
}

// ============================================================================
// CLI Argument Parsing
// ============================================================================

interface CliArgs {
  normalize: boolean;
  force: boolean;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  return {
    normalize: args.includes('--normalize') || args.includes('--fix'),
    force: args.includes('--force'),
  };
}

// ============================================================================
// Main Script
// ============================================================================

async function main(): Promise<void> {
  const { normalize, force } = parseArgs();
  const nodeEnv = process.env.NODE_ENV || 'development';
  const isProduction = nodeEnv === 'production';

  console.log('\n' + '='.repeat(70));
  console.log('Org Website Scanner');
  console.log('='.repeat(70));
  console.log(`Environment: ${nodeEnv}`);
  console.log(`Mode: ${normalize ? 'NORMALIZE (will update bare hostnames)' : 'READ-ONLY (scan only)'}`);
  console.log('');

  // Production safety guardrail
  if (normalize && isProduction && !force) {
    console.error('');
    console.error('╔════════════════════════════════════════════════════════════════════╗');
    console.error('║  ERROR: Refusing to normalize in production without --force flag   ║');
    console.error('╠════════════════════════════════════════════════════════════════════╣');
    console.error('║  To run normalization in production:                               ║');
    console.error('║                                                                    ║');
    console.error('║    1. Back up the database first                                   ║');
    console.error('║    2. Review the read-only scan output                             ║');
    console.error('║    3. Run with --force flag:                                       ║');
    console.error('║                                                                    ║');
    console.error('║       npx tsx scripts/scan-org-websites.ts --normalize --force     ║');
    console.error('║                                                                    ║');
    console.error('╚════════════════════════════════════════════════════════════════════╝');
    console.error('');
    process.exit(1);
  }

  // Validate DATABASE_URL
  if (!process.env.DATABASE_URL) {
    console.error('Error: DATABASE_URL environment variable is not set.');
    console.error('Make sure .env or .env.local exists in apps/api directory.');
    process.exit(1);
  }

  // Create database connection (same pattern as other apps/api scripts)
  const db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });

  try {
    // Test connection
    await db.query('SELECT 1');
    console.log('✓ Database connected\n');

    // Query all brand_pack records
    const result = await db.query<BrandPackRow>(`
      SELECT id, name, church_name, church_website, tenant_id
      FROM brand_pack
      WHERE deleted_at IS NULL
      ORDER BY name, church_name
    `);

    const records = result.rows;
    console.log(`Found ${records.length} brand_pack record(s)\n`);

    if (records.length === 0) {
      console.log('No records to scan.');
      console.log('='.repeat(70));
      console.log('Scan complete.');
      console.log('='.repeat(70) + '\n');
      return;
    }

    // Classify each record
    const classified: ClassifiedRecord[] = records.map((row) => {
      const { classification, normalized } = classifyWebsite(row.church_website);
      return {
        id: row.id,
        label: row.name || row.church_name || '(unnamed)',
        rawWebsite: row.church_website,
        classification,
        normalized,
        tenantId: row.tenant_id,
      };
    });

    // Count by classification
    const counts = {
      total: records.length,
      EMPTY: classified.filter((r) => r.classification === 'EMPTY').length,
      VALID: classified.filter((r) => r.classification === 'VALID').length,
      INVALID: classified.filter((r) => r.classification === 'INVALID').length,
    };

    // Print summary
    console.log('-'.repeat(70));
    console.log('Classification Summary');
    console.log('-'.repeat(70));
    console.log(`  EMPTY:   ${counts.EMPTY.toString().padStart(4)} (blank/null - OK)`);
    console.log(`  VALID:   ${counts.VALID.toString().padStart(4)} (valid URL or normalizable hostname)`);
    console.log(`  INVALID: ${counts.INVALID.toString().padStart(4)} (requires manual review)`);
    console.log(`  ────────────`);
    console.log(`  TOTAL:   ${counts.total.toString().padStart(4)}`);
    console.log('');

    // List INVALID entries (always show these for manual review)
    const invalidRecords = classified.filter((r) => r.classification === 'INVALID');
    if (invalidRecords.length > 0) {
      console.log('-'.repeat(70));
      console.log('⚠️  INVALID Entries (require manual review)');
      console.log('-'.repeat(70));
      for (const rec of invalidRecords) {
        console.log(`  ID:      ${rec.id}`);
        console.log(`  Name:    ${rec.label}`);
        console.log(`  Website: "${rec.rawWebsite}"`);
        console.log(`  Tenant:  ${rec.tenantId}`);
        console.log('');
      }
    }

    // Identify records that need normalization (VALID but no protocol in raw value)
    const needsNormalization = classified.filter((r) => {
      if (r.classification !== 'VALID') return false;
      if (!r.rawWebsite) return false;
      // Needs normalization if raw doesn't have protocol but normalized does
      const hasProtocol = /^https?:\/\//i.test(r.rawWebsite.trim());
      return !hasProtocol && r.normalized && r.normalized !== r.rawWebsite.trim();
    });

    // Normalization mode
    if (normalize) {
      if (needsNormalization.length === 0) {
        console.log('✓ No records need normalization.\n');
      } else {
        console.log('-'.repeat(70));
        console.log(`Normalizing ${needsNormalization.length} record(s)...`);
        console.log('-'.repeat(70));

        for (const rec of needsNormalization) {
          console.log(`  Updating brand_pack ${rec.id} (${rec.label}):`);
          console.log(`    "${rec.rawWebsite}" -> "${rec.normalized}"`);

          await db.query(
            `UPDATE brand_pack SET church_website = $1, updated_at = NOW() WHERE id = $2`,
            [rec.normalized, rec.id]
          );
        }

        console.log('');
        console.log(`✓ Updated ${needsNormalization.length} record(s).\n`);
      }

      if (invalidRecords.length > 0) {
        console.log(
          `⚠️  ${invalidRecords.length} INVALID record(s) were NOT updated. Fix them manually.\n`
        );
      }
    } else {
      // Read-only mode - show what WOULD be normalized
      if (needsNormalization.length > 0) {
        console.log('-'.repeat(70));
        console.log(`ℹ️  ${needsNormalization.length} record(s) would be normalized with --normalize:`);
        console.log('-'.repeat(70));
        for (const rec of needsNormalization) {
          console.log(`  ${rec.id} (${rec.label}):`);
          console.log(`    "${rec.rawWebsite}" -> "${rec.normalized}"`);
        }
        console.log('');
        if (isProduction) {
          console.log('Run with --normalize --force to apply these changes in production.\n');
        } else {
          console.log('Run with --normalize to apply these changes.\n');
        }
      }
    }

    console.log('='.repeat(70));
    console.log('Scan complete.');
    console.log('='.repeat(70) + '\n');

    // Exit with success
    process.exit(0);

  } catch (error) {
    console.error('Error scanning records:', error);
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
