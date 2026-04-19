import "server-only";
import { sql } from "./client";

export interface Whiteboard {
  id: string;
  session_id: string;
  blob_url: string;
  widget_type: "html" | "d3";
  prompt: string;
  created_at: string;
}

export async function insertWhiteboard(
  wb: Omit<Whiteboard, "id" | "created_at">,
): Promise<Whiteboard> {
  const result = await sql<Whiteboard>`
    INSERT INTO whiteboards (session_id, blob_url, widget_type, prompt)
    VALUES (${wb.session_id}, ${wb.blob_url}, ${wb.widget_type}, ${wb.prompt})
    RETURNING *
  `;
  return result.rows[0];
}
