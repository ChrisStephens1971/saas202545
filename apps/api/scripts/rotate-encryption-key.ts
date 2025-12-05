/**
 * Encryption Key Rotation Script
 *
 * This script re-encrypts all data encrypted with the old key using a new key.
 *
 * Usage:
 *   npx tsx scripts/rotate-encryption-key.ts [--dry-run] [--force]
 *
 * Required environment variables:
 *   OLD_ENCRYPTION_KEY - Current encryption key (64 hex characters)
 *   NEW_ENCRYPTION_KEY - New encryption key (64 hex characters)
 *   DATABASE_URL - PostgreSQL connection string
 *
 * Options:
 *   --dry-run  Show what would be changed without making changes
 *   --force    Skip confirmation prompts
 *
 * IMPORTANT: Test this script in staging before running in production!
 */

import crypto from 'crypto';
import { Pool } from 'pg';
import * as readline from 'readline';

// Constants
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isForce = args.includes('--force');

// Validate environment
function validateEnvironment(): { oldKey: Buffer; newKey: Buffer; dbUrl: string } {
  const oldKeyHex = process.env.OLD_ENCRYPTION_KEY;
  const newKeyHex = process.env.NEW_ENCRYPTION_KEY;
  const dbUrl = process.env.DATABASE_URL;

  const errors: string[] = [];

  if (!oldKeyHex) {
    errors.push('OLD_ENCRYPTION_KEY environment variable is required');
  } else if (oldKeyHex.length !== 64) {
    errors.push('OLD_ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
  }

  if (!newKeyHex) {
    errors.push('NEW_ENCRYPTION_KEY environment variable is required');
  } else if (newKeyHex.length !== 64) {
    errors.push('NEW_ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
  }

  if (!dbUrl) {
    errors.push('DATABASE_URL environment variable is required');
  }

  if (oldKeyHex === newKeyHex) {
    errors.push('OLD_ENCRYPTION_KEY and NEW_ENCRYPTION_KEY must be different');
  }

  if (errors.length > 0) {
    console.error('\n[ERROR] Environment validation failed:');
    errors.forEach((e) => console.error(`  - ${e}`));
    console.error('\nUsage:');
    console.error('  OLD_ENCRYPTION_KEY=<old> NEW_ENCRYPTION_KEY=<new> DATABASE_URL=<url> npx tsx scripts/rotate-encryption-key.ts');
    process.exit(1);
  }

  return {
    oldKey: Buffer.from(oldKeyHex!, 'hex'),
    newKey: Buffer.from(newKeyHex!, 'hex'),
    dbUrl: dbUrl!,
  };
}

// Decrypt with specified key
function decrypt(ciphertext: string, key: Buffer): string {
  const combined = Buffer.from(ciphertext, 'base64');

  if (combined.length < IV_LENGTH + AUTH_TAG_LENGTH + 1) {
    throw new Error('Invalid ciphertext: too short');
  }

  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}

// Encrypt with specified key
function encrypt(plaintext: string, key: Buffer): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const combined = Buffer.concat([iv, authTag, encrypted]);
  return combined.toString('base64');
}

// Ask for confirmation
async function confirm(message: string): Promise<boolean> {
  if (isForce) return true;

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${message} (yes/no): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes');
    });
  });
}

