import "server-only";
import { getAnthropicClient } from "../api/anthropic-client";
import { ConfigError } from "../errors";
import { uploadToBlob } from "../blob/upload";
import { insertWhiteboard } from "../db/whiteboards";

const SYSTEM = `You are a data visualization expert. Generate a self-contained, single-file HTML document that visualizes the given concept.

Rules:
- Use D3 v7 loaded from CDN: https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js
- No external assets, fonts, or images beyond D3
- Must work inside a sandboxed iFrame (no cookies, no localStorage)
- Dark background matching #0c0c0c, accent color #9ea8ff
- Responsive: fill 100% width and height of the page
- Clean, minimal — label key elements, use clear visual hierarchy
- Allowed primitives: axes, function graph, bar chart, arrows, text labels, number line, scatter plot
- Output ONLY the complete HTML file content — nothing else, no markdown fences`;

function isValidHtml(html: string): boolean {
  return (
    html.includes("<html") &&
    html.includes("</html>") &&
    html.includes("<script") &&
    !html.includes("```")
  );
}

export async function generateWhiteboardWidget(options: {
  concept: string;
  priorWidgetHtml?: string;
  sessionId: string;
}): Promise<string> {
  const { concept, priorWidgetHtml, sessionId } = options;
  const client = getAnthropicClient();

  const userContent = priorWidgetHtml
    ? `Revise this visualization for: ${concept}\n\nPrior HTML (improve or replace it):\n${priorWidgetHtml.slice(0, 4000)}`
    : `Create a visualization for: ${concept}`;

  let html = "";
  let attempt = 0;
  let lastError = "";

  while (attempt < 3) {
    attempt++;
    const messages: Array<{ role: "user" | "assistant"; content: string }> = [
      { role: "user", content: attempt === 1 ? userContent : `${userContent}\n\nPrevious attempt failed: ${lastError}\n\nFix it and return valid HTML only.` },
    ];

    let msg: Awaited<ReturnType<typeof client.messages.create>>;
    try {
      msg = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        system: SYSTEM,
        messages,
      });
    } catch (err: unknown) {
      const status = (err as { status?: number }).status;
      if (status === 401) {
        console.error("[whiteboard-agent] Anthropic authentication error:", err);
        throw new ConfigError("AI service authentication failed — check ANTHROPIC_API_KEY", err);
      }
      throw err;
    }

    html = (msg.content[0] as { type: string; text: string }).text.trim();

    if (isValidHtml(html)) break;
    lastError = "Output was not valid HTML";
  }

  if (!isValidHtml(html)) {
    throw new Error("Whiteboard agent failed to produce valid HTML after 3 attempts");
  }

  const id = crypto.randomUUID();
  const blobUrl = await uploadToBlob(
    `renders/${sessionId}/${id}.html`,
    html,
    "text/html",
  );

  await insertWhiteboard({
    session_id: sessionId,
    blob_url: blobUrl,
    widget_type: "d3",
    prompt: concept,
  });

  return blobUrl;
}
