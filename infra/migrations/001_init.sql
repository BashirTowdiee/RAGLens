CREATE EXTENSION IF NOT EXISTS vector;

CREATE SCHEMA IF NOT EXISTS rag;
CREATE SCHEMA IF NOT EXISTS eval;

CREATE TABLE IF NOT EXISTS rag.schema_migrations (
  version text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS eval.schema_migrations (
  version text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO rag.schema_migrations (version)
VALUES ('001_init')
ON CONFLICT (version) DO NOTHING;

INSERT INTO eval.schema_migrations (version)
VALUES ('001_init')
ON CONFLICT (version) DO NOTHING;
