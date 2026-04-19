"use client";

/**
 * Client-side Tavus API key management.
 *
 * The session key is stored in sessionStorage (tab-scoped, not persisted) and
 * sent as X-Tavus-Api-Key on every same-origin API call. This lets a demo
 * presenter paste a fresh key without redeploying. Do not use for multi-tenant
 * production without proper auth.
 */

const SESSION_STORAGE_KEY = "tavus_api_key_override";
const API_KEY_HEADER = "X-Tavus-Api-Key";

export function getTavusSessionApiKey(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const v = sessionStorage.getItem(SESSION_STORAGE_KEY)?.trim();
    return v || null;
  } catch {
    return null;
  }
}

export function setTavusSessionApiKey(key: string): void {
  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, key.trim());
  } catch {
    // ignore quota / private mode
  }
}

export function clearTavusSessionApiKey(): void {
  try {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // ignore
  }
}

/** Same as fetch() but attaches the session Tavus key override when set. */
export function tavusApiFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const headers = new Headers(init?.headers);
  const override = getTavusSessionApiKey();
  if (override) {
    headers.set(API_KEY_HEADER, override);
  }
  return fetch(input, { ...init, headers });
}
