CREATE SCHEMA IF NOT EXISTS eval;

CREATE TABLE IF NOT EXISTS eval.datasets (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  version text NOT NULL,
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (name, version)
);

CREATE INDEX IF NOT EXISTS idx_eval_datasets_created_at ON eval.datasets (created_at DESC);

INSERT INTO rag.schema_migrations (version)
VALUES ('008_eval_datasets')
ON CONFLICT (version) DO NOTHING;
