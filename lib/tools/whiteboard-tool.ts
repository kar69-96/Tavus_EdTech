import type Anthropic from "@anthropic-ai/sdk";

export const whiteboardTool: Anthropic.Tool = {
  name: "whiteboard",
  description:
    "Render a D3 diagram on the student's whiteboard. REQUIRED whenever you discuss graphs, functions, sine/cosine/tangent or other waves, the unit circle, periodic motion, slopes, areas under curves, vectors, coordinates, geometry, or any math a student would sketch — call this in the same turn before your spoken explanation so the visual lands with your words. Use a detailed concept string (axes, labels, one or two key curves or points). Optional prior_whiteboard_id to revise the same board in place.",
  input_schema: {
    type: "object" as const,
    properties: {
      concept: {
        type: "string",
        description:
          "Exact brief for the HTML chart: what to plot (e.g. sin(x) over -2pi..2pi with axes labeled x and y, amplitude 1, period marked), colors if needed, and any labels (e.g. unit circle with angle θ, point height = sin θ).",
      },
      prior_whiteboard_id: {
        type: "string",
        description:
          "UUID of the current whiteboard row from the last whiteboard tool result when you are still refining the same figure or same problem—updates that board in place. Omit when starting a genuinely new diagram or topic.",
      },
    },
    required: ["concept"],
  },
};
