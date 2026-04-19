import "server-only";
import { sql } from "./client";

export interface Turn {
  id: string;
  session_id: string;
  role: "user" | "assistant";
  content: string;
  is_stuck: boolean;
  created_at: string;
}

export async function insertTurn(
  turn: Omit<Turn, "id" | "is_stuck" | "created_at">,
): Promise<Turn> {
  const result = await sql<Turn>`
    INSERT INTO turns (session_id, role, content)
    VALUES (${turn.session_id}, ${turn.role}, ${turn.content})
    RETURNING *
  `;
  return result.rows[0];
}

export async function getTurns(sessionId: string, limit = 10): Promise<Turn[]> {
  const result = await sql<Turn>`
    SELECT * FROM turns
    WHERE session_id = ${sessionId}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
  return result.rows.reverse();
}

export async function markStuck(turnId: string): Promise<void> {
  await sql`UPDATE turns SET is_stuck = true WHERE id = ${turnId}`;
}
