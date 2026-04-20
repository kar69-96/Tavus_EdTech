import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ConfigError } from "@/lib/errors";
import { createSession, setTutorialBlobUrl } from "@/lib/db/sessions";
import { listDocsBySession } from "@/lib/db/documents";
import { fetchBlobText } from "@/lib/blob/fetch-text";
import { generateAndPersistWhiteboard } from "@/lib/agent/whiteboard-agent";
import { uploadToBlob } from "@/lib/blob/upload";
import { buildTutorialPrompt } from "@/lib/prompt/tutorial-prompt";
import { getAnthropicClient } from "@/lib/api/anthropic-client";
import { del } from "@vercel/blob";
import { indexChunks } from "@/lib/rag/index";

const Body = z.object({
  sessionId: z.string().uuid().optional(),
  homework: z.string().max(2000).optional(),
  docIds: z.array(z.string().uuid()).max(10),
  prevSessionId: z.string().uuid().optional(),
});

interface TutorialStep {
  id: string;
  title: string;
  explanation: string;
  needs_whiteboard: boolean;
  whiteboard_id?: string;
}

interface Tutorial {
  session_id: string;
  homework: string;
  steps: TutorialStep[];
}

export async function POST(req: NextRequest) {
  try {
    return await handlePost(req);
  } catch (err) {
    if (err instanceof ConfigError) {
      return NextResponse.json({ error: err.userMessage }, { status: err.statusCode });
    }
    console.error("[onboarding] unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function handlePost(req: NextRequest) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { sessionId: tempSessionId, homework, docIds, prevSessionId } = parsed.data;

  // Reset blob storage from previous session
  if (prevSessionId) {
    try {
      const { list } = await import("@vercel/blob");
      const uploads = await list({ prefix: `uploads/${prevSessionId}/` });
      const tutorials = await list({ prefix: `tutorials/${prevSessionId}/` });
      const urls = [
        ...uploads.blobs.map((b) => b.url),
        ...tutorials.blobs.map((b) => b.url),
      ];
      if (urls.length > 0) await del(urls);
    } catch {
      // non-fatal cleanup
    }
  }

  const session = await createSession(homework, tempSessionId);
  const sessionId = session.id;

  const hasDocs = docIds.length > 0;
  const effectiveHomework =
    homework?.trim() ||
    (hasDocs ? "Review and master the material in my uploaded notes." : "");

  if (!effectiveHomework) {
    return NextResponse.json({ sessionId });
  }

  // Fetch doc excerpts for tutorial generation
  const allDocs = docIds.length > 0 ? await listDocsBySession(sessionId) : [];
  // docIds from client are validated against what was actually uploaded to this session
  const docExcerpts = await Promise.all(
    allDocs.slice(0, 3).map(async (doc) => {
      const text = await fetchBlobText(doc.blob_url, doc.content_type, 1500).catch(() => "");
      return { filename: doc.filename, text };
    }),
  );

  // Generate tutorial JSON
  const client = getAnthropicClient();
  const prompt = buildTutorialPrompt({ homework: effectiveHomework, docExcerpts });
  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  });

  let tutorial: Tutorial;
  try {
    const raw = (msg.content[0] as { type: string; text: string }).text.trim();
    const json = raw.startsWith("{") ? raw : raw.slice(raw.indexOf("{"));
    const parsed = JSON.parse(json);
    tutorial = { session_id: sessionId, homework: effectiveHomework, steps: parsed.steps };
  } catch {
    tutorial = {
      session_id: sessionId,
      homework: effectiveHomework,
      steps: [
        {
          id: "step-1",
          title: "Let's work through this together",
          explanation: effectiveHomework,
          needs_whiteboard: false,
        },
      ],
    };
  }

  // Render whiteboards for steps that need them
  for (const step of tutorial.steps) {
    if (step.needs_whiteboard) {
      try {
        const { whiteboardId } = await generateAndPersistWhiteboard({
          concept: `${step.title}: ${step.explanation}`,
          sessionId,
        });
        step.whiteboard_id = whiteboardId;
      } catch {
        // non-fatal — step proceeds without whiteboard
      }
    }
  }

  // Upload tutorial JSON to Blob
  const tutorialUrl = await uploadToBlob(
    `tutorials/${sessionId}/tutorial.json`,
    JSON.stringify(tutorial, null, 2),
    "application/json",
  );
  await setTutorialBlobUrl(sessionId, tutorialUrl);

  // Index tutorial steps into RAG (non-fatal)
  Promise.all(
    tutorial.steps.map((step) =>
      indexChunks({
        sessionId,
        sourceType: "tutorial",
        text: `${step.title}: ${step.explanation}`,
        metadata: { step_id: step.id, title: step.title },
      }),
    ),
  ).catch((err) => console.error("[onboarding] RAG indexing failed:", err));

  return NextResponse.json({ sessionId });
}
