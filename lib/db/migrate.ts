import { readFileSync } from "fs";
import { join } from "path";
import { query } from "./client";

async function migrate() {
  const schema = readFileSync(join(__dirname, "schema.sql"), "utf-8");
  const statements = schema.split(";").map((s) => s.trim()).filter(Boolean);
  for (const stmt of statements) {
    await query(stmt);
    console.log("✓", stmt.slice(0, 60));
  }
  console.log("\nMigration complete.");
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
