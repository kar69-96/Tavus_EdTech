export function buildTutorialPrompt(options: {
  homework: string;
  docExcerpts: Array<{ filename: string; text: string }>;
}): string {
  const { homework, docExcerpts } = options;

  const docsSection =
    docExcerpts.length > 0
      ? `\n\nThe student's uploaded notes:\n\n${docExcerpts
          .map((d) => `--- ${d.filename} ---\n${d.text}`)
          .join("\n\n")}`
      : "";

  return `You are PAL, an expert AI tutor. A student needs help with the following problem or topic:

"${homework}"
${docsSection}

Generate a structured tutorial to walk the student through this step by step. Output valid JSON only — no markdown, no commentary, just the JSON object.

Schema:
{
  "steps": [
    {
      "id": "step-1",
      "title": "short title",
      "explanation": "2-4 conversational sentences the tutor will say aloud",
      "needs_whiteboard": true or false
    }
  ]
}

Guidelines:
- 3 to 6 steps total
- Set needs_whiteboard to true for any step involving a graph, diagram, equation visualization, or geometric concept
- Explanations should be spoken-word natural, no markdown
- Build understanding progressively — foundational concepts first`;
}
