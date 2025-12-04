import { Pool, QueryResult, QueryResultRow } from 'pg';
import { logger } from './utils/logger';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * SECURITY FIX (H8/H9): SSL Configuration
 *
 * SSL mode options (controlled by DATABASE_SSL environment variable):
 * - 'false' or not set: No SSL (development only - local Docker)
 * - 'true': SSL enabled with certificate validation (production default)
 * - 'require-no-verify': SSL enabled but skip certificate validation
 *   (ONLY for Azure PostgreSQL with Azure-managed certificates or testing)
 *
 * In production:
 * - Use DATABASE_SSL=true with valid CA certificate
 * - Azure Database for PostgreSQL uses Azure-managed SSL by default
 *
 * See: docs/SECURITY-AUDIT-2025-12-04.md (H8, H9)
 */
function getSslConfig(): boolean | { rejectUnauthorized: boolean } {
  const sslMode = process.env.DATABASE_SSL;

  // Development: No SSL (local Docker PostgreSQL)
  if (sslMode !== 'true' && sslMode !== 'require-no-verify') {
    if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging') {
      logger.warn(
        '[SECURITY] DATABASE_SSL is not enabled in production/staging. ' +
        'This is insecure. Set DATABASE_SSL=true for production.'
      );
    }
    return false;
  }

  // Production: SSL with certificate validation
  if (sslMode === 'true') {
    // Full SSL with certificate validation
    // Azure PostgreSQL Flexible Server works with this setting
    return { rejectUnauthorized: true };
  }

  // Fallback: SSL without certificate validation
  // ONLY use for Azure-managed SSL or specific testing scenarios
  if (sslMode === 'require-no-verify') {
    logger.warn(
      '[SECURITY] Using SSL without certificate validation. ' +
      'This should only be used for Azure-managed certificates or testing.'
    );
    return { rejectUnauthorized: false };
  }

  return false;
}

/**
 * Database client singleton
 * Creates a connection pool to PostgreSQL
 */
export const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: getSslConfig(),
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

/**
 * Set tenant context for RLS
 * Must be called before any tenant-scoped queries
 *
 * SECURITY: Uses parameterized set_config to prevent SQL injection.
 * Never use string interpolation for tenant context.
 */
export async function setTenantContext(tenantId: string): Promise<void> {
  // Use set_config with parameters to safely set the tenant context
  // The third parameter 'true' makes it LOCAL (transaction-scoped)
  await db.query('SELECT set_config($1, $2, true)', ['app.tenant_id', tenantId]);
}

/**
 * Execute query with automatic tenant context
 *
 * SECURITY: Uses parameterized set_config to prevent SQL injection.
 * Never use string interpolation for tenant context.
 */
export async function queryWithTenant<T extends QueryResultRow = any>(
  tenantId: string,
  queryText: string,
  values?: any[]
): Promise<QueryResult<T>> {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    // SECURITY FIX: Use parameterized set_config instead of string interpolation
    await client.query('SELECT set_config($1, $2, true)', ['app.tenant_id', tenantId]);
    const result = await client.query<T>(queryText, values);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Check database health
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const result = await db.query('SELECT 1 as health');
    return result.rows[0].health === 1;
  } catch (error) {
    logger.error('Database health check failed:', error);
    return false;
  }
}
