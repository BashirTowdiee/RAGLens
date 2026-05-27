ALTER TABLE rag.retrieval_traces
  ADD COLUMN IF NOT EXISTS retrieval_mode text NOT NULL DEFAULT 'vector';

INSERT INTO rag.schema_migrations (version)
VALUES ('015_retrieval_trace_mode')
ON CONFLICT (version) DO NOTHING;
