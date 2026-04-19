import "server-only";
import { z } from "zod";

const EnvSchema = z.object({
  ANTHROPIC_API_KEY: z
    .string()
    .min(1, "ANTHROPIC_API_KEY is missing — get one at https://console.anthropic.com"),
  TAVUS_API_KEY: z
    .string()
    .min(1, "TAVUS_API_KEY is missing — get one at https://platform.tavus.io"),
  TAVUS_BACKUP_API_KEY: z.string().min(1).optional(),
  TAVUS_REPLICA_ID: z
    .string()
    .min(1, "TAVUS_REPLICA_ID is missing — set a default replica ID"),
  BLOB_READ_WRITE_TOKEN: z
    .string()
    .min(1, "BLOB_READ_WRITE_TOKEN is missing — run `vercel blob store add`")
    .optional(),
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is missing — set your Neon PostgreSQL connection string"),
});

function getEnv() {
  const parsed = EnvSchema.safeParse({
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    TAVUS_API_KEY: process.env.TAVUS_API_KEY,
    TAVUS_BACKUP_API_KEY: process.env.TAVUS_BACKUP_API_KEY?.trim() || undefined,
    TAVUS_REPLICA_ID: process.env.TAVUS_REPLICA_ID,
    BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN || undefined,
    DATABASE_URL: process.env.DATABASE_URL,
  });

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(
      `\n\nEnvironment variable validation failed:\n${issues}\n\nCopy .env.example to .env.local and fill in your credentials.\n`,
    );
  }

  return parsed.data;
}

let _env: ReturnType<typeof getEnv> | null = null;

export const env = new Proxy({} as ReturnType<typeof getEnv>, {
  get(_target, prop) {
    if (!_env) _env = getEnv();
    return _env[prop as keyof ReturnType<typeof getEnv>];
  },
});
