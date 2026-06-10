import { Pool, type PoolClient } from "pg";

let _pool: Pool | undefined;

export function getPool(): Pool {
  if (!_pool) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error(
        "DATABASE_URL environment variable is required. " +
          "Set it in .env (e.g. postgresql://user:password@localhost:5432/dbname).",
      );
    }
    _pool = new Pool({
      connectionString: url,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });
  }
  return _pool;
}

export async function query<T extends object = Record<string, unknown>>(
  sql: string,
  values?: unknown[],
): Promise<T[]> {
  const result = await getPool().query<T>(sql, values);
  return result.rows;
}

export async function queryOne<T extends object = Record<string, unknown>>(
  sql: string,
  values?: unknown[],
): Promise<T | undefined> {
  const rows = await query<T>(sql, values);
  return rows[0];
}

export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await query("SELECT 1");
    return true;
  } catch {
    return false;
  }
}
