CREATE TABLE IF NOT EXISTS rag.query_traces (
  id uuid PRIMARY KEY,
  question text NOT NULL,
  answer text NOT NULL,
  provider text NOT NULL,
  model text NOT NULL,
  usage jsonb NOT NULL DEFAULT '{}'::jsonb,
  latency_ms integer NOT NULL,
  citation_validation jsonb NOT NULL DEFAULT '{}'::jsonb,
  citations jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_query_traces_created_at ON rag.query_traces (created_at DESC);

INSERT INTO rag.schema_migrations (version)
VALUES ('004_query_traces')
ON CONFLICT (version) DO NOTHING;
