ALTER TABLE rag.query_traces
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'succeeded',
  ADD COLUMN IF NOT EXISTS error jsonb;

CREATE INDEX IF NOT EXISTS idx_query_traces_status ON rag.query_traces (status);

INSERT INTO rag.schema_migrations (version)
VALUES ('005_query_trace_failure_status')
ON CONFLICT (version) DO NOTHING;
