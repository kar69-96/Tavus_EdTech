import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createTavusClient, TavusError } from "@/lib/api/tavus-client";
import { resolveTavusApiKeyFromRequest } from "@/lib/api/resolve-key";
import { env } from "@/lib/api/env";

const Body = z.object({
  conversationId: z.string().min(1),
  text: z.string().min(1).max(4000),
});

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const apiKey = resolveTavusApiKeyFromRequest(req) ?? env.TAVUS_API_KEY;
  const client = createTavusClient(apiKey);

  const { conversationId, text } = parsed.data;

  try {
    await client.echoText(conversationId, text);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof TavusError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    throw err;
  }
}
