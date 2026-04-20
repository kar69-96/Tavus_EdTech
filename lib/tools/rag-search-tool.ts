import type Anthropic from "@anthropic-ai/sdk";

export const ragSearchTool: Anthropic.Tool = {
  name: "rag_search",
  description:
    "Search the student's memory: their uploaded docs, the tutorial plan, and prior conversation turns. Use this to recall facts, re-read doc passages, or remember what was discussed earlier in the session.",
  input_schema: {
    type: "object",
    properties: {
      query: { type: "string", description: "Natural language query." },
      k: { type: "number", description: "Number of snippets to return (default 5, max 10)." },
    },
    required: ["query"],
  },
};
