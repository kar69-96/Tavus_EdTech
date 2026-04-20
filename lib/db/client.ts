import "server-only";
import { neon } from "@neondatabase/serverless";
import { ConfigError } from "../errors";

let _sql: ReturnType<typeof neon> | null = null;

function getSql(): ReturnType<typeof neon> {
  if (!_sql) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new ConfigError("DATABASE_URL is not set — add it to .env.local");
    }
    _sql = neon(connectionString);
  }
  return _sql;
}

export function sql<T = Record<string, unknown>>(
  strings: TemplateStringsArray,
  ...values: unknown[]
): Promise<{ rows: T[] }> {
  let neonSql: ReturnType<typeof neon>;
  try {
    neonSql = getSql();
  } catch (err) {
    return Promise.reject(err);
  }
  return neonSql(strings, ...values)
    .then((rows) => ({ rows: rows as T[] }))
    .catch((err) => Promise.reject(new ConfigError("Database query failed", err)));
}

export const query = (text: string, values?: unknown[]) => {
  let neonSql: ReturnType<typeof neon>;
  try {
    neonSql = getSql();
  } catch (err) {
    return Promise.reject(err);
  }
  return neonSql(text as unknown as TemplateStringsArray, ...(values ?? []))
    .then((rows) => ({ rows }))
    .catch((err) => Promise.reject(new ConfigError("Database query failed", err)));
};
