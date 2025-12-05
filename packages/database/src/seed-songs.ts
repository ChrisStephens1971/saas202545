import { Pool } from 'pg';
import { createPool } from './index';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ============================================================================
// Types
// ============================================================================

export interface SongSeedData {
  title: string;
  alternateTitle?: string | null;
  firstLine?: string | null;
  tuneName?: string | null;
  hymnNumber?: string | null;
  hymnalCode?: string | null;
  author?: string | null;
  composer?: string | null;
  isPublicDomain?: boolean;
  ccliNumber?: string | null;
  copyrightNotice?: string | null;
  defaultKey?: string | null;
  defaultTempo?: number | null;
  lyrics?: string | null;
}

export interface SeedFile {
  description: string;
  version: string;
  songs: SongSeedData[];
}

export interface SeedSongsResult {
  created: number;
  updated: number;
  errors: number;
  total: number;
}

export interface SeedSongsOptions {
  /** Path to the JSON seed file. Defaults to the bundled public_hymns_seed.json */
  filePath?: string;
  /** Whether to log progress to console. Defaults to false when called as a function. */
  verbose?: boolean;
}

// ============================================================================
// Default seed file path
// ============================================================================

/**
 * Get the default seed file path (public_hymns_seed.json in the seed/ directory)
 */
export function getDefaultSeedFilePath(): string {
  return resolve(__dirname, '../seed/public_hymns_seed.json');
}

// ============================================================================
// Core seed function (reusable)
// ============================================================================

/**
 * Seeds songs for a tenant from a JSON file.
 *
 * This function is idempotent - it will create new songs or update existing ones
 * based on title + hymnal_code uniqueness.
 *
 * @param pool - An existing pg Pool instance. The function will NOT close this pool.
 * @param tenantId - The tenant UUID to seed songs for.
 * @param options - Optional configuration.
 * @returns A summary of the seed operation.
 *
 * @example
 * // Call from tenant creation
 * const pool = getPool();
 * await seedSongsForTenant(pool, newTenant.id);
 *
 * @example
 * // Call with custom file
 * await seedSongsForTenant(pool, tenantId, { filePath: '/path/to/songs.json' });
 */
