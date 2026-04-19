import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { getAnthropicClient } from "../api/anthropic-client";
import { getDocById } from "../db/documents";
import { insertTurn, getTurns } from "../db/turns";
import { getSession } from "../db/sessions";
import { fetchBlobText } from "../blob/fetch-text";
import { generateWhiteboardWidget } from "./whiteboard-agent";
import { detectAndMarkStuck } from "./stuck-detector";
import { docFetchTool } from "../tools/doc-fetch-tool";
import { whiteboardTool } from "../tools/whiteboard-tool";
import { composePalSystemPrompt } from "../prompt/pal-system";
import { listDocsBySession } from "../db/documents";

export interface AgentChunk {
  type: "text" | "whiteboard";
  text?: string;
  widgetUrl?: string;
}

export async function* runPalAgent(options: {
  sessionId: string;
  message: string;
}): AsyncGenerator<AgentChunk> {
  const { sessionId, message } = options;

  const session = await getSession(sessionId);
  if (!session) throw new Error("Session not found");

  const docs = await listDocsBySession(sessionId);
  const turns = await getTurns(sessionId, 10);

  let tutorialJson: string | undefined;
  if (session.tutorial_blob_url) {
    try {
      const res = await fetch(session.tutorial_blob_url);
      if (res.ok) tutorialJson = await res.text();
    } catch {
      // non-fatal
    }
  }

  const systemPrompt = composePalSystemPrompt({
    tutorialJson,
    docFilenames: docs.map((d) => d.filename),
  });

  const userTurn = await insertTurn({ session_id: sessionId, role: "user", content: message });

  // fire-and-forget stuck detection
  detectAndMarkStuck(userTurn.id, message).catch(() => {});

  const messages: Anthropic.MessageParam[] = [
    ...turns.map((t) => ({ role: t.role as "user" | "assistant", content: t.content })),
    { role: "user", content: message },
  ];

  const client = getAnthropicClient();
  let fullAssistantText = "";

  // Agentic loop — tool calls may be nested
  while (true) {
    const stream = client.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: systemPrompt,
      tools: [docFetchTool, whiteboardTool],
      messages,
    });

    const toolUseBlocks: Anthropic.ToolUseBlock[] = [];
    let currentText = "";

    for await (const event of stream) {
      if (event.type === "content_block_delta") {
        if (event.delta.type === "text_delta") {
          currentText += event.delta.text;
          fullAssistantText += event.delta.text;
          yield { type: "text", text: event.delta.text };
        }
      } else if (event.type === "content_block_stop") {
        // captured via message snapshot below
      }
    }

    const finalMsg = await stream.finalMessage();

    // Collect tool use blocks
    for (const block of finalMsg.content) {
      if (block.type === "tool_use") {
        toolUseBlocks.push(block);
      }
    }

    if (finalMsg.stop_reason !== "tool_use" || toolUseBlocks.length === 0) {
      break;
    }

    // Process tool calls
    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const tool of toolUseBlocks) {
      if (tool.name === "doc_fetch") {
        const input = tool.input as { doc_id: string };
        try {
          const doc = await getDocById(input.doc_id);
          if (!doc) {
            toolResults.push({ type: "tool_result", tool_use_id: tool.id, content: "Document not found." });
          } else {
            const text = await fetchBlobText(doc.blob_url, doc.content_type);
            toolResults.push({ type: "tool_result", tool_use_id: tool.id, content: text });
          }
        } catch (err) {
          toolResults.push({ type: "tool_result", tool_use_id: tool.id, content: `Error: ${String(err)}` });
        }
      } else if (tool.name === "whiteboard") {
        const input = tool.input as { concept: string; prior_widget_url?: string };
        try {
          let priorHtml: string | undefined;
          if (input.prior_widget_url) {
            const res = await fetch(input.prior_widget_url);
            if (res.ok) priorHtml = await res.text();
          }
          const widgetUrl = await generateWhiteboardWidget({
            concept: input.concept,
            priorWidgetHtml: priorHtml,
            sessionId,
          });
          yield { type: "whiteboard", widgetUrl };
          toolResults.push({ type: "tool_result", tool_use_id: tool.id, content: JSON.stringify({ widget_url: widgetUrl }) });
        } catch (err) {
          toolResults.push({ type: "tool_result", tool_use_id: tool.id, content: `Whiteboard failed: ${String(err)}` });
        }
      }
    }

    messages.push({ role: "assistant", content: finalMsg.content });
    messages.push({ role: "user", content: toolResults });
  }

  if (fullAssistantText) {
    await insertTurn({ session_id: sessionId, role: "assistant", content: fullAssistantText });
  }
}
