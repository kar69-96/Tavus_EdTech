"use client";

import { useParticipantIds } from "@daily-co/daily-react";

function isLikelyTavusReplica(participant: {
  local?: boolean;
  user_id?: string;
  user_name?: string;
}): boolean {
  if (participant.local) return false;
  const uid = (participant.user_id ?? "").toLowerCase();
  const name = (participant.user_name ?? "").toLowerCase();
  if (uid.includes("tavus-replica") || uid.includes("tavus")) return true;
  if (name.includes("tavus") || name.includes("replica")) return true;
  return false;
}

/**
 * Tavus CVI replica session ids. Prefer explicit Tavus user_id matches; if the
 * upstream format changes, fall back to the sole remote participant (typical 1:1 CVI room).
 */
export const useReplicaIDs = (): string[] => {
  const explicit = useParticipantIds({
    filter: isLikelyTavusReplica,
  });

  const remoteOnly = useParticipantIds({
    filter: (p) => !p.local,
  });

  if (explicit.length > 0) return explicit;
  if (remoteOnly.length === 1) return remoteOnly;
  return [];
};
