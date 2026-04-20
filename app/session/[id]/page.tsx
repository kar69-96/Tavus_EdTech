"use client";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "@/lib/store";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { WhiteboardPanel } from "@/components/whiteboard/WhiteboardPanel";
import { CVIProvider } from "@/components/call/CVIProvider";
import { Conversation } from "@/components/call/Conversation";
import { Send } from "lucide-react";

interface TutorialStep {
  id: string;
  title: string;
  explanation: string;
  needs_whiteboard: boolean;
  whiteboard_id?: string;
  whiteboard_url?: string;
}

interface Tutorial {
  homework: string;
  steps: TutorialStep[];
}

interface AvatarMessage {
  role: "user" | "assistant";
  content: string;
}

async function readJsonError(res: Response): Promise<string | null> {
  try {
    const body = (await res.json()) as { error?: unknown; message?: unknown };
    if (typeof body.error === "string") return body.error;
    if (typeof body.message === "string") return body.message;
  } catch {
    // non-JSON body
  }
  return null;
}

export default function SessionPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const {
    sessionId,
    setSessionId,
    whiteboardUrl,
    setWhiteboardUrl,
    mode,
    setMode,
    conversationId,
    conversationUrl,
    setConversation,
    clearConversation,
  } = useSession();

  const [tutorial, setTutorial] = useState<Tutorial | null>(null);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [subtitle, setSubtitle] = useState<string | null>(null);
  const [avatarSendLoading, setAvatarSendLoading] = useState(false);
  const [avatarMessages, setAvatarMessages] = useState<AvatarMessage[]>([]);
  const [avatarInput, setAvatarInput] = useState("");
  const subtitleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const avatarBottomRef = useRef<HTMLDivElement | null>(null);
  const prevRouteSessionIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (id && sessionId !== id) setSessionId(id);
  }, [id, sessionId, setSessionId]);

  // Drop Tavus room state when navigating to a different session in the SPA (conversation is not persisted).
  useEffect(() => {
    if (!id) return;
    const prev = prevRouteSessionIdRef.current;
    prevRouteSessionIdRef.current = id;
    if (prev !== undefined && prev !== id) {
      clearConversation();
    }
  }, [id, clearConversation]);

  // Auto-start avatar connection when page loads in avatar mode with no active session
  useEffect(() => {
    if (!id || mode !== "avatar" || conversationUrl || avatarLoading) return;
    void startAvatarMode();
    // startAvatarMode is stable enough via closure; deps drive when a connect should be attempted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, mode, conversationUrl, avatarLoading]);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/tutorial/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.steps) {
          setTutorial(data);
          const firstWhiteboard = data.steps.find(
            (s: TutorialStep) => s.whiteboard_id || s.whiteboard_url,
          );
          if (firstWhiteboard?.whiteboard_id) {
            setWhiteboardUrl(
              `/api/whiteboard/widget/${firstWhiteboard.whiteboard_id}?sessionId=${encodeURIComponent(id)}`,
            );
          } else if (firstWhiteboard?.whiteboard_url) {
            setWhiteboardUrl(firstWhiteboard.whiteboard_url);
          }
        }
      })
      .catch(() => {});
  }, [id, setWhiteboardUrl]);

  // Scroll avatar chat to bottom on new messages
  useEffect(() => {
    avatarBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [avatarMessages, avatarSendLoading]);

  async function startAvatarMode() {
    if (conversationUrl) {
      setMode("avatar");
      return;
    }
    setAvatarLoading(true);
    try {
      const personaRes = await fetch("/api/tavus/personas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: id }),
      });
      if (!personaRes.ok) {
        const err = await readJsonError(personaRes);
        throw new Error(err ?? `Failed to create persona (${personaRes.status})`);
      }
      const { personaId } = await personaRes.json();

      const convRes = await fetch("/api/tavus/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personaId, sessionId: id }),
      });
      if (!convRes.ok) {
        const err = await readJsonError(convRes);
        throw new Error(err ?? `Failed to create conversation (${convRes.status})`);
      }
      const { conversationId: cid, conversationUrl: curl } = await convRes.json();

      setConversation(cid, curl);
      setMode("avatar");
    } catch (err) {
      console.error(err);
      setMode("text");
    } finally {
      setAvatarLoading(false);
    }
  }

  async function endConversation() {
    if (conversationId) {
      await fetch(`/api/tavus/conversations?id=${conversationId}`, { method: "DELETE" });
    }
    clearConversation();
    setMode("text");
  }

  async function sendToAvatar(text: string) {
    if (!id || !conversationId || avatarSendLoading) return;
    const sid = id;
    setAvatarSendLoading(true);
    setAvatarMessages((prev) => [...prev, { role: "user", content: text }]);

    if (subtitleTimerRef.current) {
      clearTimeout(subtitleTimerRef.current);
      subtitleTimerRef.current = null;
    }

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: sid, message: text }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      setAvatarMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `[Error ${res.status}: ${errText.slice(0, 500)}]`,
        },
      ]);
      setAvatarSendLoading(false);
      return;
    }

    if (!res.body) {
      setAvatarMessages((prev) => [
        ...prev,
        { role: "assistant", content: "[Error: empty response from tutor]" },
      ]);
      setAvatarSendLoading(false);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let sseBuffer = "";
    let fullResponse = "";

    // Seed an empty assistant message to stream into
    setAvatarMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    function consumeSseLines(): boolean {
      let sep: number;
      while ((sep = sseBuffer.indexOf("\n\n")) >= 0) {
        const block = sseBuffer.slice(0, sep);
        sseBuffer = sseBuffer.slice(sep + 2);
        for (const line of block.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trimEnd();
          if (raw === "[DONE]") return true;
          try {
            const chunk = JSON.parse(raw) as { type?: string; text?: string; whiteboardId?: string };
            if (chunk.type === "text" && chunk.text) {
              fullResponse += chunk.text;
              setSubtitle(fullResponse);
              setAvatarMessages((prev) => {
                const next = [...prev];
                next[next.length - 1] = { role: "assistant", content: fullResponse };
                return next;
              });
            }
            if (chunk.type === "whiteboard" && chunk.whiteboardId) {
              setWhiteboardUrl(
                `/api/whiteboard/widget/${chunk.whiteboardId}?sessionId=${encodeURIComponent(sid)}`,
              );
            }
          } catch {
            // malformed chunk — skip
          }
        }
      }
      return false;
    }

    try {
      while (true) {
        const { done, value } = await reader.read();
        sseBuffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });
        sseBuffer = sseBuffer.replace(/\r\n/g, "\n");
        if (consumeSseLines()) break;
        if (done) break;
      }
      sseBuffer += decoder.decode();
      consumeSseLines();
    } finally {
      setAvatarSendLoading(false);
    }

    if (fullResponse.trim()) {
      fetch("/api/tavus/conversations/echo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, text: fullResponse.trim() }),
      }).catch(() => {});

      const speakMs = Math.min(fullResponse.split(" ").length * 400, 10000);
      subtitleTimerRef.current = setTimeout(() => setSubtitle(null), speakMs);
    }
  }

  function handleAvatarSend() {
    const text = avatarInput.trim();
    if (!text || avatarSendLoading) return;
    setAvatarInput("");
    sendToAvatar(text);
  }

  useEffect(() => {
    const handler = () => {
      if (conversationId) {
        navigator.sendBeacon(`/api/tavus/conversations?id=${conversationId}`, "");
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [conversationId]);

  useEffect(() => {
    return () => {
      if (subtitleTimerRef.current) clearTimeout(subtitleTimerRef.current);
    };
  }, []);

  return (
    <CVIProvider>
      <div className="h-screen bg-[--ink-0] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-[--chrome-lo]">
          <button
            onClick={() => router.push("/onboard")}
            className="text-[9px] font-[family-name:var(--font-pixel-font)] text-[--fg-2] hover:text-[--fg-0] transition-colors"
          >
            ← NEW SESSION
          </button>
          <span className="text-[9px] font-[family-name:var(--font-pixel-font)] text-[--fg-2]">
            TUTOR
          </span>
          <button
            onClick={mode === "text" ? startAvatarMode : endConversation}
            disabled={avatarLoading}
            className="text-[9px] font-[family-name:var(--font-pixel-font)] text-[--fg-2] hover:text-[--fg-0] transition-colors disabled:opacity-40"
          >
            {avatarLoading ? "CONNECTING…" : mode === "text" ? "AVATAR MODE →" : "← TEXT MODE"}
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Text mode: fixed 420px left panel */}
          {mode === "text" && (
            <div className="w-[420px] flex flex-col border-r border-[--chrome-lo] overflow-hidden">
              {tutorial && (
                <div className="border-b border-[--chrome-lo] overflow-y-auto max-h-[200px]">
                  <div className="px-4 py-2">
                    <p className="text-[9px] font-[family-name:var(--font-pixel-font)] text-[--fg-2] mb-2">
                      TUTORIAL
                    </p>
                    <ol className="space-y-2">
                      {tutorial.steps.map((step, i) => (
                        <li
                          key={step.id}
                          className="flex gap-2 cursor-pointer hover:text-[--fg-0] text-[--fg-2] text-xs transition-colors"
                          onClick={() => {
                            if (step.whiteboard_id) {
                              setWhiteboardUrl(
                                `/api/whiteboard/widget/${step.whiteboard_id}?sessionId=${encodeURIComponent(id)}`,
                              );
                            } else if (step.whiteboard_url) {
                              setWhiteboardUrl(step.whiteboard_url);
                            }
                          }}
                        >
                          <span className="text-[--fg-2] shrink-0">{i + 1}.</span>
                          <span>{step.title}</span>
                          {(step.whiteboard_id || step.whiteboard_url) && (
                            <span className="shrink-0 text-[9px]">⬛</span>
                          )}
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              )}
              <div className="flex-1 overflow-hidden">
                <ChatPanel />
              </div>
            </div>
          )}

          {/* Text mode: whiteboard panel */}
          {mode === "text" && (
            <div className="flex-1 overflow-hidden bg-[--ink-2]">
              <WhiteboardPanel url={whiteboardUrl} />
            </div>
          )}

          {/* Avatar mode */}
          {mode === "avatar" && (
            <div className="flex flex-1 overflow-hidden">
              {/* Left: avatar video on top, whiteboard on bottom */}
              <div className="flex flex-col flex-1 overflow-hidden">
                <div className={`overflow-hidden ${whiteboardUrl ? "flex-1" : "flex-1"}`}>
                  {conversationUrl ? (
                    <Conversation
                      conversationUrl={conversationUrl}
                      onLeave={endConversation}
                      subtitle={subtitle}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-[--fg-2] text-xs">
                      connecting…
                    </div>
                  )}
                </div>
                {whiteboardUrl && (
                  <div className="h-1/2 border-t border-[--chrome-lo] bg-[--ink-2] overflow-hidden">
                    <WhiteboardPanel url={whiteboardUrl} />
                  </div>
                )}
              </div>

              {/* Right: always-on text sidebar */}
              <div className="w-80 flex flex-col border-l border-[--chrome-lo]">
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {avatarMessages.length === 0 && (
                    <p className="text-[9px] font-[family-name:var(--font-pixel-font)] text-[--fg-2] text-center pt-4">
                      ASK YOUR TUTOR ANYTHING
                    </p>
                  )}
                  {avatarMessages.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded px-3 py-2 text-xs leading-relaxed ${
                          msg.role === "user"
                            ? "bg-[--fg-2] text-[--ink-0]"
                            : "bg-[--ink-2] text-[--fg-0]"
                        }`}
                      >
                        {msg.content || <span className="opacity-40">…</span>}
                      </div>
                    </div>
                  ))}
                  {avatarSendLoading && avatarMessages[avatarMessages.length - 1]?.role !== "assistant" && (
                    <div className="flex justify-start">
                      <div className="bg-[--ink-2] text-[--fg-2] rounded px-3 py-2 text-xs animate-pulse">
                        Tutor is thinking…
                      </div>
                    </div>
                  )}
                  <div ref={avatarBottomRef} />
                </div>
                <div className="border-t border-[--chrome-lo] p-3 flex gap-2">
                  <input
                    className="flex-1 bg-[--ink-1] border border-[--chrome-lo] rounded px-3 py-2 text-sm text-[--fg-0] placeholder:text-[--fg-2] focus:outline-none focus:border-[--fg-2]"
                    placeholder={
                      conversationId ? "Ask a question…" : "Waiting for video connection…"
                    }
                    value={avatarInput}
                    onChange={(e) => setAvatarInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleAvatarSend()}
                    disabled={avatarSendLoading || !conversationId}
                  />
                  <button
                    onClick={handleAvatarSend}
                    disabled={avatarSendLoading || !avatarInput.trim() || !conversationId}
                    className="px-3 py-2 bg-[--fg-2] text-[--ink-0] rounded disabled:opacity-40 hover:opacity-90 transition-opacity flex items-center"
                    aria-label="Send message"
                  >
                    <Send className="h-4 w-4" strokeWidth={2} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </CVIProvider>
  );
}
