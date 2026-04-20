import "server-only";
import { sql } from "./client";

export interface Session {
  id: string;
  created_at: string;
  homework: string | null;
  tutorial_blob_url: string | null;
}

export async function createSession(homework?: string, id?: string): Promise<Session> {
  const result = await sql<Session>`
    INSERT INTO sessions (id, homework)
    VALUES (${id ?? null}::uuid, ${homework ?? null})
    ON CONFLICT (id) DO UPDATE SET homework = EXCLUDED.homework
    RETURNING *
  `;
  return result.rows[0];
}

/** Ensures a sessions row exists for FK (chunks, whiteboards). Does not overwrite existing rows. */
export async function ensureSession(id: string): Promise<void> {
  await sql`
    INSERT INTO sessions (id) VALUES (${id}::uuid)
    ON CONFLICT (id) DO NOTHING
  `;
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
