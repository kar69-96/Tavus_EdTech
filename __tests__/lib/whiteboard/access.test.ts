import { describe, it, expect } from "vitest";
import { canServeWhiteboardToSession } from "../../../lib/whiteboard/access";
import type { Whiteboard } from "../../../lib/db/whiteboards";

function row(partial: Partial<Whiteboard>): Whiteboard {
  return {
    id: partial.id ?? "550e8400-e29b-41d4-a716-446655440000",
    session_id: partial.session_id ?? "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
    blob_url: partial.blob_url ?? null,
    html: partial.html ?? null,
    widget_type: partial.widget_type ?? "d3",
    prompt: partial.prompt ?? "p",
    created_at: partial.created_at ?? "2020-01-01T00:00:00.000Z",
  };
}

describe("canServeWhiteboardToSession", () => {
  it("allows html for matching session", () => {
    const sid = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
    expect(canServeWhiteboardToSession(row({ session_id: sid, html: "<html></html>" }), sid)).toBe(
      true,
    );
  });

  it("denies session mismatch", () => {
    const wb = row({
      session_id: "11111111-1111-1111-1111-111111111111",
      html: "<html></html>",
    });
    expect(canServeWhiteboardToSession(wb, "22222222-2222-2222-2222-222222222222")).toBe(false);
  });

  it("denies null row", () => {
    expect(canServeWhiteboardToSession(null, "6ba7b810-9dad-11d1-80b4-00c04fd430c8")).toBe(false);
  });

  it("denies empty html and no blob_url", () => {
    const sid = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
    expect(canServeWhiteboardToSession(row({ session_id: sid, html: null, blob_url: null }), sid)).toBe(
      false,
    );
  });

  it("allows blob_url only when session matches (legacy)", () => {
    const sid = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
    expect(
      canServeWhiteboardToSession(
        row({ session_id: sid, html: null, blob_url: "https://example.com/w.html" }),
        sid,
      ),
    ).toBe(true);
  });
});
