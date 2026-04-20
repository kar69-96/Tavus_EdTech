import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const mockInsertChunks = vi.fn();
vi.mock("../../../lib/db/chunks", () => ({
  insertChunks: mockInsertChunks,
}));

describe("indexChunks", () => {
  beforeEach(() => {
    vi.resetModules();
    mockInsertChunks.mockReset();
    mockInsertChunks.mockResolvedValue([{ id: "chunk-1" }]);
  });

  it("inserts a single chunk for source_type=turn (no splitting)", async () => {
    const { indexChunks } = await import("../../../lib/rag/index");
    const longText = Array.from({ length: 600 }, (_, i) => `w${i}`).join(" ");
    await indexChunks({ sessionId: "s1", sourceType: "turn", text: longText });

    expect(mockInsertChunks).toHaveBeenCalledTimes(1);
    const [chunks] = mockInsertChunks.mock.calls[0] as [{ content: string }[]];
    expect(chunks).toHaveLength(1);
    expect(chunks[0].content).toBe(longText);
  });

  it("splits doc text into multiple chunks", async () => {
    const { indexChunks } = await import("../../../lib/rag/index");
    const longText = Array.from({ length: 1100 }, (_, i) => `w${i}`).join(" ");
    await indexChunks({ sessionId: "s1", sourceType: "doc", text: longText });

    const [chunks] = mockInsertChunks.mock.calls[0] as [{ content: string }[]];
    expect(chunks.length).toBeGreaterThan(1);
  });

  it("passes session_id and source_type to insertChunks", async () => {
    const { indexChunks } = await import("../../../lib/rag/index");
    await indexChunks({ sessionId: "sess-abc", sourceType: "tutorial", text: "some explanation" });

    const [chunks] = mockInsertChunks.mock.calls[0] as [{
      session_id: string;
      source_type: string;
    }[]];
    expect(chunks[0].session_id).toBe("sess-abc");
    expect(chunks[0].source_type).toBe("tutorial");
  });

  it("passes source_id when provided", async () => {
    const { indexChunks } = await import("../../../lib/rag/index");
    await indexChunks({
      sessionId: "s1",
      sourceType: "doc",
      sourceId: "doc-uuid",
      text: "content",
    });
    const [chunks] = mockInsertChunks.mock.calls[0] as [{ source_id: string | null }[]];
    expect(chunks[0].source_id).toBe("doc-uuid");
  });

  it("sets source_id to null when not provided", async () => {
    const { indexChunks } = await import("../../../lib/rag/index");
    await indexChunks({ sessionId: "s1", sourceType: "turn", text: "hello" });
    const [chunks] = mockInsertChunks.mock.calls[0] as [{ source_id: string | null }[]];
    expect(chunks[0].source_id).toBeNull();
  });

  it("passes metadata to each chunk", async () => {
    const { indexChunks } = await import("../../../lib/rag/index");
    await indexChunks({
      sessionId: "s1",
      sourceType: "turn",
      text: "hello",
      metadata: { role: "user" },
    });
    const [chunks] = mockInsertChunks.mock.calls[0] as [{ metadata: Record<string, unknown> }[]];
    expect(chunks[0].metadata).toEqual({ role: "user" });
  });

  it("returns chunk ids from insertChunks", async () => {
    mockInsertChunks.mockResolvedValueOnce([{ id: "id-1" }, { id: "id-2" }]);
    const { indexChunks } = await import("../../../lib/rag/index");
    const result = await indexChunks({ sessionId: "s1", sourceType: "doc", text: "text" });
    expect(result).toEqual([{ id: "id-1" }, { id: "id-2" }]);
  });
});
