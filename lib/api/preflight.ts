import "server-only";
import { env } from "./env";
import { sql } from "../db/client";
import { ConfigError } from "../errors";

export async function assertAnthropicReady(): Promise<void> {
  // Triggers Zod validation — throws if key is missing or empty
  void env.ANTHROPIC_API_KEY;
}

export async function assertDbReady(): Promise<void> {
  try {
    await sql`SELECT 1`;
  } catch (err) {
    // Check by name to survive module-instance boundaries (e.g., test resets)
    const isAlreadyConfigError = err instanceof Error && err.name === "ConfigError";
    throw isAlreadyConfigError
      ? err
      : new ConfigError("Database connection failed — check DATABASE_URL", err);
  }
}
