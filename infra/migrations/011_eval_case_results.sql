CREATE TABLE IF NOT EXISTS eval.eval_case_results (
  id uuid PRIMARY KEY,
  eval_run_id uuid NOT NULL REFERENCES eval.eval_runs (id) ON DELETE CASCADE,
  test_case_id text NOT NULL,
  trace_id text NOT NULL DEFAULT '',
  answer text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'completed',
  latency_ms integer NOT NULL DEFAULT 0,
  cost_usd numeric(12, 6) NOT NULL DEFAULT 0,
  error_message text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_eval_case_results_eval_run_created_at
  ON eval.eval_case_results (eval_run_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_eval_case_results_test_case_id
  ON eval.eval_case_results (test_case_id);

INSERT INTO rag.schema_migrations (version)
VALUES ('011_eval_case_results')
ON CONFLICT (version) DO NOTHING;
