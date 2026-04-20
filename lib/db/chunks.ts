import "server-only";
import { sql } from "./client";

export interface Chunk {
  id: string;
  session_id: string;
  source_type: "doc" | "turn" | "tutorial";
  source_id: string | null;
  content: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ChunkSearchResult {
  content: string;
  metadata: Record<string, unknown>;
  rank: number;
}

export async function insertChunks(
  chunks: Array<{
    session_id: string;
    source_type: "doc" | "turn" | "tutorial";
    source_id?: string | null;
    content: string;
    metadata?: Record<string, unknown>;
  }>,
): Promise<{ id: string }[]> {
  const results: { id: string }[] = [];
  for (const chunk of chunks) {
    const result = await sql<{ id: string }>`
      INSERT INTO chunks (session_id, source_type, source_id, content, metadata)
      VALUES (
        ${chunk.session_id},
        ${chunk.source_type},
        ${chunk.source_id ?? null},
        ${chunk.content},
        ${JSON.stringify(chunk.metadata ?? {})}::jsonb
      )
      RETURNING id
    `;
    if (result.rows[0]) results.push(result.rows[0]);
  }
  return results;
}

export async function searchChunksFTS(
  sessionId: string,
  query: string,
  k: number,
): Promise<ChunkSearchResult[]> {
  const result = await sql<ChunkSearchResult>`
    SELECT content, metadata, ts_rank(tsv, plainto_tsquery('english', ${query})) AS rank
    FROM chunks
    WHERE session_id = ${sessionId}
      AND tsv @@ plainto_tsquery('english', ${query})
    ORDER BY rank DESC
    LIMIT ${k}
  `;
  return result.rows;
}

export async function recentChunks(sessionId: string, n: number): Promise<Chunk[]> {
  const result = await sql<Chunk>`
    SELECT * FROM chunks
    WHERE session_id = ${sessionId} AND source_type = 'turn'
    ORDER BY created_at DESC
    LIMIT ${n}
  `;
  return result.rows.reverse();
}

export async function markChunkStuck(chunkId: string): Promise<void> {
  await sql`
    UPDATE chunks
    SET metadata = metadata || '{"is_stuck":true}'::jsonb
    WHERE id = ${chunkId}
  `;
}
