import { NextRequest, NextResponse } from "next/server";
import { generateWhiteboardWidget } from "@/lib/agent/whiteboard-agent";
import { z } from "zod";

const Body = z.object({
  sessionId: z.string().uuid(),
  concept: z.string().min(1).max(1000),
  priorWidgetUrl: z.string().url().optional(),
});

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { sessionId, concept, priorWidgetUrl } = parsed.data;

  let priorHtml: string | undefined;
  if (priorWidgetUrl) {
    try {
      const res = await fetch(priorWidgetUrl);
      if (res.ok) priorHtml = await res.text();
    } catch {
      // non-fatal
    }
  }

  const widgetUrl = await generateWhiteboardWidget({
    concept,
    priorWidgetHtml: priorHtml,
    sessionId,
  });

  return NextResponse.json({ widgetUrl });
}
