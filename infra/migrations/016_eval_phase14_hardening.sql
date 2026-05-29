ALTER TABLE eval.eval_runs
  ADD COLUMN IF NOT EXISTS judge_enabled boolean NOT NULL DEFAULT true;

ALTER TABLE eval.eval_case_results
  ADD COLUMN IF NOT EXISTS question text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS expected_answer text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS expected_sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS retrieved_sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS retrieved_context jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS citations jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS request_id text NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_eval_case_results_request_id
  ON eval.eval_case_results (request_id)
  WHERE request_id <> '';

CREATE TABLE IF NOT EXISTS eval.comparisons (
  id uuid PRIMARY KEY,
  baseline_eval_run_id uuid NOT NULL REFERENCES eval.eval_runs (id) ON DELETE CASCADE,
  candidate_eval_run_id uuid NOT NULL REFERENCES eval.eval_runs (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_eval_comparisons_created_at
  ON eval.comparisons (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_eval_comparisons_baseline_candidate
  ON eval.comparisons (baseline_eval_run_id, candidate_eval_run_id);

INSERT INTO rag.schema_migrations (version)
VALUES ('016_eval_phase14_hardening')
ON CONFLICT (version) DO NOTHING;
