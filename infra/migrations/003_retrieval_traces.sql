CREATE TABLE IF NOT EXISTS rag.retrieval_traces (
  id uuid PRIMARY KEY,
  query text NOT NULL,
  limit_value integer NOT NULL,
  result_count integer NOT NULL,
  duration_ms integer NOT NULL,
  chunks jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_retrieval_traces_created_at ON rag.retrieval_traces (created_at DESC);

INSERT INTO rag.schema_migrations (version)
VALUES ('003_retrieval_traces')
ON CONFLICT (version) DO NOTHING;
