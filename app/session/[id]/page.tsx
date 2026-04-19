"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "@/lib/store";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { WhiteboardPanel } from "@/components/whiteboard/WhiteboardPanel";
import { CVIProvider } from "@/components/call/CVIProvider";
import { Conversation } from "@/components/call/Conversation";

interface TutorialStep {
  id: string;
  title: string;
  explanation: string;
  needs_whiteboard: boolean;
  whiteboard_url?: string;
}

interface Tutorial {
  homework: string;
  steps: TutorialStep[];
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
  } = useSession();

  const [tutorial, setTutorial] = useState<Tutorial | null>(null);
  const [avatarLoading, setAvatarLoading] = useState(false);

  // Sync session ID from URL
  useEffect(() => {
    if (id && sessionId !== id) setSessionId(id);
  }, [id, sessionId, setSessionId]);

  // Fetch tutorial if available
  useEffect(() => {
    if (!id) return;
    fetch(`/api/tutorial/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.steps) {
          setTutorial(data);
          const firstWhiteboard = data.steps.find(
            (s: TutorialStep) => s.whiteboard_url,
          );
          if (firstWhiteboard?.whiteboard_url) {
            setWhiteboardUrl(firstWhiteboard.whiteboard_url);
          }
        }
      })
      .catch(() => {});
  }, [id, setWhiteboardUrl]);

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
      if (!personaRes.ok) throw new Error("Failed to create persona");
      const { personaId } = await personaRes.json();

      const convRes = await fetch("/api/tavus/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personaId, sessionId: id }),
      });
      if (!convRes.ok) throw new Error("Failed to create conversation");
      const { conversationId: cid, conversationUrl: curl } = await convRes.json();

      setConversation(cid, curl);
      setMode("avatar");
    } catch (err) {
      console.error(err);
    } finally {
      setAvatarLoading(false);
    }
  }

  async function endConversation() {
    if (conversationId) {
      await fetch(`/api/tavus/conversations?id=${conversationId}`, { method: "DELETE" });
    }
    setMode("text");
  }

  // Cleanup on page unload
  useEffect(() => {
    const handler = () => {
      if (conversationId) {
        navigator.sendBeacon(`/api/tavus/conversations?id=${conversationId}`, "");
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [conversationId]);

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
            PAL
          </span>
          <button
            onClick={mode === "text" ? startAvatarMode : endConversation}
            disabled={avatarLoading}
            className="text-[9px] font-[family-name:var(--font-pixel-font)] text-[--fg-2] hover:text-[--fg-0] transition-colors disabled:opacity-40"
          >
            {avatarLoading ? "CONNECTING…" : mode === "text" ? "AVATAR MODE →" : "← TEXT MODE"}
          </button>
        </div>

        {/* Body: left panel + whiteboard */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left panel */}
          <div className="w-[420px] flex flex-col border-r border-[--chrome-lo] overflow-hidden">
            {/* Tutorial steps */}
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
                        onClick={() => step.whiteboard_url && setWhiteboardUrl(step.whiteboard_url)}
                      >
                        <span className="text-[--fg-2] shrink-0">{i + 1}.</span>
                        <span>{step.title}</span>
                        {step.whiteboard_url && (
                          <span className="shrink-0 text-[9px]">⬛</span>
                        )}
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            )}

            {/* Chat or Avatar */}
            <div className="flex-1 overflow-hidden">
              {mode === "text" ? (
                <ChatPanel />
              ) : conversationUrl ? (
                <Conversation conversationUrl={conversationUrl} onLeave={endConversation} />
              ) : (
                <div className="flex items-center justify-center h-full text-[--fg-2] text-xs">
                  connecting…
                </div>
              )}
            </div>
          </div>

          {/* Whiteboard */}
          <div className="flex-1 overflow-hidden bg-[--ink-2]">
            <WhiteboardPanel url={whiteboardUrl} />
          </div>
        </div>
      </div>
    </CVIProvider>
  );
}
