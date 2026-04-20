import "server-only";

const BASE = "https://tavusapi.com/v2";

export class TavusError extends Error {
  constructor(
    public status: number,
    public body: string,
  ) {
    super(`Tavus API ${status}: ${body.slice(0, 200)}`);
    this.name = "TavusError";
  }
}

interface TavusFetchInit extends Omit<RequestInit, "body"> {
  json?: unknown;
  body?: BodyInit;
}

async function tavusFetch<T>(
  apiKey: string,
  path: string,
  init: TavusFetchInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("x-api-key", apiKey);

  let body = init.body;
  if (init.json !== undefined) {
    headers.set("content-type", "application/json");
    body = JSON.stringify(init.json);
  }

  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers,
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(
      `[tavus] ${init.method ?? "GET"} ${path} -> ${res.status}`,
      text.slice(0, 500),
    );
    throw new TavusError(res.status, text);
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return undefined as T;
  }
  return (await res.json()) as T;
}

// -------------------------------------------------------------------------
// Types
// -------------------------------------------------------------------------

export interface CreatePersonaInput {
  persona_name: string;
  system_prompt: string;
  default_replica_id: string;
  document_ids?: string[];
}

export interface CreatePersonaOutput {
  persona_id: string;
}

export interface CreateConversationInput {
  persona_id: string;
  replica_id?: string;
  conversation_name: string;
  custom_greeting: string;
  document_retrieval_strategy?: "speed" | "balanced" | "quality";
}

export interface CreateConversationOutput {
  conversation_id: string;
  conversation_url: string;
  status: string;
}

/**
 * Tavus document status.
 *
 * Tavus has quietly added/renamed values over time. We enumerate the ones we
 * know, but the real API is tolerated as a loose string at the boundary —
 * `simplifyStatus` in `app/api/tavus/documents/route.ts` does the final
 * terminal/non-terminal collapse so a new upstream value can't brick the UI.
 */
export type TavusDocumentStatus =
  | "started"
  | "processing"
  | "indexing"
  | "ready"
  | "indexed"
  | "complete"
  | "success"
  | "error"
  | "failed"
  | "recrawling"
  | (string & {});

export interface TavusDocument {
  document_id: string;
  document_name?: string;
  document_url?: string;
  status: TavusDocumentStatus;
  progress?: number | null;
  error_message?: string | null;
}

/**
 * Collapse Tavus's document status into our 3-state UI model.
 *
 * Tavus has drifted terminal state naming in the past — we match broadly on
 * keyword rather than a fixed enum so a new upstream value like `indexed` or
 * `complete` doesn't silently leave the UI stuck on "processing" forever.
 *
 * Unknown values fall through to `ready` (with a warning log) rather than
 * `processing`: stale-ready is less bad than stale-spinner since the user can
 * still proceed with whatever knowledge is attached.
 */
const PROCESSING_KEYWORDS = [
  "start",
  "process",
  "indexing",
  "recrawl",
  "pending",
  "queue",
  "upload",
  "waiting",
  "download",
  "parse",
] as const;

const ERROR_KEYWORDS = ["error", "fail", "reject"] as const;

export function simplifyTavusDocStatus(
  status: TavusDocumentStatus | string | null | undefined,
): "processing" | "ready" | "error" {
  if (!status) return "ready";
  const s = String(status).toLowerCase();

  if (
    s === "ready" ||
    s === "indexed" ||
    s === "complete" ||
    s === "completed" ||
    s === "success" ||
    s === "succeeded" ||
    s === "done" ||
    s === "active"
  ) {
    return "ready";
  }

  if (ERROR_KEYWORDS.some((k) => s.includes(k))) return "error";
  if (PROCESSING_KEYWORDS.some((k) => s.includes(k))) return "processing";

  // Unknown value — treat as terminal so the UI doesn't spin forever.
  console.warn(
    `[tavus] unknown document status "${status}" — treating as ready`,
  );
  return "ready";
}

export type TavusClient = ReturnType<typeof createTavusClient>;

/** All Tavus API calls for a single API key (from env or request header override). */
export function createTavusClient(apiKey: string) {
  const key = apiKey;
  return {
    createPersona: (input: CreatePersonaInput) =>
      tavusFetch<CreatePersonaOutput>(key, "/personas", {
        method: "POST",
        json: { ...input, pipeline_mode: "full" },
      }),

    createConversation: (input: CreateConversationInput) =>
      tavusFetch<CreateConversationOutput>(key, "/conversations", {
        method: "POST",
        json: input,
      }),

    endConversation: (id: string) =>
      tavusFetch<void>(key, `/conversations/${id}/end`, {
        method: "POST",
      }),

    uploadDocumentFromUrl: (url: string, name?: string) =>
      tavusFetch<TavusDocument>(key, "/documents", {
        method: "POST",
        json: { document_url: url, ...(name && { document_name: name }) },
      }),

    getDocument: (id: string) =>
      tavusFetch<TavusDocument>(
        key,
        `/documents/${encodeURIComponent(id)}`,
      ),

    patchPersona: (personaId: string, operations: unknown[]) =>
      tavusFetch<unknown>(key, `/personas/${encodeURIComponent(personaId)}`, {
        method: "PATCH",
        json: operations,
      }),

    echoText: (conversationId: string, text: string) =>
      tavusFetch<void>(key, `/conversations/${encodeURIComponent(conversationId)}/echo`, {
        method: "POST",
        json: { script: text },
      }),
  };
}
