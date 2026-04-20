import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const mockSearchChunksFTS = vi.fn();
vi.mock("../../../lib/db/chunks", () => ({
  searchChunksFTS: mockSearchChunksFTS,
}));

describe("formatSearchResults", () => {
  it("returns no-context message for empty results", async () => {
    const { formatSearchResults } = await import("../../../lib/rag/search");
    expect(formatSearchResults([])).toBe("No relevant context found.");
  });

  it("tags doc results with filename", async () => {
    const { formatSearchResults } = await import("../../../lib/rag/search");
    const result = formatSearchResults([
      { content: "photosynthesis uses sunlight", metadata: { filename: "bio.pdf" }, rank: 0.8 },
    ]);
    expect(result).toContain("[doc: bio.pdf]");
    expect(result).toContain("photosynthesis uses sunlight");
    expect(result).toContain("0.800");
  });

  it("tags turn results with role", async () => {
    const { formatSearchResults } = await import("../../../lib/rag/search");
    const result = formatSearchResults([
      { content: "I asked about quadratics", metadata: { role: "user" }, rank: 0.6 },
    ]);
    expect(result).toContain("[turn: user]");
  });

  it("tags tutorial results with title", async () => {
    const { formatSearchResults } = await import("../../../lib/rag/search");
    const result = formatSearchResults([
      { content: "Step explanation here", metadata: { step_id: "step-1", title: "Introduction" }, rank: 0.5 },
    ]);
    expect(result).toContain("[tutorial: Introduction]");
  });

  it("falls back to step_id when title is missing", async () => {
    const { formatSearchResults } = await import("../../../lib/rag/search");
    const result = formatSearchResults([
      { content: "content", metadata: { step_id: "step-2" }, rank: 0.4 },
    ]);
    expect(result).toContain("[tutorial: step-2]");
  });

  it("uses [context] tag for unknown metadata", async () => {
    const { formatSearchResults } = await import("../../../lib/rag/search");
    const result = formatSearchResults([
      { content: "some content", metadata: {}, rank: 0.3 },
    ]);
    expect(result).toContain("[context]");
  });

  it("separates multiple results with --- dividers", async () => {
    const { formatSearchResults } = await import("../../../lib/rag/search");
    const result = formatSearchResults([
      { content: "first", metadata: { role: "user" }, rank: 0.9 },
      { content: "second", metadata: { role: "assistant" }, rank: 0.7 },
    ]);
    expect(result).toContain("---");
  });
});

describe("searchChunks", () => {
  beforeEach(() => {
    vi.resetModules();
    mockSearchChunksFTS.mockReset();
  });

  it("calls searchChunksFTS with correct args", async () => {
    mockSearchChunksFTS.mockResolvedValueOnce([]);
    const { searchChunks } = await import("../../../lib/rag/search");
    await searchChunks({ sessionId: "abc", query: "test query", k: 3 });
    expect(mockSearchChunksFTS).toHaveBeenCalledWith("abc", "test query", 3);
  });

  it("defaults k to 5", async () => {
    mockSearchChunksFTS.mockResolvedValueOnce([]);
    const { searchChunks } = await import("../../../lib/rag/search");
    await searchChunks({ sessionId: "abc", query: "test" });
    expect(mockSearchChunksFTS).toHaveBeenCalledWith("abc", "test", 5);
  });

  it("caps k at 10", async () => {
    mockSearchChunksFTS.mockResolvedValueOnce([]);
    const { searchChunks } = await import("../../../lib/rag/search");
    await searchChunks({ sessionId: "abc", query: "test", k: 999 });
    expect(mockSearchChunksFTS).toHaveBeenCalledWith("abc", "test", 10);
  });

  it("returns results from searchChunksFTS", async () => {
    const fakeResults = [{ content: "hello", metadata: { role: "user" }, rank: 0.9 }];
    mockSearchChunksFTS.mockResolvedValueOnce(fakeResults);
    const { searchChunks } = await import("../../../lib/rag/search");
    const result = await searchChunks({ sessionId: "abc", query: "hello" });
    expect(result).toEqual(fakeResults);
  });
});
