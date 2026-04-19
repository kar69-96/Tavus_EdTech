import type Anthropic from "@anthropic-ai/sdk";

export const whiteboardTool: Anthropic.Tool = {
  name: "whiteboard",
  description:
    "Render a visual explanation on the student's whiteboard. Call this proactively whenever your explanation involves anything geometric, graphical, or mathematical — before or at the start of that paragraph, so the visual accompanies your words in real time. Do NOT wait for the student to ask.",
  input_schema: {
    type: "object" as const,
    properties: {
      concept: {
        type: "string",
        description:
          "A clear description of the concept or diagram to visualize. Be specific: include axis labels, variable names, key values.",
      },
      prior_widget_url: {
        type: "string",
        description:
          "URL of the previous whiteboard widget if this is a revision of an earlier diagram. Omit for a fresh visualization.",
      },
    },
    required: ["concept"],
  },
};
