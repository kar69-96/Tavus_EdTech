import "server-only";
import { VercelPool } from "@vercel/postgres";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set — add it to .env.local");
}

// VercelPool bypasses the pooler-URL check; sql() uses Neon's HTTP driver (stateless)
const pool = new VercelPool({ connectionString });

export const sql = pool.sql.bind(pool) as typeof pool.sql;
export const query = pool.query.bind(pool);
