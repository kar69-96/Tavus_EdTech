import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("server-only", () => ({}));

// Mock neon — returns whatever mockQuery resolves to
const mockQuery = vi.fn();
vi.mock("@neondatabase/serverless", () => ({
  neon: () => mockQuery,
}));

describe("db/client", () => {
  beforeEach(() => {
    vi.resetModules();
    mockQuery.mockReset();
    process.env.DATABASE_URL = "postgres://user:pass@host/db";
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sql() returns { rows } on success", async () => {
    mockQuery.mockResolvedValueOnce([{ id: 1 }]);
    const { sql } = await import("../../../lib/db/client");
    const result = await sql`SELECT 1`;
    expect(result).toEqual({ rows: [{ id: 1 }] });
  });

  it("sql() wraps neon fetch failure as ConfigError", async () => {
    mockQuery.mockRejectedValueOnce(new Error("fetch failed"));
    const { sql } = await import("../../../lib/db/client");
    await expect(sql`SELECT 1`).rejects.toMatchObject({ name: "ConfigError", statusCode: 503 });
  });

  it("ConfigError from sql() has statusCode 503", async () => {
    mockQuery.mockRejectedValueOnce(new Error("network error"));
    const { sql } = await import("../../../lib/db/client");
    const err = await sql`SELECT 1`.catch((e) => e);
    expect(err.statusCode).toBe(503);
  });

  it("sql() preserves original error as cause", async () => {
    const rootCause = new Error("ECONNREFUSED");
    mockQuery.mockRejectedValueOnce(rootCause);
    const { sql } = await import("../../../lib/db/client");
    const err = await sql`SELECT 1`.catch((e) => e);
    expect(err.cause).toBe(rootCause);
  });

  it("sql() throws ConfigError when DATABASE_URL is missing", async () => {
    delete process.env.DATABASE_URL;
    const { sql } = await import("../../../lib/db/client");
    await expect(sql`SELECT 1`).rejects.toMatchObject({ name: "ConfigError", statusCode: 503 });
  });

  it("query() returns { rows } on success", async () => {
    mockQuery.mockResolvedValueOnce([{ count: 5 }]);
    const { query } = await import("../../../lib/db/client");
    const result = await query("SELECT count(*) FROM sessions");
    expect(result).toEqual({ rows: [{ count: 5 }] });
  });

  it("query() wraps failures as ConfigError", async () => {
    mockQuery.mockRejectedValueOnce(new Error("timeout"));
    const { query } = await import("../../../lib/db/client");
    await expect(query("SELECT 1")).rejects.toMatchObject({ name: "ConfigError", statusCode: 503 });
  });
});
