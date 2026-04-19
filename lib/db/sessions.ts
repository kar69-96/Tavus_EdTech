import "server-only";
import { sql } from "./client";

export interface Session {
  id: string;
  created_at: string;
  homework: string | null;
  tutorial_blob_url: string | null;
}

export async function createSession(homework?: string): Promise<Session> {
  const result = await sql<Session>`
    INSERT INTO sessions (homework)
    VALUES (${homework ?? null})
    RETURNING *
  `;
  return result.rows[0];
}

export async function getSession(id: string): Promise<Session | null> {
  const result = await sql<Session>`
    SELECT * FROM sessions WHERE id = ${id}
  `;
  return result.rows[0] ?? null;
}

export async function setTutorialBlobUrl(
  sessionId: string,
  url: string,
): Promise<void> {
  await sql`
    UPDATE sessions SET tutorial_blob_url = ${url} WHERE id = ${sessionId}
  `;
}
