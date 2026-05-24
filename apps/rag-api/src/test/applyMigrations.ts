import { readFile, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type { Pool } from 'pg';

export async function applyMigrations(pool: Pool): Promise<void> {
  const migrationsDir = resolve(process.cwd(), '../../infra/migrations');
  const migrationFiles = (await readdir(migrationsDir))
    .filter((file) => file.endsWith('.sql'))
    .sort();

  for (const migrationFile of migrationFiles) {
    const sql = await readFile(join(migrationsDir, migrationFile), 'utf-8');
    await pool.query(sql);
  }
}
