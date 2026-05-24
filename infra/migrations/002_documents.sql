CREATE TABLE IF NOT EXISTS rag.documents (
  id uuid PRIMARY KEY,
  source_id text NOT NULL UNIQUE,
  title text NOT NULL,
  source_type text NOT NULL,
  source_uri text,
  version text NOT NULL DEFAULT '1',
  content_hash text NOT NULL,
  status text NOT NULL DEFAULT 'indexed',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rag.document_chunks (
  id uuid PRIMARY KEY,
  document_id uuid NOT NULL REFERENCES rag.documents(id) ON DELETE CASCADE,
  chunk_index integer NOT NULL,
  heading_path text[] NOT NULL DEFAULT '{}'::text[],
  content text NOT NULL,
  token_count_estimate integer NOT NULL,
  content_hash text NOT NULL,
  embedding vector(8),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (document_id, chunk_index)
);

ALTER TABLE rag.document_chunks
ADD COLUMN IF NOT EXISTS embedding vector(8);

CREATE INDEX IF NOT EXISTS idx_documents_source_id ON rag.documents (source_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id ON rag.document_chunks (document_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding ON rag.document_chunks USING ivfflat (embedding vector_cosine_ops);

INSERT INTO rag.schema_migrations (version)
VALUES ('002_documents')
ON CONFLICT (version) DO NOTHING;
