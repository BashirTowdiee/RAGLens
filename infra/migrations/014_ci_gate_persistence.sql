CREATE TABLE IF NOT EXISTS eval.quality_thresholds (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  min_hit_at_5 numeric(5, 4) NOT NULL DEFAULT 0,
  min_citation_validity numeric(5, 4) NOT NULL DEFAULT 0,
  min_groundedness numeric(5, 4) NOT NULL DEFAULT 0,
  min_correctness numeric(5, 4) NOT NULL DEFAULT 0,
  max_average_latency_ms integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_quality_thresholds_name
  ON eval.quality_thresholds (name);

CREATE TABLE IF NOT EXISTS eval.ci_gate_results (
  id uuid PRIMARY KEY,
  eval_run_id uuid NOT NULL REFERENCES eval.eval_runs (id) ON DELETE CASCADE,
  quality_threshold_id uuid REFERENCES eval.quality_thresholds (id),
  preset_name text NOT NULL DEFAULT '',
  status text NOT NULL,
  passed boolean NOT NULL,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  threshold_results jsonb NOT NULL DEFAULT '[]'::jsonb,
  summary_markdown text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ci_gate_results_eval_run_created_at
  ON eval.ci_gate_results (eval_run_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ci_gate_results_status
  ON eval.ci_gate_results (status);

CREATE INDEX IF NOT EXISTS idx_ci_gate_results_passed
  ON eval.ci_gate_results (passed);

INSERT INTO rag.schema_migrations (version)
VALUES ('014_ci_gate_persistence')
ON CONFLICT (version) DO NOTHING;