export async function seedSongsForTenant(
  pool: Pool,
  tenantId: string,
  options: SeedSongsOptions = {}
): Promise<SeedSongsResult> {
  const { filePath = getDefaultSeedFilePath(), verbose = false } = options;

  const log = verbose ? console.log.bind(console) : () => {};

  // Load and parse seed file
  let seedData: SeedFile;
  try {
    const fileContent = readFileSync(filePath, 'utf-8');
    seedData = JSON.parse(fileContent);
  } catch (error: any) {
    throw new Error(`Failed to load seed file ${filePath}: ${error.message}`);
  }

  log(`Loaded ${seedData.songs.length} songs from seed file`);

  // Get a client for the transaction
  const client = await pool.connect();

  let created = 0;
  let updated = 0;
  let errors = 0;

  try {
    // Begin transaction and set tenant context
    await client.query('BEGIN');
    await client.query(`SET LOCAL app.tenant_id = '${tenantId}'`);

    for (const song of seedData.songs) {
      try {
        // Check if song exists (by title and hymnal_code for uniqueness)
        const existingResult = await client.query(
          `SELECT id FROM song
           WHERE tenant_id = $1
             AND title = $2
             AND (hymnal_code = $3 OR (hymnal_code IS NULL AND $3 IS NULL))
             AND deleted_at IS NULL`,
          [tenantId, song.title, song.hymnalCode || null]
        );

        if (existingResult.rows.length > 0) {
          // Update existing song
          await client.query(
            `UPDATE song SET
              alternate_title = $1,
              first_line = $2,
              tune_name = $3,
              hymn_number = $4,
              hymnal_code = $5,
              author = $6,
              composer = $7,
              is_public_domain = $8,
              ccli_number = $9,
              copyright_notice = $10,
              default_key = $11,
              default_tempo = $12,
              lyrics = $13,
              updated_at = NOW()
            WHERE id = $14`,
            [
              song.alternateTitle || null,
              song.firstLine || null,
              song.tuneName || null,
              song.hymnNumber || null,
              song.hymnalCode || null,
              song.author || null,
              song.composer || null,
              song.isPublicDomain ?? false,
              song.ccliNumber || null,
              song.copyrightNotice || null,
              song.defaultKey || null,
              song.defaultTempo || null,
              song.lyrics || null,
              existingResult.rows[0].id,
            ]
          );
          updated++;
          log(`  Updated: ${song.title}`);
        } else {
          // Insert new song
          await client.query(
            `INSERT INTO song (
              tenant_id,
              title,
              alternate_title,
              first_line,
              tune_name,
              hymn_number,
              hymnal_code,
              author,
              composer,
              is_public_domain,
              ccli_number,
              copyright_notice,
              default_key,
              default_tempo,
              lyrics
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
            [
              tenantId,
              song.title,
              song.alternateTitle || null,
              song.firstLine || null,
              song.tuneName || null,
              song.hymnNumber || null,
              song.hymnalCode || null,
              song.author || null,
              song.composer || null,
              song.isPublicDomain ?? false,
              song.ccliNumber || null,
              song.copyrightNotice || null,
              song.defaultKey || null,
              song.defaultTempo || null,
              song.lyrics || null,
            ]
          );
          created++;
          log(`  Created: ${song.title}`);
        }
      } catch (error: any) {
        errors++;
        log(`  Error with "${song.title}": ${error.message}`);
      }
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  return {
    created,
    updated,
    errors,
    total: seedData.songs.length,
  };
}

// ============================================================================
// CLI entrypoint
// ============================================================================

function parseArgs(): { tenantId: string; seedFile: string } {
  const args = process.argv.slice(2);
  let tenantId = '';
  let seedFile = 'public_hymns_seed.json';

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--tenant=')) {
      tenantId = arg.split('=')[1];
    } else if (arg === '--tenant' && args[i + 1]) {
      tenantId = args[++i];
    } else if (arg.startsWith('--file=')) {
      seedFile = arg.split('=')[1];
    } else if (arg === '--file' && args[i + 1]) {
      seedFile = args[++i];
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Usage: npm run seed:songs -- --tenant=<tenant-id> [--file=<seed-file>]

Options:
  --tenant=<tenant-id>  Required. The tenant UUID to seed songs for.
  --file=<seed-file>    Optional. JSON file name in seed/ directory.
                        Default: public_hymns_seed.json
  --help, -h            Show this help message.

Examples:
  npm run seed:songs -- --tenant=00000000-0000-0000-0000-000000000001
  npm run seed:songs -- --tenant=abc123 --file=custom_songs.json
`);
      process.exit(0);
    }
  }

  if (!tenantId) {
    console.error('Error: --tenant=<tenant-id> is required');
    console.error('Run with --help for usage information');
    process.exit(1);
  }

  // Validate UUID format (basic check)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(tenantId)) {
    console.error(`Error: Invalid tenant ID format: ${tenantId}`);
    console.error('Expected UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx');
    process.exit(1);
  }

  return { tenantId, seedFile };
}

async function main() {
  const { tenantId, seedFile } = parseArgs();
  const pool = createPool();

  try {
    console.log(`\nSeed Songs Pipeline`);
    console.log(`==================`);
    console.log(`Tenant ID: ${tenantId}`);
    console.log(`Seed file: ${seedFile}`);

    // Verify tenant exists
    const tenantResult = await pool.query(
      'SELECT id, name FROM tenant WHERE id = $1',
      [tenantId]
    );

    if (tenantResult.rows.length === 0) {
      console.error(`\nError: Tenant not found with ID: ${tenantId}`);
      console.error('Make sure to run the main seed first: npm run seed');
      process.exit(1);
    }

    console.log(`Tenant: ${tenantResult.rows[0].name}\n`);

    // Build full path for seed file
    const filePath = resolve(__dirname, '../seed', seedFile);

    // Run the seed
    const result = await seedSongsForTenant(pool, tenantId, {
      filePath,
      verbose: true,
    });

    console.log(`\n==================`);
    console.log(`Results:`);
    console.log(`  Created: ${result.created}`);
    console.log(`  Updated: ${result.updated}`);
    console.log(`  Errors: ${result.errors}`);
    console.log(`  Total processed: ${result.total}`);

    if (result.errors > 0) {
      console.log(`\nCompleted with errors.`);
      process.exit(1);
    } else {
      console.log(`\nSeed completed successfully!`);
    }
  } catch (error) {
    console.error('\nSeed failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Only run CLI if this is the main module
// Check if we're being run directly (not imported)
const isMainModule = typeof require !== 'undefined' && require.main === module;
const isRunDirectly = process.argv[1]?.includes('seed-songs');

if (isMainModule || isRunDirectly) {
  main();
}
