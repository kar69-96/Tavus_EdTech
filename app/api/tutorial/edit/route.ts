import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession, setTutorialBlobUrl } from "@/lib/db/sessions";
import { uploadToBlob } from "@/lib/blob/upload";
import { generateWhiteboardWidget } from "@/lib/agent/whiteboard-agent";

const Body = z.object({
  sessionId: z.string().uuid(),
  stepId: z.string(),
  explanation: z.string().optional(),
  rerenderWhiteboard: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { sessionId, stepId, explanation, rerenderWhiteboard } = parsed.data;

  const session = await getSession(sessionId);
  if (!session?.tutorial_blob_url) {
    return NextResponse.json({ error: "Tutorial not found" }, { status: 404 });
  }

  const res = await fetch(session.tutorial_blob_url);
  const tutorial = await res.json();
  const step = tutorial.steps.find((s: { id: string }) => s.id === stepId);

  if (!step) {
    return NextResponse.json({ error: "Step not found" }, { status: 404 });
  }

  if (explanation) step.explanation = explanation;

  if (rerenderWhiteboard) {
    const widgetUrl = await generateWhiteboardWidget({
      concept: `${step.title}: ${step.explanation}`,
      priorWidgetHtml: step.whiteboard_url
        ? await fetch(step.whiteboard_url).then((r) => (r.ok ? r.text() : undefined)).catch(() => undefined)
        : undefined,
      sessionId,
    });
    step.whiteboard_url = widgetUrl;
  }

  const tutorialUrl = await uploadToBlob(
    `tutorials/${sessionId}/tutorial.json`,
    JSON.stringify(tutorial, null, 2),
    "application/json",
  );
  await setTutorialBlobUrl(sessionId, tutorialUrl);

  return NextResponse.json({ step });
}
