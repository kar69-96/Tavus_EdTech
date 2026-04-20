"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface SessionState {
  sessionId: string | null;
  messages: ChatMessage[];
  whiteboardUrl: string | null;
  conversationId: string | null;
  conversationUrl: string | null;
  mode: "text" | "avatar";

  setSessionId: (id: string) => void;
  addMessage: (msg: ChatMessage) => void;
  appendToLastAssistant: (text: string) => void;
  setWhiteboardUrl: (url: string) => void;
  setConversation: (id: string, url: string) => void;
  clearConversation: () => void;
  setMode: (mode: "text" | "avatar") => void;
  reset: () => void;
}

const initial = {
  sessionId: null,
  messages: [],
  whiteboardUrl: null,
  conversationId: null,
  conversationUrl: null,
  mode: "avatar" as const,
};

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      ...initial,

      setSessionId: (id) => set({ sessionId: id }),

      addMessage: (msg) =>
        set((s) => ({ messages: [...s.messages, msg] })),

      appendToLastAssistant: (text) =>
        set((s) => {
          const msgs = [...s.messages];
          const last = msgs[msgs.length - 1];
          if (last && last.role === "assistant") {
            return { messages: [...msgs.slice(0, -1), { ...last, content: last.content + text }] };
          }
          return { messages: [...msgs, { id: crypto.randomUUID(), role: "assistant", content: text }] };
        }),

      setWhiteboardUrl: (url) => set({ whiteboardUrl: url }),

      setConversation: (id, url) =>
        set({ conversationId: id, conversationUrl: url }),

      clearConversation: () => set({ conversationId: null, conversationUrl: null }),

      setMode: (mode) => set({ mode }),

      reset: () => set(initial),
    }),
    {
      name: "tutor-session",
      partialize: (s) => ({
        sessionId: s.sessionId,
        mode: s.mode,
      }),
    },
  ),
);
