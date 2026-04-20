import { NextRequest, NextResponse } from "next/server";
import { generateAndPersistWhiteboard } from "@/lib/agent/whiteboard-agent";
import { whiteboardPersistBodySchema } from "@/lib/whiteboard/persist-body";

export async function POST(req: NextRequest) {
  const json = await req.json();
  const parsed = whiteboardPersistBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { sessionId, concept, priorWhiteboardId } = parsed.data;

  try {
    const { whiteboardId } = await generateAndPersistWhiteboard({
      sessionId,
      concept,
      priorWhiteboardId,
    });
    return NextResponse.json({ whiteboardId });
  } catch (err) {
    console.error("[api/whiteboard]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
