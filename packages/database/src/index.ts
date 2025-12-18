import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';
import { resolve } from 'path';

// Load .env from project root
dotenv.config({ path: resolve(__dirname, '../../../.env') });

export interface DatabaseConfig extends PoolConfig {
  connectionString?: string;
}

export function createPool(config?: DatabaseConfig): Pool {
  const poolConfig: PoolConfig = config || {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  };

  return new Pool(poolConfig);
}

/**
 * Set tenant context for RLS (Row-Level Security).
 *
 * SECURITY FIX (LOW-001, 2025-12-06): Uses parameterized set_config to prevent SQL injection.
 * The third parameter 'true' makes the setting LOCAL (transaction-scoped).
 *
 * @param pool - PostgreSQL connection pool
 * @param tenantId - UUID of the tenant to set as context
 */
export async function setTenantContext(pool: Pool, tenantId: string): Promise<void> {
  await pool.query('SELECT set_config($1, $2, true)', ['app.tenant_id', tenantId]);
}

export async function healthCheck(pool: Pool): Promise<boolean> {
  try {
    const result = await pool.query('SELECT 1 as health');
    return result.rows[0].health === 1;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

// Export pool singleton
export const pool = createPool();
