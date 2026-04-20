"use client";

import React, { useEffect, useCallback } from "react";
import {
  DailyAudio,
  DailyVideo,
  useMeetingState,
} from "@daily-co/daily-react";
import { PhoneOff } from "lucide-react";
import { useReplicaIDs } from "./hooks/use-replica-ids";
import { useCVICall } from "./hooks/use-cvi-call";

interface ConversationProps {
  onLeave: () => void;
  conversationUrl: string;
  subtitle?: string | null;
}

const MainVideo = React.memo(function MainVideo() {
  const replicaIds = useReplicaIDs();
  const replicaId = replicaIds[0];

  if (!replicaId) {
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <p className="text-sm text-fg-1/55">Connecting…</p>
      </div>
    );
  }

  return (
    <DailyVideo
      sessionId={replicaId}
      type="video"
      autoPlay
      mirror={false}
      className="absolute inset-0 h-full w-full object-cover"
    />
  );
});

export const Conversation = React.memo(function Conversation({
  onLeave,
  conversationUrl,
  subtitle,
}: ConversationProps) {
  const { joinCall, leaveCall } = useCVICall();
  const meetingState = useMeetingState();

  useEffect(() => {
    if (meetingState === "error") {
      onLeave();
    }
  }, [meetingState, onLeave]);

  useEffect(() => {
    joinCall({ url: conversationUrl });
    return () => {
      leaveCall();
    };
  }, [conversationUrl, joinCall, leaveCall]);

  const handleLeave = useCallback(() => {
    leaveCall();
    onLeave();
  }, [leaveCall, onLeave]);

  const dockBtn =
    "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-fg-1/70 transition-colors hover:bg-fg-1/10 hover:text-fg-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg-2";

  return (
    <div className="flex flex-col h-full">
      {/* Video area */}
      <div className="group relative flex-1 cursor-default overflow-hidden bg-ink-0">
        <DailyAudio />

        <MainVideo />

        {/* Subtitle overlay */}
        {subtitle && (
          <div className="absolute bottom-20 left-1/2 z-30 -translate-x-1/2 px-4 max-w-[90%]">
            <p className="rounded-lg bg-black/75 px-4 py-2 text-center text-sm text-white leading-snug backdrop-blur-sm line-clamp-2">
              {subtitle}
            </p>
          </div>
        )}

        {/* Control dock — hang-up only */}
        <div
          className="pointer-events-none absolute bottom-8 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-full border border-fg-1/12 bg-black/60 px-2 py-1.5 opacity-0 shadow-[0_8px_32px_rgba(0,0,0,0.45)] backdrop-blur-md transition-opacity duration-300 ease-out group-hover:pointer-events-auto group-hover:opacity-100"
          role="toolbar"
          aria-label="Call controls"
        >
          <button
            type="button"
            onClick={handleLeave}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-500/90 text-white shadow-sm transition-colors hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-300"
            aria-label="End call"
          >
            <PhoneOff className="h-[18px] w-[18px]" strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
});
