"use client";

import { useParticipantIds } from "@daily-co/daily-react";

export const useReplicaIDs = (): string[] => {
  return useParticipantIds({
    filter: (participant) => participant.user_id.includes("tavus-replica"),
  });
};
