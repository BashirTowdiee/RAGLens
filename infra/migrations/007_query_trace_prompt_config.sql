ALTER TABLE rag.query_traces
  ADD COLUMN IF NOT EXISTS prompt_version text NOT NULL DEFAULT 'query-prompt-v1',
  ADD COLUMN IF NOT EXISTS config jsonb NOT NULL DEFAULT '{"topK":5,"retrievalMode":"vector"}'::jsonb;

INSERT INTO rag.schema_migrations (version)
VALUES ('007_query_trace_prompt_config')
ON CONFLICT (version) DO NOTHING;
