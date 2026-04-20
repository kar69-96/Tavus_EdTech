import { describe, it, expect } from "vitest";
import { whiteboardPersistBodySchema } from "../../../lib/whiteboard/persist-body";

describe("whiteboardPersistBodySchema", () => {
  it("accepts minimal valid body", () => {
    const r = whiteboardPersistBodySchema.safeParse({
      sessionId: "550e8400-e29b-41d4-a716-446655440000",
      concept: "Graph y = x^2",
    });
    expect(r.success).toBe(true);
  });

  it("accepts priorWhiteboardId as UUID", () => {
    const r = whiteboardPersistBodySchema.safeParse({
      sessionId: "550e8400-e29b-41d4-a716-446655440000",
      concept: "Add labels",
      priorWhiteboardId: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
    });
    expect(r.success).toBe(true);
  });

  it("rejects invalid priorWhiteboardId", () => {
    const r = whiteboardPersistBodySchema.safeParse({
      sessionId: "550e8400-e29b-41d4-a716-446655440000",
      concept: "x",
      priorWhiteboardId: "not-a-uuid",
    });
    expect(r.success).toBe(false);
  });

  it("rejects empty concept", () => {
    const r = whiteboardPersistBodySchema.safeParse({
      sessionId: "550e8400-e29b-41d4-a716-446655440000",
      concept: "",
    });
    expect(r.success).toBe(false);
  });
});
