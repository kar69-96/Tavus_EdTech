import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createTavusClient, TavusError } from "@/lib/api/tavus-client";
import { resolveTavusApiKeyFromRequest } from "@/lib/api/resolve-key";
import { composePalSystemPrompt } from "@/lib/prompt/pal-system";
import { getSession } from "@/lib/db/sessions";
import { env } from "@/lib/api/env";

const Body = z.object({
  sessionId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const apiKey = resolveTavusApiKeyFromRequest(req) ?? env.TAVUS_API_KEY;
  const client = createTavusClient(apiKey);

  const { sessionId } = parsed.data;
  const session = await getSession(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  try {
    const result = await client.createPersona({
      persona_name: `PAL-${sessionId.slice(0, 8)}`,
      system_prompt: composePalSystemPrompt(),
      default_replica_id: env.TAVUS_REPLICA_ID,
    });
    return NextResponse.json({ personaId: result.persona_id });
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
