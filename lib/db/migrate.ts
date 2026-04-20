import { readFileSync } from "fs";
import { join } from "path";
import { neon } from "@neondatabase/serverless";

async function migrate() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  const sql = neon(connectionString);

  const schema = readFileSync(join(__dirname, "schema.sql"), "utf-8");
  const statements = schema
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);

  for (const stmt of statements) {
    await sql.query(stmt);
    console.log("✓", stmt.slice(0, 60));
  }
  console.log("\nMigration complete.");
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
