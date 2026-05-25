CREATE TABLE IF NOT EXISTS eval.evaluator_prompts (
  id uuid PRIMARY KEY,
  prompt_version text NOT NULL,
  provider text NOT NULL DEFAULT '',
  model text NOT NULL DEFAULT '',
  system_prompt text NOT NULL,
  user_prompt_template text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_evaluator_prompts_version_provider_model
  ON eval.evaluator_prompts (prompt_version, provider, model);

ALTER TABLE eval.eval_case_results
  ADD COLUMN IF NOT EXISTS judge_scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS judge_unsupported_claims jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS judge_missing_important_points jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS judge_verdict text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS judge_rationale text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS judge_error text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS evaluator_prompt_id uuid REFERENCES eval.evaluator_prompts (id);

CREATE INDEX IF NOT EXISTS idx_eval_case_results_judge_verdict
  ON eval.eval_case_results (judge_verdict);

CREATE INDEX IF NOT EXISTS idx_eval_case_results_judge_error
  ON eval.eval_case_results (judge_error)
  WHERE judge_error <> '';

INSERT INTO rag.schema_migrations (version)
VALUES ('013_eval_judge_persistence')
ON CONFLICT (version) DO NOTHING;
