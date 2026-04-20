import { describe, it, expect, beforeEach, vi } from "vitest";

// server-only is mocked globally in vitest.setup.ts
vi.mock("server-only", () => ({}));

const REQUIRED_VARS = {
  ANTHROPIC_API_KEY: "sk-ant-test",
  TAVUS_API_KEY: "tvs-test",
  TAVUS_REPLICA_ID: "replica-test",
  DATABASE_URL: "postgres://user:pass@host/db",
};

function setEnv(overrides: Record<string, string | undefined> = {}) {
  const merged = { ...REQUIRED_VARS, ...overrides };
  for (const [k, v] of Object.entries(merged)) {
    if (v === undefined) {
      delete process.env[k];
    } else {
      process.env[k] = v;
    }
  }
}

describe("env proxy", () => {
  beforeEach(() => {
    vi.resetModules();
    setEnv();
  });

  it("returns ANTHROPIC_API_KEY when present", async () => {
    setEnv({ ANTHROPIC_API_KEY: "sk-ant-valid" });
    const { env } = await import("../../../lib/api/env");
    expect(env.ANTHROPIC_API_KEY).toBe("sk-ant-valid");
  });

  it("throws when ANTHROPIC_API_KEY is missing", async () => {
    setEnv({ ANTHROPIC_API_KEY: undefined });
    const { env } = await import("../../../lib/api/env");
    expect(() => env.ANTHROPIC_API_KEY).toThrow(/ANTHROPIC_API_KEY/);
  });

  it("throws when DATABASE_URL is missing", async () => {
    setEnv({ DATABASE_URL: undefined });
    const { env } = await import("../../../lib/api/env");
    expect(() => env.DATABASE_URL).toThrow(/DATABASE_URL/);
  });

  it("treats whitespace-only TAVUS_BACKUP_API_KEY as absent", async () => {
    process.env.TAVUS_BACKUP_API_KEY = "   ";
    const { env } = await import("../../../lib/api/env");
    expect(env.TAVUS_BACKUP_API_KEY).toBeUndefined();
  });

  it("optional BLOB_READ_WRITE_TOKEN can be absent", async () => {
    delete process.env.BLOB_READ_WRITE_TOKEN;
    const { env } = await import("../../../lib/api/env");
    expect(env.BLOB_READ_WRITE_TOKEN).toBeUndefined();
  });
});
