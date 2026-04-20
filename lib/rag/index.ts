import "server-only";
import { chunkText } from "./chunker";
import { insertChunks } from "../db/chunks";

export async function indexChunks(options: {
  sessionId: string;
  sourceType: "doc" | "turn" | "tutorial";
  sourceId?: string | null;
  text: string;
  metadata?: Record<string, unknown>;
}): Promise<{ id: string }[]> {
  const { sessionId, sourceType, sourceId, text, metadata = {} } = options;
  const pieces = sourceType === "turn" ? [text] : chunkText(text);

  return insertChunks(
    pieces.map((content) => ({
      session_id: sessionId,
      source_type: sourceType,
      source_id: sourceId ?? null,
      content,
      metadata,
    })),
  );
}
