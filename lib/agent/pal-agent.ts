import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { ConfigError } from "../errors";
import { getAnthropicClient } from "../api/anthropic-client";
import { generateAndPersistWhiteboard } from "./whiteboard-agent";
import { detectAndMarkStuck } from "./stuck-detector";
import { ragSearchTool } from "../tools/rag-search-tool";
import { whiteboardTool } from "../tools/whiteboard-tool";
import { composePalSystemPrompt } from "../prompt/pal-system";
import { indexChunks } from "../rag/index";
import { searchChunks, formatSearchResults } from "../rag/search";
import { recentChunks } from "../db/chunks";
import { ensureSession, getSession } from "../db/sessions";
import { listDocsBySession } from "../db/documents";

export interface AgentChunk {
  type: "text" | "whiteboard" | "error" | "status";
  text?: string;
  /** DB row id; client builds /api/whiteboard/widget/[id]?sessionId=… */
  whiteboardId?: string;
}

export async function* runPalAgent(options: {
  sessionId: string;
  message: string;
}): AsyncGenerator<AgentChunk> {
  const { sessionId, message } = options;

  await ensureSession(sessionId);

  const [session, docs, userChunks] = await Promise.all([
    getSession(sessionId),
    listDocsBySession(sessionId),
    indexChunks({ sessionId, sourceType: "turn", text: message, metadata: { role: "user" } }),
  ]);

  const userChunkId = userChunks[0]?.id;
  if (userChunkId) {
    detectAndMarkStuck(userChunkId, message).catch(() => {});
  }

  const systemPrompt = composePalSystemPrompt({
    docFilenames: docs.map((d) => d.filename),
    hasTutorial: !!session?.tutorial_blob_url,
  });

  // Build recent history (last 4 turn chunks) for short-term coherence
  const recent = await recentChunks(sessionId, 4);
  const historyMessages: Anthropic.MessageParam[] = recent
    .filter((c) => c.content !== message)
    .map((c) => ({
      role: (c.metadata as { role?: string }).role === "assistant" ? "assistant" : "user",
      content: c.content,
    }));

  const messages: Anthropic.MessageParam[] = [
    ...historyMessages,
    { role: "user", content: message },
  ];

  const client = getAnthropicClient();
  let fullAssistantText = "";

  try {
    while (true) {
      const stream = client.messages.stream({
        model: "claude-sonnet-4-6",
        // Room for tool_use blocks after text; 1024 can truncate before tools on longer replies
        max_tokens: 4096,
        system: systemPrompt,
        tools: [ragSearchTool, whiteboardTool],
        messages,
      });

      const toolUseBlocks: Anthropic.ToolUseBlock[] = [];

      for await (const event of stream) {
        if (event.type === "content_block_delta") {
          if (event.delta.type === "text_delta") {
            fullAssistantText += event.delta.text;
            yield { type: "text", text: event.delta.text };
          }
        }
      }

      const finalMsg = await stream.finalMessage();

      for (const block of finalMsg.content) {
        if (block.type === "tool_use") {
          toolUseBlocks.push(block);
        }
      }

      if (finalMsg.stop_reason !== "tool_use" || toolUseBlocks.length === 0) {
        break;
      }

      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const tool of toolUseBlocks) {
        if (tool.name === "rag_search") {
          const input = tool.input as { query: string; k?: number };
          try {
            const results = await searchChunks({ sessionId, query: input.query, k: input.k });
            toolResults.push({
              type: "tool_result",
              tool_use_id: tool.id,
              content: formatSearchResults(results),
            });
          } catch (err) {
            toolResults.push({
              type: "tool_result",
              tool_use_id: tool.id,
              content: `Search failed: ${String(err)}`,
            });
          }
        } else if (tool.name === "whiteboard") {
          const input = tool.input as { concept: string; prior_whiteboard_id?: string };
          try {
            yield {
              type: "status",
              text: "Drawing on the whiteboard…",
            };
            const { whiteboardId } = await generateAndPersistWhiteboard({
              sessionId,
              concept: input.concept,
              priorWhiteboardId: input.prior_whiteboard_id,
            });
            yield { type: "whiteboard", whiteboardId };
            toolResults.push({
              type: "tool_result",
              tool_use_id: tool.id,
              content: JSON.stringify({ whiteboard_id: whiteboardId }),
            });
          } catch (err) {
            const msg = `Whiteboard failed: ${String(err)}`;
            yield { type: "error", text: msg };
            toolResults.push({
              type: "tool_result",
              tool_use_id: tool.id,
              content: msg,
            });
          }
        }
      }

      messages.push({ role: "assistant", content: finalMsg.content });
      messages.push({ role: "user", content: toolResults });
    }
  } catch (err: unknown) {
    const status = (err as { status?: number }).status;
    if (status === 401) {
      console.error("[pal-agent] Anthropic authentication error:", err);
      throw new ConfigError("AI service authentication failed — check ANTHROPIC_API_KEY", err);
    }
    throw err;
  }

  // Do not await — indexing can take seconds and would delay the SSE [DONE], leaving the UI on "thinking…"
  if (fullAssistantText) {
    void indexChunks({
      sessionId,
      sourceType: "turn",
      text: fullAssistantText,
      metadata: { role: "assistant" },
    }).catch((e) => console.error("[pal-agent] assistant indexChunks failed:", e));
  }
}
