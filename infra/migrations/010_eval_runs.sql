CREATE TABLE IF NOT EXISTS eval.eval_runs (
  id uuid PRIMARY KEY,
  dataset_id uuid NOT NULL REFERENCES eval.datasets (id) ON DELETE RESTRICT,
  name text NOT NULL DEFAULT '',
  rag_config_id text NOT NULL DEFAULT 'default',
  status text NOT NULL DEFAULT 'queued',
  total_cases integer NOT NULL DEFAULT 0,
  completed_cases integer NOT NULL DEFAULT 0,
  failed_cases integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_eval_runs_created_at ON eval.eval_runs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_eval_runs_dataset_id ON eval.eval_runs (dataset_id);

INSERT INTO rag.schema_migrations (version)
VALUES ('010_eval_runs')
ON CONFLICT (version) DO NOTHING;
