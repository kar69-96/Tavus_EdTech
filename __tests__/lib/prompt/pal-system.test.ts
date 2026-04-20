import { describe, it, expect } from "vitest";
import { composePalSystemPrompt } from "../../../lib/prompt/pal-system";

describe("composePalSystemPrompt", () => {
  it("works with no arguments", () => {
    const prompt = composePalSystemPrompt();
    expect(prompt).toContain("PAL");
    expect(prompt).toContain("rag_search");
  });

  it("includes uploaded filenames when provided", () => {
    const prompt = composePalSystemPrompt({ docFilenames: ["notes.pdf", "algebra.docx"] });
    expect(prompt).toContain("notes.pdf");
    expect(prompt).toContain("algebra.docx");
  });

  it("includes tutorial hint when hasTutorial=true", () => {
    const prompt = composePalSystemPrompt({ hasTutorial: true });
    expect(prompt).toContain("tutorial");
  });

  it("does NOT include tutorial hint when hasTutorial=false", () => {
    const prompt = composePalSystemPrompt({ hasTutorial: false });
    expect(prompt).not.toContain("tutorial has been prepared");
  });

  it("instructs model to search before saying it lacks context when docs are present", () => {
    const prompt = composePalSystemPrompt({ docFilenames: ["hw.pdf"] });
    expect(prompt).toContain("do not say you lack context without searching first");
  });

  it("uses softer fallback instruction when no docs and no tutorial", () => {
    const prompt = composePalSystemPrompt({});
    expect(prompt).toContain("Call rag_search if you need to recall");
  });

  it("contains whiteboard instruction", () => {
    const prompt = composePalSystemPrompt();
    expect(prompt).toMatch(/whiteboard tool|whiteboard/i);
  });

  it("mentions prior_whiteboard_id for in-place revisions", () => {
    const prompt = composePalSystemPrompt();
    expect(prompt).toContain("prior_whiteboard_id");
  });

  it("does not discourage frequent whiteboard use", () => {
    const prompt = composePalSystemPrompt();
    expect(prompt.toLowerCase()).not.toContain("do not spam");
    expect(prompt.toLowerCase()).not.toContain("avoid calling");
    expect(prompt.toLowerCase()).not.toContain("don't call");
  });

  it("does not include markdown instruction violations", () => {
    const prompt = composePalSystemPrompt();
    expect(prompt).toContain("Never use markdown");
  });
});
