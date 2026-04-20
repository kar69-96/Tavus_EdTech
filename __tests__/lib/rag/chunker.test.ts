import { describe, it, expect } from "vitest";
import { chunkText } from "../../../lib/rag/chunker";

describe("chunkText", () => {
  it("returns empty array for empty string", () => {
    expect(chunkText("")).toEqual([]);
  });

  it("returns empty array for whitespace-only string", () => {
    expect(chunkText("   \n  ")).toEqual([]);
  });

  it("returns single chunk when text is shorter than size", () => {
    const result = chunkText("hello world foo bar");
    expect(result).toHaveLength(1);
    expect(result[0]).toBe("hello world foo bar");
  });

  it("returns single chunk when word count equals size", () => {
    const words = Array.from({ length: 500 }, (_, i) => `word${i}`);
    const result = chunkText(words.join(" "), { size: 500, overlap: 50 });
    expect(result).toHaveLength(1);
  });

  it("splits text into overlapping chunks", () => {
    const words = Array.from({ length: 20 }, (_, i) => `w${i}`);
    const text = words.join(" ");
    const result = chunkText(text, { size: 10, overlap: 2 });

    expect(result.length).toBeGreaterThan(1);
    // Each chunk should be at most 10 words
    for (const chunk of result) {
      expect(chunk.split(" ").length).toBeLessThanOrEqual(10);
    }
  });

  it("overlap causes last words of one chunk to appear at start of next", () => {
    const words = Array.from({ length: 15 }, (_, i) => `w${i}`);
    const result = chunkText(words.join(" "), { size: 10, overlap: 3 });

    if (result.length >= 2) {
      const firstChunkWords = result[0].split(" ");
      const secondChunkWords = result[1].split(" ");
      // The overlap: last 3 words of chunk 0 should be first 3 words of chunk 1
      const tail = firstChunkWords.slice(-3);
      const head = secondChunkWords.slice(0, 3);
      expect(tail).toEqual(head);
    }
  });

  it("uses default size=500 and overlap=50", () => {
    // 600 words should produce 2 chunks with default settings
    const words = Array.from({ length: 600 }, (_, i) => `word${i}`);
    const result = chunkText(words.join(" "));
    expect(result.length).toBeGreaterThanOrEqual(2);
  });

  it("handles multiline text", () => {
    const text = "line one\nline two\nline three";
    const result = chunkText(text);
    expect(result).toHaveLength(1);
    expect(result[0]).toContain("line");
  });

  it("each chunk is non-empty", () => {
    const words = Array.from({ length: 100 }, (_, i) => `w${i}`);
    const result = chunkText(words.join(" "), { size: 30, overlap: 5 });
    for (const chunk of result) {
      expect(chunk.trim().length).toBeGreaterThan(0);
    }
  });
});
