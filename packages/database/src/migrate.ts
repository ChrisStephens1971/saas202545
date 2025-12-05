import { Pool } from 'pg';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { createPool } from './index';

interface Migration {
  id: number;
  name: string;
  executedAt: Date;
}

async function createMigrationsTable(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      executed_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
}

async function getExecutedMigrations(pool: Pool): Promise<Set<string>> {
  const result = await pool.query<Migration>('SELECT name FROM migrations ORDER BY id');
  return new Set(result.rows.map(row => row.name));
}

async function executeMigration(pool: Pool, name: string, sql: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('INSERT INTO migrations (name) VALUES ($1)', [name]);
    await client.query('COMMIT');
    console.log(`✓ Executed migration: ${name}`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`✗ Failed migration: ${name}`, error);
    throw error;
  } finally {
    client.release();
  }
}

async function migrate(direction: 'up' | 'down' = 'up'): Promise<void> {
  const pool = createPool();

  try {
    await createMigrationsTable(pool);
    const executed = await getExecutedMigrations(pool);

    const migrationsDir = join(__dirname, '../migrations');
    const files = readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    if (direction === 'up') {
      for (const file of files) {
        if (!executed.has(file)) {
          const sql = readFileSync(join(migrationsDir, file), 'utf-8');
          await executeMigration(pool, file, sql);
        } else {
          console.log(`⊙ Skipping (already executed): ${file}`);
        }
      }
      console.log('✓ All migrations complete');
    } else {
      console.log('Down migrations not implemented yet');
    }
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

const direction = (process.argv[2] || 'up') as 'up' | 'down';
migrate(direction);
