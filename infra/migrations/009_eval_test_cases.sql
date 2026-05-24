CREATE TABLE IF NOT EXISTS eval.test_cases (
  id uuid PRIMARY KEY,
  dataset_id uuid NOT NULL REFERENCES eval.datasets (id) ON DELETE CASCADE,
  question text NOT NULL,
  expected_answer text NOT NULL,
  reference_citations jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_eval_test_cases_dataset_created_at
  ON eval.test_cases (dataset_id, created_at DESC);

INSERT INTO rag.schema_migrations (version)
VALUES ('009_eval_test_cases')
ON CONFLICT (version) DO NOTHING;
