"use client";
import type { ChatMessage } from "@/lib/store";

interface Props {
  message: ChatMessage;
}

export function MessageBubble({ message }: Props) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[75%] rounded px-3 py-2 text-sm leading-relaxed ${
          isUser
            ? "bg-[--fg-2] text-[--ink-0]"
            : "bg-[--ink-2] text-[--fg-0] border border-[--chrome-lo]"
        }`}
      >
        {message.content}
      </div>
    </div>
  );
}
