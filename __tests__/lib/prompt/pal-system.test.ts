import { describe, it, expect } from "vitest";
import { composeTutorSystemPrompt } from "../../../lib/prompt/pal-system";

describe("composeTutorSystemPrompt", () => {
  it("works with no arguments", () => {
    const prompt = composeTutorSystemPrompt();
    expect(prompt).toContain("Tutor");
    expect(prompt).toContain("rag_search");
  });

  it("includes uploaded filenames when provided", () => {
    const prompt = composeTutorSystemPrompt({ docFilenames: ["notes.pdf", "algebra.docx"] });
    expect(prompt).toContain("notes.pdf");
    expect(prompt).toContain("algebra.docx");
  });

  it("includes tutorial hint when hasTutorial=true", () => {
    const prompt = composeTutorSystemPrompt({ hasTutorial: true });
    expect(prompt).toContain("tutorial");
  });

  it("does NOT include tutorial hint when hasTutorial=false", () => {
    const prompt = composeTutorSystemPrompt({ hasTutorial: false });
    expect(prompt).not.toContain("tutorial has been prepared");
  });

  it("instructs model to search before saying it lacks context when docs are present", () => {
    const prompt = composeTutorSystemPrompt({ docFilenames: ["hw.pdf"] });
    expect(prompt).toContain("do not say you lack context without searching first");
  });

  it("uses softer fallback instruction when no docs and no tutorial", () => {
    const prompt = composeTutorSystemPrompt({});
    expect(prompt).toContain("Call rag_search if you need to recall");
  });

  it("contains whiteboard instruction", () => {
    const prompt = composeTutorSystemPrompt();
    expect(prompt).toMatch(/whiteboard tool|whiteboard/i);
  });

  it("mentions prior_whiteboard_id for in-place revisions", () => {
    const prompt = composeTutorSystemPrompt();
    expect(prompt).toContain("prior_whiteboard_id");
  });

  it("does not discourage frequent whiteboard use", () => {
    const prompt = composeTutorSystemPrompt();
    expect(prompt.toLowerCase()).not.toContain("do not spam");
    expect(prompt.toLowerCase()).not.toContain("avoid calling");
    expect(prompt.toLowerCase()).not.toContain("don't call");
  });

  it("does not include markdown instruction violations", () => {
    const prompt = composeTutorSystemPrompt();
    expect(prompt).toContain("Never use markdown");
  });
});
