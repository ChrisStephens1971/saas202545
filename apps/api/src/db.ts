import { Pool, QueryResult, QueryResultRow } from 'pg';
import { logger } from './utils/logger';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Database client singleton
 * Creates a connection pool to PostgreSQL
 */
export const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

/**
 * Set tenant context for RLS
 * Must be called before any tenant-scoped queries
 */
export async function setTenantContext(tenantId: string): Promise<void> {
  await db.query(`SET LOCAL app.tenant_id = '${tenantId}'`);
}

/**
 * Execute query with automatic tenant context
 */
export async function queryWithTenant<T extends QueryResultRow = any>(
  tenantId: string,
  queryText: string,
  values?: any[]
): Promise<QueryResult<T>> {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SET LOCAL app.tenant_id = '${tenantId}'`);
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
