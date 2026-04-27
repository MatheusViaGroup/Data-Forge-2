import { Pool, PoolConfig, QueryResult } from "pg";

const schema = "via_core";

const poolConfig: PoolConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
};

const pool = new Pool(poolConfig);

pool.on("error", (err) => {
  console.error("[DB] Unexpected pool error:", err.message);
});

/**
 * Executa uma query SQL parametrizada.
 * Use $1, $2, ... para parametros (previne SQL injection).
 */
export async function query<T extends Record<string, unknown> = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  const result = await pool.query<T>(text, params);
  const duration = Date.now() - start;
  if (duration > 1000) {
    console.warn(`[DB] Slow query (${duration}ms):`, text.slice(0, 100));
  }
  return result;
}

/**
 * Retorna o nome completo da tabela com schema: via_core.tabela
 */
export function table(name: string): string {
  return `${schema}.${name}`;
}

/**
 * Busca uma unica linha. Retorna null se nao encontrar.
 */
export async function queryOne<T extends Record<string, unknown> = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<T | null> {
  const { rows } = await query<T>(text, params);
  return rows[0] || null;
}

export { pool };
