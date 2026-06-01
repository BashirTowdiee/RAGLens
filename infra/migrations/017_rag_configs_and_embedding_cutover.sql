CREATE TABLE IF NOT EXISTS rag.rag_configs (
  id text PRIMARY KEY,
  name text NOT NULL,
  answer_provider text NOT NULL,
  answer_model text NOT NULL,
  embedding_provider text NOT NULL,
  embedding_model text NOT NULL,
  retrieval_mode text NOT NULL DEFAULT 'vector',
  top_k integer NOT NULL DEFAULT 5,
  reranker_provider text NOT NULL DEFAULT 'none',
  prompt_context_token_budget integer NOT NULL DEFAULT 1200,
  active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP INDEX IF EXISTS rag.idx_document_chunks_embedding;

ALTER TABLE rag.document_chunks
  DROP COLUMN IF EXISTS embedding;

ALTER TABLE rag.document_chunks
  ADD COLUMN embedding vector(768);

CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding
  ON rag.document_chunks USING ivfflat (embedding vector_cosine_ops);

INSERT INTO rag.rag_configs (
  id,
  name,
  answer_provider,
  answer_model,
  embedding_provider,
  embedding_model,
  retrieval_mode,
  top_k,
  reranker_provider,
  prompt_context_token_budget,
  active,
  metadata
)
VALUES
  (
    'deterministic',
    'Deterministic (nomic embeddings)',
    'deterministic',
    'deterministic-context-preview-v1',
    'ollama',
    'nomic-embed-text',
    'vector',
    5,
    'none',
    1200,
    true,
    '{"preset":"deterministic"}'::jsonb
  ),
  (
    'local-balanced',
    'Local Balanced (Ollama qwen3:8b)',
    'ollama',
    'qwen3:8b',
    'ollama',
    'nomic-embed-text',
    'vector',
    5,
    'none',
    1200,
    true,
    '{"preset":"local-balanced"}'::jsonb
  ),
  (
    'cloud-baseline',
    'Cloud Baseline (OpenAI gpt-4.1-mini)',
    'openai',
    'gpt-4.1-mini',
    'ollama',
    'nomic-embed-text',
    'vector',
    5,
    'none',
    1200,
    true,
    '{"preset":"cloud-baseline"}'::jsonb
  )
ON CONFLICT (id)
DO UPDATE SET
  name = EXCLUDED.name,
  answer_provider = EXCLUDED.answer_provider,
  answer_model = EXCLUDED.answer_model,
  embedding_provider = EXCLUDED.embedding_provider,
  embedding_model = EXCLUDED.embedding_model,
  retrieval_mode = EXCLUDED.retrieval_mode,
  top_k = EXCLUDED.top_k,
  reranker_provider = EXCLUDED.reranker_provider,
  prompt_context_token_budget = EXCLUDED.prompt_context_token_budget,
  active = EXCLUDED.active,
  metadata = EXCLUDED.metadata,
  updated_at = now();

INSERT INTO rag.schema_migrations (version)
VALUES ('017_rag_configs_and_embedding_cutover')
ON CONFLICT (version) DO NOTHING;