// Main rotation logic
async function rotateKeys(): Promise<void> {
  console.log('\n========================================');
  console.log('   ENCRYPTION KEY ROTATION SCRIPT');
  console.log('========================================\n');

  if (isDryRun) {
    console.log('[MODE] DRY RUN - No changes will be made\n');
  }

  const { oldKey, newKey, dbUrl } = validateEnvironment();

  console.log('[OK] Environment validated');
  console.log(`[INFO] Old key: ${process.env.OLD_ENCRYPTION_KEY!.substring(0, 8)}...`);
  console.log(`[INFO] New key: ${process.env.NEW_ENCRYPTION_KEY!.substring(0, 8)}...`);

  // Connect to database
  const pool = new Pool({ connectionString: dbUrl });

  try {
    // Test connection
    await pool.query('SELECT 1');
    console.log('[OK] Database connected\n');

    // Query encrypted data
    console.log('[INFO] Scanning for encrypted data...\n');

    const result = await pool.query(`
      SELECT id, api_key_encrypted
      FROM ai_settings
      WHERE api_key_encrypted IS NOT NULL
    `);

    if (result.rows.length === 0) {
      console.log('[INFO] No encrypted data found. Nothing to rotate.\n');
      return;
    }

    console.log(`[INFO] Found ${result.rows.length} row(s) with encrypted data\n`);

    // Preview changes
    const changes: Array<{ id: number; preview: string }> = [];

    for (const row of result.rows) {
      try {
        const plaintext = decrypt(row.api_key_encrypted, oldKey);
        // Show masked preview (first 4 chars)
        const preview = plaintext.substring(0, 4) + '*'.repeat(Math.max(0, plaintext.length - 4));
        changes.push({ id: row.id, preview });
        console.log(`  Row ${row.id}: API key decrypted successfully (${preview})`);
      } catch (error) {
        console.error(`  [ERROR] Row ${row.id}: Failed to decrypt with old key`);
        console.error(`          This row may already use a different key`);
        throw new Error('Decryption failed - aborting rotation');
      }
    }

    console.log('');

    if (isDryRun) {
      console.log('[DRY RUN] Would re-encrypt the above rows with new key');
      console.log('[DRY RUN] No changes made');
      return;
    }

    // Confirm before proceeding
    const confirmed = await confirm('Proceed with key rotation?');
    if (!confirmed) {
      console.log('\n[ABORTED] Key rotation cancelled by user');
      return;
    }

    console.log('\n[INFO] Starting key rotation...\n');

    // Begin transaction
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      let successCount = 0;

      for (const row of result.rows) {
        // Decrypt with old key
        const plaintext = decrypt(row.api_key_encrypted, oldKey);

        // Encrypt with new key
        const newCiphertext = encrypt(plaintext, newKey);

        // Update row
        await client.query(
          'UPDATE ai_settings SET api_key_encrypted = $1 WHERE id = $2',
          [newCiphertext, row.id]
        );

        successCount++;
        console.log(`  [OK] Row ${row.id} re-encrypted`);
      }

      // Verify all rows can be decrypted with new key
      console.log('\n[INFO] Verifying re-encrypted data...');

      const verifyResult = await client.query(`
        SELECT id, api_key_encrypted
        FROM ai_settings
        WHERE api_key_encrypted IS NOT NULL
      `);

      for (const row of verifyResult.rows) {
        try {
          decrypt(row.api_key_encrypted, newKey);
          console.log(`  [OK] Row ${row.id} verification passed`);
        } catch (error) {
          console.error(`  [ERROR] Row ${row.id} verification failed!`);
          throw new Error('Verification failed - rolling back');
        }
      }

      await client.query('COMMIT');
      console.log('\n[SUCCESS] Transaction committed');
      console.log(`[SUCCESS] ${successCount} row(s) re-encrypted with new key`);

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('\n[ROLLBACK] Transaction rolled back due to error');
      throw error;
    } finally {
      client.release();
    }

    console.log('\n========================================');
    console.log('   KEY ROTATION COMPLETED');
    console.log('========================================');
    console.log('\nNext steps:');
    console.log('  1. Update APP_ENCRYPTION_KEY in all environments to the new key');
    console.log('  2. Restart the application');
    console.log('  3. Test that decryption works (check AI settings page)');
    console.log('  4. Keep the old key documented for 7 days in case of rollback');
    console.log('');

  } finally {
    await pool.end();
  }
}

// Run
rotateKeys().catch((error) => {
  console.error('\n[FATAL]', error.message);
  process.exit(1);
});
