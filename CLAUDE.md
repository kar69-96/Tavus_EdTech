# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev --port 3000          # start dev server (must use tmux: tmux new-session -d -s dev "pnpm dev")
pnpm build                    # production build + type check
pnpm exec tsc --noEmit        # type check only
pnpm db:migrate               # run lib/db/schema.sql against DATABASE_URL (Neon)
```

No test suite — do not invent one.

## Environment

Copy `.env.example` → `.env.local`. Required vars:

| Var | Source |
|---|---|
| `ANTHROPIC_API_KEY` | console.anthropic.com |
| `TAVUS_API_KEY` | platform.tavus.io |
| `TAVUS_REPLICA_ID` | platform.tavus.io (default replica) |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob store (already linked via `vercel env pull`) |
| `DATABASE_URL` | Neon PostgreSQL connection string |

`TAVUS_BACKUP_API_KEY` is optional — used for quota failover in `lib/api/resolve-key.ts`.

## Architecture

### Request flow

```
Browser → Next.js App Router (app/)
  └─ API routes (app/api/) — server-only, never called client-side directly
       ├─ /api/chat          → lib/agent/pal-agent.ts  (SSE streaming)
       ├─ /api/whiteboard    → POST persists HTML to DB; GET /api/whiteboard/widget/[id] serves HTML
       ├─ /api/upload        → lib/blob/upload.ts → DB
       ├─ /api/onboarding    → creates session, generates tutorial JSON, fires whiteboards
       ├─ /api/tutorial/[id] → fetches tutorial JSON from Blob
       └─ /api/tavus/*       → proxies Tavus API (key never in client bundle)
```

### Agent loop (`lib/agent/pal-agent.ts`)

`runPalAgent` is an async generator that yields `{ type: "text" | "whiteboard" }` chunks over SSE. It runs a standard agentic loop: stream → collect tool_use blocks → dispatch → append tool_results → repeat until `stop_reason !== "tool_use"`.

Two tools are registered:
- **`doc_fetch(doc_id)`** — fetches a student-uploaded doc from Blob, parses PDF/DOCX/TXT, returns first 3000 chars
- **`whiteboard(concept, prior_whiteboard_id?)`** — calls `whiteboard-agent.ts`, which generates a self-contained HTML/D3 file, stores it in Postgres (`whiteboards.html`), and returns `whiteboard_id`. With `prior_whiteboard_id`, the same row is updated in place. The agent calls this **autonomously** mid-explanation — the student never triggers it.

Stuck detection runs fire-and-forget on each user turn: keyword match first, then a Haiku classifier call if no keyword hit.

### Whiteboard sub-agent (`lib/agent/whiteboard-agent.ts`)

Separate Claude Sonnet call. Generates a self-contained `<html>` file using D3 v7 (CDN only, no external assets). Retries up to 3× on invalid HTML. Prior HTML is loaded from the DB when `prior_whiteboard_id` is set. Persisted to the `whiteboards` table (`html` column); the session iframe loads `GET /api/whiteboard/widget/[id]?sessionId=…`.

### Storage layout (Vercel Blob)

| Path | Contents |
|---|---|
| `uploads/{sessionId}/{filename}` | Student-uploaded docs |
| `tutorials/{sessionId}/tutorial.json` | Generated tutorial JSON |

Tutorial JSON shape: `{ session_id, homework, steps: [{ id, title, explanation, needs_whiteboard, whiteboard_id? }] }` (`whiteboard_id` is a `whiteboards` row UUID; legacy tutorials may still have `whiteboard_url`).

### Database (`lib/db/`)

Raw SQL via `@vercel/postgres`. Four tables: `sessions`, `documents`, `turns`, `whiteboards`. Schema in `lib/db/schema.sql`. Query helpers in individual files (`sessions.ts`, `documents.ts`, `turns.ts`, `whiteboards.ts`) — no ORM.

### Tavus / CVI (`components/call/`, `app/api/tavus/`)

`CVIProvider` wraps the session page with `DailyProvider`. `Conversation` renders the Daily.co video call. The Tavus API is proxied server-side — `lib/api/resolve-key.ts` checks `x-tavus-api-key` header first (demo presenter override), then `TAVUS_API_KEY` env. `lib/api/tavus-client.ts` is `import "server-only"`.

### Client state (`lib/store.ts`)

Zustand store with `persist` middleware. Persists only `sessionId` and `mode` to localStorage — messages and whiteboard iframe `src` (`whiteboardUrl`) are ephemeral. `mode` is `"text" | "avatar"` — both modes share the same backend and the same whiteboard panel state.

### Key constraint: env validation is lazy

`lib/api/env.ts` uses a Proxy so `getEnv()` runs at request time, not module evaluation time. This allows `next build` to succeed without real credentials.
