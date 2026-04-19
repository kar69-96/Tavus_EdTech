import "server-only";
import { getAnthropicClient } from "../api/anthropic-client";
import { markStuck } from "../db/turns";

const STUCK_KEYWORDS = [
  "don't understand",
  "dont understand",
  "i'm confused",
  "im confused",
  "what does that mean",
  "i'm lost",
  "im lost",
  "can you explain",
  "not sure",
  "i don't get",
  "i dont get",
  "huh?",
  "what?",
];

async function classifyWithLlm(text: string): Promise<boolean> {
  const client = getAnthropicClient();
  const msg = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 10,
    messages: [
      {
        role: "user",
        content: `Does this student message signal confusion or being stuck? Reply only "yes" or "no".\n\nMessage: "${text}"`,
      },
    ],
  });
  const answer = (msg.content[0] as { type: string; text: string }).text
    .toLowerCase()
    .trim();
  return answer === "yes";
}

export async function detectAndMarkStuck(
  turnId: string,
  content: string,
): Promise<void> {
  const lower = content.toLowerCase();
  const keywordHit = STUCK_KEYWORDS.some((kw) => lower.includes(kw));

  if (keywordHit) {
    await markStuck(turnId);
    return;
  }

  const llmHit = await classifyWithLlm(content);
  if (llmHit) {
    await markStuck(turnId);
  }
}
