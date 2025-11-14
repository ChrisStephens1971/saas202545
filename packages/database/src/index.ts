import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

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

export async function setTenantContext(pool: Pool, tenantId: string): Promise<void> {
  await pool.query(`SET app.tenant_id = '${tenantId}'`);
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
