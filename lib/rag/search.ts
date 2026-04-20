import "server-only";
import { searchChunksFTS } from "../db/chunks";

export interface SearchResult {
  content: string;
  metadata: Record<string, unknown>;
  rank: number;
}

export async function searchChunks(options: {
  sessionId: string;
  query: string;
  k?: number;
}): Promise<SearchResult[]> {
  const { sessionId, query, k = 5 } = options;
  return searchChunksFTS(sessionId, query, Math.min(k, 10));
}

export function formatSearchResults(results: SearchResult[]): string {
  if (results.length === 0) return "No relevant context found.";

  return results
    .map((r) => {
      const meta = r.metadata as {
        filename?: string;
        role?: string;
        step_id?: string;
        title?: string;
      };
      let tag: string;
      if (meta.filename) tag = `[doc: ${meta.filename}]`;
      else if (meta.role) tag = `[turn: ${meta.role}]`;
      else if (meta.step_id) tag = `[tutorial: ${meta.title ?? meta.step_id}]`;
      else tag = "[context]";
      return `${tag} (score: ${r.rank.toFixed(3)})\n${r.content}`;
    })
    .join("\n\n---\n\n");
}
