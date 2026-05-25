ALTER TABLE eval.eval_case_results
  ADD COLUMN IF NOT EXISTS retrieval_scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS citation_scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS verdict text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS failure_type text NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_eval_case_results_verdict
  ON eval.eval_case_results (verdict);

CREATE INDEX IF NOT EXISTS idx_eval_case_results_failure_type
  ON eval.eval_case_results (failure_type);

INSERT INTO rag.schema_migrations (version)
VALUES ('012_eval_case_result_scores')
ON CONFLICT (version) DO NOTHING;
