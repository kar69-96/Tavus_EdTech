import type Anthropic from "@anthropic-ai/sdk";

export const docFetchTool: Anthropic.Tool = {
  name: "doc_fetch",
  description:
    "Fetch and read the text content of a document the student uploaded. Use this before answering factual questions that may be covered in the student's notes.",
  input_schema: {
    type: "object" as const,
    properties: {
      doc_id: {
        type: "string",
        description: "The UUID of the document to fetch.",
      },
    },
    required: ["doc_id"],
  },
};
