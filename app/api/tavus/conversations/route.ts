import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createTavusClient, TavusError } from "@/lib/api/tavus-client";
import { resolveTavusApiKeyFromRequest } from "@/lib/api/resolve-key";
import { env } from "@/lib/api/env";

const CreateBody = z.object({
  personaId: z.string().min(1),
  sessionId: z.string().uuid(),
  customGreeting: z.string().max(500).optional(),
});

export async function POST(req: NextRequest) {
  const parsed = CreateBody.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const apiKey = resolveTavusApiKeyFromRequest(req) ?? env.TAVUS_API_KEY;
  const client = createTavusClient(apiKey);

  const { personaId, sessionId, customGreeting } = parsed.data;

  try {
    const result = await client.createConversation({
      persona_id: personaId,
      conversation_name: `pal-session-${sessionId.slice(0, 8)}`,
      custom_greeting: customGreeting ?? "Hi! I'm PAL, your AI tutor. Ready to get started?",
    });
    return NextResponse.json({
      conversationId: result.conversation_id,
      conversationUrl: result.conversation_url,
    });
  } catch (err) {
    if (err instanceof TavusError) {
      if (err.status === 402 || err.status === 429) {
        return NextResponse.json({ error: "Quota exceeded", code: "quota" }, { status: err.status });
      }
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    throw err;
  }
}

export async function DELETE(req: NextRequest) {
  const conversationId = req.nextUrl.searchParams.get("id");
  if (!conversationId) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const apiKey = resolveTavusApiKeyFromRequest(req) ?? env.TAVUS_API_KEY;
  const client = createTavusClient(apiKey);

  try {
    await client.endConversation(conversationId);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true }); // graceful degradation
  }
}
