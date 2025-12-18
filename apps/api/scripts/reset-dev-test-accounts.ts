#!/usr/bin/env tsx
/**
 * Reset Dev Test Accounts Script
 *
 * This script syncs development test accounts from environment variables into the database.
 * It creates/updates person records and role assignments for each dev account.
 *
 * Usage: npm run dev:reset-accounts
 *
 * SECURITY:
 * - This script refuses to run in production environments
 * - Passwords are hashed using bcrypt before storage
 * - No credentials are logged or exposed
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import * as bcrypt from 'bcrypt';
import { createPool, setTenantContext } from '@elder-first/database';

// Load environment variables from apps/web/.env.development.local
const envPath = path.resolve(__dirname, '../../web/.env.development.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

// Also try loading from apps/web/.env.local as fallback
const envLocalPath = path.resolve(__dirname, '../../web/.env.local');
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
}

// Also load from root .env
const rootEnvPath = path.resolve(__dirname, '../../../.env');
if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
}

// SECURITY: Refuse to run in production
if (process.env.NODE_ENV === 'production') {
  console.error('\n❌ ERROR: This script cannot run in production!\n');
  console.error('This script is for local development only.');
  console.error('Current NODE_ENV:', process.env.NODE_ENV);
  process.exit(1);
}

// Check for production database indicators
const dbUrl = process.env.DATABASE_URL || '';
if (dbUrl.includes('.database.azure.com') || dbUrl.includes('production')) {
  console.error('\n❌ ERROR: Production database detected!\n');
  console.error('This script is for local development only.');
  console.error('DATABASE_URL appears to point to a production database.');
  process.exit(1);
}

// Check required flags
const allowDevUsers = process.env.ALLOW_DEV_USERS === 'true';
if (!allowDevUsers) {
  console.error('\n❌ ERROR: ALLOW_DEV_USERS is not set to "true"\n');
  console.error('This safety flag must be enabled to run this script.');
  console.error('Set ALLOW_DEV_USERS=true in your .env.development.local file.');
  process.exit(1);
}

// Dev tenant ID - default to First Test Church
const DEV_TENANT_ID = process.env.DEV_TENANT_ID || '00000000-0000-0000-0000-000000000001';

// Map role names to database enum values
type DbRole = 'Admin' | 'Editor' | 'Submitter' | 'Viewer' | 'Kiosk';
const roleMap: Record<string, DbRole> = {
  admin: 'Admin',
  editor: 'Editor',
  submitter: 'Submitter',
  viewer: 'Viewer',
  kiosk: 'Kiosk',
};

// Define dev accounts (same as in auth.ts)
interface DevAccount {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  envVar: string;
  tenantId: string;
}

const devAccounts: DevAccount[] = [
  {
    id: 'dev-admin-1',
    email: 'admin@dev.com',
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin',
    envVar: 'DEV_ADMIN_PASSWORD',
    tenantId: DEV_TENANT_ID,
  },
  {
    id: 'dev-editor-1',
    email: 'editor@dev.com',
    firstName: 'Editor',
    lastName: 'User',
    role: 'editor',
    envVar: 'DEV_EDITOR_PASSWORD',
    tenantId: DEV_TENANT_ID,
  },
  {
    id: 'dev-submitter-1',
    email: 'submitter@dev.com',
    firstName: 'Submitter',
    lastName: 'User',
    role: 'submitter',
    envVar: 'DEV_SUBMITTER_PASSWORD',
    tenantId: DEV_TENANT_ID,
  },
  {
    id: 'dev-viewer-1',
    email: 'viewer@dev.com',
    firstName: 'Viewer',
    lastName: 'User',
    role: 'viewer',
    envVar: 'DEV_VIEWER_PASSWORD',
    tenantId: DEV_TENANT_ID,
  },
  {
    id: 'dev-kiosk-1',
    email: 'kiosk@dev.com',
    firstName: 'Kiosk',
    lastName: 'User',
    role: 'kiosk',
    envVar: 'DEV_KIOSK_PASSWORD',
    tenantId: DEV_TENANT_ID,
  },
  {
    id: 'pastor-test-1',
    email: 'pastor@testchurch.local',
    firstName: 'Pastor',
    lastName: 'Test',
    role: 'admin',
    envVar: 'DEV_PASTOR_PASSWORD',
    tenantId: '00000000-0000-0000-0000-000000000001', // Fixed UUID for 'firsttest' tenant
  },
];

// Bcrypt cost factor - 10 is a good balance of security and performance for dev
const BCRYPT_ROUNDS = 10;

async function resetDevAccounts() {
  console.log('\n🔄 Resetting Dev Test Accounts...\n');

  const pool = createPool();
  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  try {
    // First, ensure the dev tenant exists
    const tenantCheck = await pool.query(
      'SELECT id FROM tenant WHERE id = $1',
      [DEV_TENANT_ID]
    );

    if (tenantCheck.rows.length === 0) {
      console.log(`Creating dev tenant: ${DEV_TENANT_ID}`);
      await pool.query(`
        INSERT INTO tenant (id, slug, name, status, timezone, locale)
        VALUES ($1, 'devtenant', 'Development Tenant', 'active', 'America/New_York', 'en-US')
        ON CONFLICT (id) DO NOTHING
      `, [DEV_TENANT_ID]);
    }

    // Process each dev account
    for (const account of devAccounts) {
      const password = process.env[account.envVar];

      // Skip if password not set or too short
      if (!password || password.length < 8) {
        console.log(`  ⏭️  ${account.email.padEnd(28)} - Skipped (${account.envVar} not set or too short)`);
        skipCount++;
        continue;
      }

      try {
        // Ensure the tenant exists for this account
        if (account.tenantId !== DEV_TENANT_ID) {
          const specificTenantCheck = await pool.query(
            'SELECT id FROM tenant WHERE id = $1',
            [account.tenantId]
          );

          if (specificTenantCheck.rows.length === 0) {
            await pool.query(`
              INSERT INTO tenant (id, slug, name, status, timezone, locale)
              VALUES ($1, 'firsttest', 'First Test Church', 'active', 'America/New_York', 'en-US')
              ON CONFLICT (id) DO NOTHING
            `, [account.tenantId]);
          }
        }

        // Set tenant context for RLS
        await setTenantContext(pool, account.tenantId);

        // Hash the password
        const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

        // Upsert person record using SELECT/INSERT/UPDATE pattern
        // The person table doesn't have a UNIQUE constraint on email, so we do it manually
        let finalPersonId: string;

        // Check if person exists
        const existingPerson = await pool.query(`
          SELECT id FROM person
          WHERE tenant_id = $1 AND email = $2 AND deleted_at IS NULL
        `, [account.tenantId, account.email]);

        if (existingPerson.rows.length > 0) {
          // Update existing person
          finalPersonId = existingPerson.rows[0].id;
          await pool.query(`
            UPDATE person SET
              first_name = $1,
              last_name = $2,
              external_id = $3,
              updated_at = NOW()
            WHERE id = $4
          `, [account.firstName, account.lastName, account.id, finalPersonId]);
        } else {
          // Insert new person
          const personResult = await pool.query(`
            INSERT INTO person (
              tenant_id,
              first_name,
              last_name,
              email,
              membership_status,
              external_id
            )
            VALUES ($1, $2, $3, $4, 'member', $5)
            RETURNING id
          `, [account.tenantId, account.firstName, account.lastName, account.email, account.id]);
          finalPersonId = personResult.rows[0].id;
        }

        if (!finalPersonId) {
          throw new Error(`Could not get person ID for ${account.email}`);
        }

        // Upsert role assignment
        const dbRole = roleMap[account.role];
        if (dbRole) {
          // Check if role already exists
          const existingRole = await pool.query(`
            SELECT id FROM role_assignment
            WHERE tenant_id = $1 AND person_id = $2 AND role = $3 AND deleted_at IS NULL
          `, [account.tenantId, finalPersonId, dbRole]);

          if (existingRole.rows.length === 0) {
            await pool.query(`
              INSERT INTO role_assignment (tenant_id, person_id, role)
              VALUES ($1, $2, $3)
            `, [account.tenantId, finalPersonId, dbRole]);
          }
        }

        // Store the password hash in a dev_credentials table (create if needed)
        // Since the schema doesn't have a password column, we'll create a separate table
        await ensureDevCredentialsTable(pool);

        await pool.query(`
          INSERT INTO dev_credentials (person_id, email, password_hash, tenant_id)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (email)
          DO UPDATE SET
            password_hash = EXCLUDED.password_hash,
            person_id = EXCLUDED.person_id,
            tenant_id = EXCLUDED.tenant_id,
            updated_at = NOW()
        `, [finalPersonId, account.email, passwordHash, account.tenantId]);

        console.log(`  ✅ ${account.email.padEnd(28)} - Synced (${account.role})`);
        successCount++;

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error(`  ❌ ${account.email.padEnd(28)} - Error: ${errorMessage}`);
        errorCount++;
      }
    }

    // Summary
    console.log('\n' + '─'.repeat(60));
    console.log(`\n✅ Summary:`);
    console.log(`   Synced:  ${successCount} accounts`);
    console.log(`   Skipped: ${skipCount} accounts (no password configured)`);
    console.log(`   Errors:  ${errorCount} accounts`);

    if (successCount > 0) {
      console.log(`\n📝 Note: Passwords are stored as bcrypt hashes in dev_credentials table.`);
      console.log(`   The NextAuth in-memory auth still works for login.`);
      console.log(`   Database records are for future DB-backed auth support.\n`);
    }

    if (skipCount > 0) {
      console.log(`\n⚠️  To sync skipped accounts, set their passwords in .env.development.local:`);
      for (const account of devAccounts) {
        const password = process.env[account.envVar];
        if (!password || password.length < 8) {
          console.log(`   ${account.envVar}=your_password_here`);
        }
      }
      console.log('');
    }

  } catch (error) {
    console.error('\n❌ Reset failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

/**
 * Ensure the dev_credentials table exists.
 * This table stores password hashes for dev accounts separately from the person table.
 */
async function ensureDevCredentialsTable(pool: ReturnType<typeof createPool>) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS dev_credentials (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      person_id UUID REFERENCES person(id) ON DELETE CASCADE,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Add comment explaining this is dev-only
  await pool.query(`
    COMMENT ON TABLE dev_credentials IS
    'DEV ONLY: Stores bcrypt password hashes for dev test accounts. NOT for production use.'
  `);
}

// Run the script
resetDevAccounts();
