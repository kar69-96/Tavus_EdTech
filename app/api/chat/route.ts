import { NextRequest } from "next/server";
import { runPalAgent } from "@/lib/agent/pal-agent";
import { z } from "zod";

const Body = z.object({
  sessionId: z.string().uuid(),
  message: z.string().min(1).max(4000),
});

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: "Invalid input" }), { status: 400 });
  }

  const { sessionId, message } = parsed.data;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of runPalAgent({ sessionId, message })) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`),
          );
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (err) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "error", text: String(err) })}\n\n`),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
