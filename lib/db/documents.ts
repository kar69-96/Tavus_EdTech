import "server-only";
import { sql } from "./client";

export interface Document {
  id: string;
  session_id: string;
  filename: string;
  content_type: string;
  blob_url: string;
  created_at: string;
}

export async function insertDoc(doc: Omit<Document, "id" | "created_at">): Promise<Document> {
  const result = await sql<Document>`
    INSERT INTO documents (session_id, filename, content_type, blob_url)
    VALUES (${doc.session_id}, ${doc.filename}, ${doc.content_type}, ${doc.blob_url})
    RETURNING *
  `;
  return result.rows[0];
}

export async function listDocsBySession(sessionId: string): Promise<Document[]> {
  const result = await sql<Document>`
    SELECT * FROM documents WHERE session_id = ${sessionId} ORDER BY created_at DESC
  `;
  return result.rows;
}

export async function getDocById(id: string): Promise<Document | null> {
  const result = await sql<Document>`
    SELECT * FROM documents WHERE id = ${id}
  `;
  return result.rows[0] ?? null;
}
