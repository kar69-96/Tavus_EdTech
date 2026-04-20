CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS sessions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at        TIMESTAMPTZ DEFAULT now(),
  homework          TEXT,
  tutorial_blob_url TEXT
);

CREATE TABLE IF NOT EXISTS documents (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   UUID REFERENCES sessions(id) ON DELETE CASCADE,
  filename     TEXT NOT NULL,
  content_type TEXT NOT NULL,
  blob_url     TEXT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS whiteboards (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID REFERENCES sessions(id) ON DELETE CASCADE,
  blob_url    TEXT,
  html        TEXT,
  widget_type TEXT NOT NULL CHECK (widget_type IN ('html', 'd3')),
  prompt      TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Existing deployments: add html, relax blob_url NOT NULL (safe to re-run)
ALTER TABLE whiteboards ADD COLUMN IF NOT EXISTS html TEXT;
ALTER TABLE whiteboards ALTER COLUMN blob_url DROP NOT NULL;

CREATE TABLE IF NOT EXISTS chunks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID REFERENCES sessions(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('doc', 'turn', 'tutorial')),
  source_id   UUID,
  content     TEXT NOT NULL,
  tsv         tsvector GENERATED ALWAYS AS (to_tsvector('english', content)) STORED,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chunks_tsv_idx     ON chunks USING GIN (tsv);
CREATE INDEX IF NOT EXISTS chunks_session_idx ON chunks (session_id, created_at DESC);
