"use client";
import { useState, useRef, useEffect } from "react";
import { useSession } from "@/lib/store";
import { MessageBubble } from "./MessageBubble";

export function ChatPanel() {
  const { sessionId, messages, addMessage, appendToLastAssistant, setWhiteboardUrl } = useSession();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    if (!input.trim() || !sessionId || loading) return;
    const text = input.trim();
    setInput("");
    setLoading(true);

    addMessage({ id: crypto.randomUUID(), role: "user", content: text });

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, message: text }),
    });

    if (!res.body) { setLoading(false); return; }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const lines = decoder.decode(value).split("\n").filter((l) => l.startsWith("data: "));
      for (const line of lines) {
        const raw = line.slice(6);
        if (raw === "[DONE]") { setLoading(false); return; }
        try {
          const chunk = JSON.parse(raw);
          if (chunk.type === "text" && chunk.text) {
            appendToLastAssistant(chunk.text);
          } else if (chunk.type === "whiteboard" && chunk.widgetUrl) {
            setWhiteboardUrl(chunk.widgetUrl);
          }
        } catch {
          // malformed chunk — skip
        }
      }
    }

    setLoading(false);
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-[--fg-2] text-xs text-center mt-8 font-pixel">
            ASK PAL ANYTHING
          </p>
        )}
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
        {loading && (
          <div className="flex justify-start">
            <span className="text-[--fg-2] text-xs animate-pulse">PAL is thinking…</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-[--chrome-lo] p-3 flex gap-2">
        <input
          className="flex-1 bg-[--ink-1] border border-[--chrome-lo] rounded px-3 py-2 text-sm text-[--fg-0] placeholder:text-[--fg-2] focus:outline-none focus:border-[--fg-2]"
          placeholder="Ask a question…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
          disabled={loading}
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          className="px-4 py-2 text-xs font-pixel bg-[--fg-2] text-[--ink-0] rounded disabled:opacity-40 hover:opacity-90 transition-opacity"
        >
          SEND
        </button>
      </div>
    </div>
  );
}
