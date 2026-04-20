"use client";

import { useCallback } from "react";
import { useDaily } from "@daily-co/daily-react";

export const useCVICall = () => {
  const daily = useDaily();

  const joinCall = useCallback(
    ({ url }: { url: string }) => {
      daily?.join({
        url,
        startVideoOff: true,
        startAudioOff: true,
        inputSettings: {
          audio: {
            processor: {
              type: "noise-cancellation",
            },
          },
        },
      });
    },
    [daily],
  );

  const leaveCall = useCallback(() => {
    daily?.leave();
  }, [daily]);

  return { joinCall, leaveCall };
};
