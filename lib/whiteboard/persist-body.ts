import { z } from "zod";

/** Shared POST body for /api/whiteboard and internal validation. */
export const whiteboardPersistBodySchema = z.object({
  sessionId: z.string().uuid(),
  concept: z.string().min(1).max(1000),
  priorWhiteboardId: z.string().uuid().optional(),
});

export type WhiteboardPersistBody = z.infer<typeof whiteboardPersistBodySchema>;
