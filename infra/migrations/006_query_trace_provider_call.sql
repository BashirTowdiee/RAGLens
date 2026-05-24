ALTER TABLE rag.query_traces
  ADD COLUMN IF NOT EXISTS provider_call jsonb;

INSERT INTO rag.schema_migrations (version)
VALUES ('006_query_trace_provider_call')
ON CONFLICT (version) DO NOTHING;
