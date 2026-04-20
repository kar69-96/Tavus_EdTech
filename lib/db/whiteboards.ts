import "server-only";
import { sql } from "./client";

export interface Whiteboard {
  id: string;
  session_id: string;
  blob_url: string | null;
  html: string | null;
  widget_type: "html" | "d3";
  prompt: string;
  created_at: string;
}

export async function insertWhiteboard(
  wb: Omit<Whiteboard, "id" | "created_at">,
): Promise<Whiteboard> {
  const result = await sql<Whiteboard>`
    INSERT INTO whiteboards (session_id, blob_url, html, widget_type, prompt)
    VALUES (${wb.session_id}, ${wb.blob_url}, ${wb.html}, ${wb.widget_type}, ${wb.prompt})
    RETURNING *
  `;
  return result.rows[0];
}

export async function getWhiteboardByIdForSession(
  id: string,
  sessionId: string,
): Promise<Whiteboard | null> {
  const result = await sql<Whiteboard>`
    SELECT * FROM whiteboards
    WHERE id = ${id} AND session_id = ${sessionId}
    LIMIT 1
  `;
  return result.rows[0] ?? null;
}

export async function updateWhiteboardHtml(options: {
  id: string;
  session_id: string;
  html: string;
  prompt: string;
}): Promise<Whiteboard | null> {
  const { id, session_id, html, prompt } = options;
  const result = await sql<Whiteboard>`
    UPDATE whiteboards
    SET html = ${html}, prompt = ${prompt}, blob_url = NULL
    WHERE id = ${id} AND session_id = ${session_id}
    RETURNING *
  `;
  return result.rows[0] ?? null;
}
