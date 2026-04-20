import type { Whiteboard } from "../db/whiteboards";

/** Whether this row may be served to a client for the given session (pure, unit-testable). */
export function canServeWhiteboardToSession(
  row: Whiteboard | null,
  sessionId: string | null,
): row is Whiteboard {
  if (!row || !sessionId) return false;
  if (row.session_id !== sessionId) return false;
  return !!(row.html?.trim() || row.blob_url?.trim());
}
