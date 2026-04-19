"use client";

import React, { useEffect, useCallback } from "react";
import {
  DailyAudio,
  DailyVideo,
  useLocalSessionId,
  useMeetingState,
} from "@daily-co/daily-react";
import { Mic, MicOff, PhoneOff, Video, VideoOff } from "lucide-react";
import { useReplicaIDs } from "./hooks/use-replica-ids";
import { useCVICall } from "./hooks/use-cvi-call";
import { useLocalMicrophone } from "./hooks/use-local-microphone";
import { useLocalCamera } from "./hooks/use-local-camera";

interface ConversationProps {
  onLeave: () => void;
  conversationUrl: string;
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

const SelfView = React.memo(function SelfView({
  isCamMuted,
}: {
  isCamMuted: boolean;
}) {
  const localSessionId = useLocalSessionId();

  if (!localSessionId) return null;

  return (
    <div
      className="group/self absolute z-10 aspect-video overflow-hidden rounded-xl border border-fg-1/15 bg-ink-2 shadow-2xl
        top-[clamp(0.75rem,2vmin,1.25rem)] left-[clamp(0.75rem,2vmin,1.25rem)]
        w-[clamp(5.25rem,min(18vw,26vmin),13.5rem)]
        hover:w-[min(48vw,calc(85vh*16/9),92vw)]
        transition-[width] duration-300 ease-out"
    >
      <div className="relative h-full w-full bg-black">
        {isCamMuted ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-ink-1">
            <VideoOff className="h-5 w-5 text-fg-1/40" aria-hidden />
            <span className="sr-only">Camera off</span>
          </div>
        ) : (
          <DailyVideo
            sessionId={localSessionId}
            type="video"
            autoPlay
            mirror
            className="h-full w-full object-cover"
          />
        )}
      </div>
    </div>
  );
});

export const Conversation = React.memo(function Conversation({
  onLeave,
  conversationUrl,
}: ConversationProps) {
  const { joinCall, leaveCall } = useCVICall();
  const meetingState = useMeetingState();
  const { isMicMuted, onToggleMicrophone } = useLocalMicrophone();
  const { isCamMuted, onToggleCamera } = useLocalCamera();

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
    <div className="group relative h-full w-full cursor-default overflow-hidden bg-ink-0">
      <DailyAudio />

      <MainVideo />

      <SelfView isCamMuted={isCamMuted} />

      <div
        className="pointer-events-none absolute bottom-8 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-full border border-fg-1/12 bg-black/60 px-2 py-1.5 opacity-0 shadow-[0_8px_32px_rgba(0,0,0,0.45)] backdrop-blur-md transition-opacity duration-300 ease-out group-hover:pointer-events-auto group-hover:opacity-100"
        role="toolbar"
        aria-label="Call controls"
      >
        <button
          type="button"
          onClick={onToggleMicrophone}
          className={`${dockBtn} ${isMicMuted ? "bg-fg-1/8 text-fg-1/45" : ""}`}
          aria-label={isMicMuted ? "Unmute microphone" : "Mute microphone"}
        >
          {isMicMuted ? (
            <MicOff className="h-[18px] w-[18px]" strokeWidth={2} />
          ) : (
            <Mic className="h-[18px] w-[18px]" strokeWidth={2} />
          )}
        </button>

        <button
          type="button"
          onClick={onToggleCamera}
          className={`${dockBtn} ${isCamMuted ? "bg-fg-1/8 text-fg-1/45" : ""}`}
          aria-label={isCamMuted ? "Turn on camera" : "Turn off camera"}
        >
          {isCamMuted ? (
            <VideoOff className="h-[18px] w-[18px]" strokeWidth={2} />
          ) : (
            <Video className="h-[18px] w-[18px]" strokeWidth={2} />
          )}
        </button>

        <button
          type="button"
          onClick={handleLeave}
          className="ml-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-500/90 text-white shadow-sm transition-colors hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-300"
          aria-label="End call"
        >
          <PhoneOff className="h-[18px] w-[18px]" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
});
