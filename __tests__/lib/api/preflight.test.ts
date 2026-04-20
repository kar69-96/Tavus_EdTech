import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockSql = vi.fn();
vi.mock("../../../lib/db/client", () => ({ sql: mockSql }));

const VALID_ENV = {
  ANTHROPIC_API_KEY: "sk-ant-test",
  TAVUS_API_KEY: "tvs-test",
  TAVUS_REPLICA_ID: "replica-test",
  DATABASE_URL: "postgres://user:pass@host/db",
};

describe("preflight", () => {
  beforeEach(() => {
    vi.resetModules();
    mockSql.mockReset();
    Object.assign(process.env, VALID_ENV);
  });

  describe("assertAnthropicReady", () => {
    it("resolves when key is present", async () => {
      const { assertAnthropicReady } = await import("../../../lib/api/preflight");
      await expect(assertAnthropicReady()).resolves.toBeUndefined();
    });

    it("throws when ANTHROPIC_API_KEY is missing", async () => {
      delete process.env.ANTHROPIC_API_KEY;
      const { assertAnthropicReady } = await import("../../../lib/api/preflight");
      await expect(assertAnthropicReady()).rejects.toThrow(/ANTHROPIC_API_KEY/);
    });
  });

  describe("assertDbReady", () => {
    it("resolves when SELECT 1 succeeds", async () => {
      mockSql.mockResolvedValueOnce({ rows: [{ "?column?": 1 }] });
      const { assertDbReady } = await import("../../../lib/api/preflight");
      await expect(assertDbReady()).resolves.toBeUndefined();
    });

    it("throws with name ConfigError and statusCode 503 when SELECT 1 fails", async () => {
      mockSql.mockRejectedValueOnce(new Error("fetch failed"));
      const { assertDbReady } = await import("../../../lib/api/preflight");
      const err = await assertDbReady().catch((e) => e);
      expect(err).toMatchObject({ name: "ConfigError", statusCode: 503 });
    });

    it("preserves existing ConfigError message when db client already throws one", async () => {
      const existing = { name: "ConfigError", statusCode: 503, message: "DB unreachable" };
      mockSql.mockRejectedValueOnce(Object.assign(new Error("DB unreachable"), existing));
      const { assertDbReady } = await import("../../../lib/api/preflight");
      const err = await assertDbReady().catch((e) => e);
      expect(err.message).toBe("DB unreachable");
    });

    it("thrown error has statusCode 503", async () => {
      mockSql.mockRejectedValueOnce(new Error("ECONNREFUSED"));
      const { assertDbReady } = await import("../../../lib/api/preflight");
      const err = await assertDbReady().catch((e) => e);
      expect(err.statusCode).toBe(503);
    });
  });
});
