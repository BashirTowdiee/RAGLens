---
title: "Architecture Planning"
description: "Architecture planning, boundaries, and service structure for RAGLens."
order: 6
section: "Architecture"
status: "stable"
---
# Architecture Planning: RAGLens

## 1. Architecture objective

RAGLens should be designed as a production-style system with clear service boundaries:

```text
rag-api
  TypeScript + Fastify
  Handles the user-facing RAG workload.

eval-api
  Python + FastAPI
  Handles evaluation, scoring, regression analysis, and CI quality gates.

dashboard
  Next.js
  Provides inspection, debugging, and reporting views.

postgres
  PostgreSQL + pgvector
  Stores documents, chunks, vectors, traces, datasets, eval runs, and scores.
```

The architecture goal is not just to make RAG work. The goal is to make RAG:

```text
- traceable
- evaluable
- reproducible
- observable
- cost-aware
- regression-tested
- easy to debug
```

---

# 2. System context

## Users

```text
AI Engineer
  Uses eval-api and dashboard to test prompts, models, retrieval configs, and regressions.

Product Engineer
  Uses rag-api to build source-grounded AI features.

Platform Engineer
  Monitors service health, failures, latency, costs, and CI quality gates.

Risk / Compliance Reviewer
  Reviews citations, source chunks, and unsupported-claim reports.
```

## External dependencies

```text
OpenAI
  MVP provider for embeddings, answer generation, and judge scoring.

PostgreSQL + pgvector
  Storage for metadata, traces, vectors, datasets, and eval results.

GitHub Actions
  CI runner for quality gates.

Optional later:
  Anthropic
  OpenRouter
  Ollama
  RAGAS
  DeepEval
  sentence-transformers
```

---

# 3. High-level system architecture

```text
                         ┌────────────────────────┐
                         │       Dashboard        │
                         │   Next.js / TypeScript │
                         └───────────┬────────────┘
                                     │
                     ┌───────────────┴───────────────┐
                     │                               │
          ┌──────────▼──────────┐        ┌───────────▼──────────┐
          │       rag-api       │        │       eval-api       │
          │ TypeScript/Fastify  │◄───────│ Python/FastAPI       │
          │                     │ HTTP   │                      │
          └──────────┬──────────┘        └───────────┬──────────┘
                     │                               │
                     └───────────────┬───────────────┘
                                     │
                           ┌─────────▼─────────┐
                           │    PostgreSQL     │
                           │    + pgvector     │
                           │                   │
                           │  rag schema       │
                           │  eval schema      │
                           └─────────┬─────────┘
                                     │
                           ┌─────────▼─────────┐
                           │ Object Storage    │
                           │ raw docs/reports  │
                           │ post-MVP          │
                           └───────────────────┘
```

---

# 4. Core architectural principles

## 4.1 Separate serving from evaluation

The user-facing RAG path and the evaluation path are different workloads.

```text
rag-api:
  low-latency request/response
  serves user queries
  records traces

eval-api:
  long-running jobs
  calls rag-api as a black box
  performs scoring
  produces reports
```

This prevents evaluation workloads from degrading the RAG API.

---

## 4.2 Eval API treats RAG API as a black box

The eval service should not import RAG internals.

Good:

```text
eval-api -> POST rag-api /query
eval-api -> GET rag-api /queries/:traceId
eval-api -> score result
```

Avoid:

```text
eval-api importing retrieval code
eval-api reading chunking internals
eval-api duplicating RAG generation logic
```

This keeps the evaluation harness reusable. It could later evaluate any RAG API that follows the same contract.

---

## 4.3 Store traces as first-class data

A RAG answer without a trace is difficult to debug.

Every query should store:

```text
- question
- RAG config
- prompt version
- retrieved chunks
- chunk scores
- generated answer
- citations
- model/provider
- token usage
- estimated cost
- latency
- errors if any
```

---

## 4.4 Deterministic metrics first, LLM judge second

Deterministic metrics are cheaper and repeatable.

Use deterministic checks for:

```text
- hit@k
- recall@k
- expected source rank
- citation validity
- citation traceability
```

Use LLM-as-judge for:

```text
- groundedness
- correctness
- completeness
- citation support
- unsupported claims
```

---

## 4.5 Version everything that changes behaviour

Store versions for:

```text
- prompt templates
- RAG configs
- dataset versions
- evaluator prompt versions
- model names
- embedding model names
- chunking settings
```

This makes eval results reproducible.

---

# 5. Monorepo architecture

## Recommended structure

```text
raglens/
  apps/
    rag-api/
      src/
        config/
        db/
        modules/
          documents/
          chunks/
          embeddings/
          retrieval/
          generation/
          citations/
          traces/
          rag-configs/
          prompts/
        providers/
        routes/
        server.ts
      test/

    eval-api/
      app/
        config/
        db/
        modules/
          datasets/
          test_cases/
          eval_runs/
          scoring/
          judges/
          comparisons/
          ci/
        clients/
          rag_api_client.py
        main.py
      tests/

    dashboard/
      app/
      src/
        components/
        features/
          documents/
          queries/
          datasets/
          eval-runs/
          comparisons/
          configs/
        lib/
      tests/

  packages/
    contracts/
      openapi/
      schemas/
      generated/
    docs/
      architecture/
      product/
      decisions/

  infra/
    docker/
    migrations/
      rag/
      eval/
    seed/
      documents/
      datasets/
    docker-compose.yml

  .github/
    workflows/
      ci.yml
      rag-quality-gate.yml
```

## Why monorepo

```text
- simpler local development
- shared contracts are easier to manage
- one Docker Compose environment
- one CI pipeline
- still supports separate deployable services
```

---

# 6. Service architecture

## 6.1 `rag-api`

### Responsibility

The RAG API is the production-facing service.

It owns:

```text
- documents
- chunks
- embeddings
- retrieval
- answer generation
- citations
- query traces
- RAG configs
- prompt versions
```

### Internal module layout

```text
modules/
  documents/
    document.routes.ts
    document.service.ts
    document.repository.ts
    document.schemas.ts

  chunks/
    chunk.service.ts
    chunk.repository.ts
    chunker.ts

  embeddings/
    embedding.service.ts
    embedding-provider.ts

  retrieval/
    retriever.ts
    vector-retriever.ts
    hybrid-retriever.ts       # post-MVP
    retrieval.types.ts

  generation/
    answer-generator.ts
    prompt-builder.ts

  citations/
    citation-extractor.ts
    citation-validator.ts

  traces/
    trace.service.ts
    trace.repository.ts

  rag-configs/
    rag-config.service.ts
    rag-config.repository.ts

  prompts/
    prompt-registry.ts
```

### Recommended layering

```text
routes
  -> service
    -> domain logic
      -> repository/provider
```

Routes should not directly call database or providers.

---

## 6.2 `eval-api`

### Responsibility

The Eval API is the isolated quality service.

It owns:

```text
- datasets
- test cases
- eval runs
- eval case results
- scoring
- judge prompts
- run comparisons
- CI gate reports
```

### Internal module layout

```text
modules/
  datasets/
    routes.py
    service.py
    repository.py
    schemas.py

  test_cases/
    routes.py
    service.py
    repository.py
    schemas.py

  eval_runs/
    routes.py
    runner.py
    service.py
    repository.py
    schemas.py

  scoring/
    retrieval_metrics.py
    citation_metrics.py
    verdict.py

  judges/
    llm_judge.py
    judge_prompts.py
    schemas.py

  comparisons/
    service.py
    repository.py

  ci/
    routes.py
    quality_gate.py

clients/
  rag_api_client.py
```

### Recommended layering

```text
routes
  -> service
    -> runner/scoring/judge
      -> repository / rag-api client
```

The eval runner calls `rag-api` over HTTP.

---

## 6.3 `dashboard`

### Responsibility

The dashboard is the inspection interface.

It consumes both APIs:

```text
dashboard -> rag-api
dashboard -> eval-api
```

### Feature structure

```text
features/
  documents/
  queries/
  datasets/
  eval-runs/
  comparisons/
  configs/
  settings/
```

### UI priority

The most important pages are:

```text
1. Query Trace Detail
2. Eval Run Detail
3. Failed Case Detail
4. Run Comparison Detail
```

---

# 7. Data architecture

Use a single PostgreSQL database for MVP with separate schemas:

```text
rag.*
eval.*
```

This keeps local development simple while preserving service boundaries.

---

## 7.1 `rag` schema

```text
rag.documents
rag.document_chunks
rag.query_traces
rag.query_trace_chunks
rag.query_trace_citations
rag.rag_configs
rag.prompt_versions
rag.provider_calls
```

### `rag.documents`

```sql
CREATE TABLE rag.documents (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  document_type TEXT NOT NULL,
  source_uri TEXT,
  status TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  checksum TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### `rag.document_chunks`

```sql
CREATE TABLE rag.document_chunks (
  id UUID PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES rag.documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  text TEXT NOT NULL,
  token_count INTEGER,
  metadata JSONB NOT NULL DEFAULT '{}',
  embedding VECTOR(1536),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Note: embedding dimension depends on the embedding model. For OpenAI `text-embedding-3-small`, 1536 is a common starting dimension. Make this configurable if you plan to swap embedding models.

### `rag.rag_configs`

```sql
CREATE TABLE rag.rag_configs (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  embedding_provider TEXT NOT NULL,
  embedding_model TEXT NOT NULL,
  retrieval_mode TEXT NOT NULL,
  top_k INTEGER NOT NULL,
  chunk_size INTEGER NOT NULL,
  chunk_overlap INTEGER NOT NULL,
  prompt_version TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### `rag.query_traces`

```sql
CREATE TABLE rag.query_traces (
  id UUID PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  rag_config_id UUID REFERENCES rag.rag_configs(id),
  latency_ms INTEGER,
  input_tokens INTEGER,
  output_tokens INTEGER,
  estimated_cost NUMERIC(12, 6),
  status TEXT NOT NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### `rag.query_trace_chunks`

```sql
CREATE TABLE rag.query_trace_chunks (
  id UUID PRIMARY KEY,
  trace_id UUID NOT NULL REFERENCES rag.query_traces(id) ON DELETE CASCADE,
  chunk_id UUID NOT NULL REFERENCES rag.document_chunks(id),
  document_id UUID NOT NULL REFERENCES rag.documents(id),
  rank INTEGER NOT NULL,
  score DOUBLE PRECISION,
  rerank_score DOUBLE PRECISION,
  was_used_in_context BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### `rag.query_trace_citations`

```sql
CREATE TABLE rag.query_trace_citations (
  id UUID PRIMARY KEY,
  trace_id UUID NOT NULL REFERENCES rag.query_traces(id) ON DELETE CASCADE,
  chunk_id UUID REFERENCES rag.document_chunks(id),
  document_id UUID REFERENCES rag.documents(id),
  citation_index INTEGER NOT NULL,
  title TEXT,
  section TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### `rag.provider_calls`

```sql
CREATE TABLE rag.provider_calls (
  id UUID PRIMARY KEY,
  trace_id UUID REFERENCES rag.query_traces(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  operation TEXT NOT NULL,
  latency_ms INTEGER,
  input_tokens INTEGER,
  output_tokens INTEGER,
  estimated_cost NUMERIC(12, 6),
  status TEXT NOT NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 7.2 `eval` schema

```text
eval.datasets
eval.test_cases
eval.eval_runs
eval.eval_case_results
eval.evaluator_prompts
eval.run_comparisons
eval.quality_thresholds
```

### `eval.datasets`

```sql
CREATE TABLE eval.datasets (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  description TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(name, version)
);
```

### `eval.test_cases`

```sql
CREATE TABLE eval.test_cases (
  id UUID PRIMARY KEY,
  dataset_id UUID NOT NULL REFERENCES eval.datasets(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  expected_answer TEXT,
  expected_sources JSONB NOT NULL DEFAULT '[]',
  tags TEXT[] NOT NULL DEFAULT '{}',
  type TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  no_answer_expected BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### `eval.eval_runs`

```sql
CREATE TABLE eval.eval_runs (
  id UUID PRIMARY KEY,
  dataset_id UUID NOT NULL REFERENCES eval.datasets(id),
  rag_config_id UUID,
  status TEXT NOT NULL,
  thresholds JSONB NOT NULL DEFAULT '{}',
  summary_scores JSONB NOT NULL DEFAULT '{}',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### `eval.eval_case_results`

```sql
CREATE TABLE eval.eval_case_results (
  id UUID PRIMARY KEY,
  eval_run_id UUID NOT NULL REFERENCES eval.eval_runs(id) ON DELETE CASCADE,
  test_case_id UUID NOT NULL REFERENCES eval.test_cases(id),
  trace_id UUID,
  answer TEXT,
  retrieval_scores JSONB NOT NULL DEFAULT '{}',
  citation_scores JSONB NOT NULL DEFAULT '{}',
  judge_scores JSONB NOT NULL DEFAULT '{}',
  verdict TEXT NOT NULL,
  failure_type TEXT,
  evaluator_notes TEXT,
  latency_ms INTEGER,
  estimated_cost NUMERIC(12, 6),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### `eval.evaluator_prompts`

```sql
CREATE TABLE eval.evaluator_prompts (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  prompt TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(name, version)
);
```

### `eval.run_comparisons`

```sql
CREATE TABLE eval.run_comparisons (
  id UUID PRIMARY KEY,
  baseline_run_id UUID NOT NULL REFERENCES eval.eval_runs(id),
  candidate_run_id UUID NOT NULL REFERENCES eval.eval_runs(id),
  summary JSONB NOT NULL DEFAULT '{}',
  improved_cases JSONB NOT NULL DEFAULT '[]',
  regressed_cases JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

# 8. API architecture

## 8.1 `rag-api` endpoints

```text
GET  /health

POST /documents/ingest
GET  /documents
GET  /documents/:documentId
GET  /documents/:documentId/chunks

POST /query
GET  /queries
GET  /queries/:traceId
GET  /queries/:traceId/chunks

GET  /rag-configs
POST /rag-configs

GET  /prompt-versions
```

## 8.2 `eval-api` endpoints

```text
GET  /health

POST /datasets
GET  /datasets
GET  /datasets/:datasetId

POST /datasets/:datasetId/test-cases
GET  /datasets/:datasetId/test-cases
GET  /test-cases/:testCaseId

POST /eval-runs
GET  /eval-runs
GET  /eval-runs/:evalRunId
GET  /eval-runs/:evalRunId/results

POST /eval-runs/:evalRunId/compare
GET  /comparisons/:comparisonId

POST /ci/evaluate
```

---

# 9. Core data flows

## 9.1 Document ingestion flow

```text
User/Dashboard
  -> POST rag-api /documents/ingest
    -> validate input with Zod
    -> create document record
    -> normalise text
    -> chunk document
    -> call embedding provider
    -> store chunks + embeddings
    -> mark document indexed
  -> return documentId, status, chunkCount
```

### MVP behaviour

Synchronous ingestion is acceptable for small documents.

### Post-MVP

Move ingestion to a job queue:

```text
POST /documents/ingest
  -> create document status pending
  -> enqueue indexing job
  -> worker chunks/embeds/indexes
```

---

## 9.2 Query flow

```text
Dashboard/User
  -> POST rag-api /query
    -> validate question
    -> load RAG config
    -> embed query
    -> retrieve top K chunks
    -> build context
    -> build prompt
    -> call LLM
    -> parse answer/citations
    -> persist query trace
    -> return answer, citations, traceId, cost, latency
```

### Failure handling

If retrieval finds no useful chunks:

```text
return insufficient evidence response
persist trace with status completed_no_context
```

If provider fails:

```text
persist trace with status failed
return structured provider error
```

---

## 9.3 Eval run flow

```text
Dashboard/CI
  -> POST eval-api /eval-runs
    -> create eval run status queued
    -> start runner
    -> load dataset test cases
    -> for each test case:
         -> call rag-api /query
         -> receive answer + traceId
         -> fetch trace
         -> score retrieval metrics
         -> score citation metrics
         -> optionally run LLM judge
         -> store eval case result
    -> aggregate summary
    -> mark run completed / partially_failed / failed
```

### MVP behaviour

Sequential execution is acceptable.

### Post-MVP

Add controlled concurrency:

```text
max_concurrency = 3
provider-specific rate limiters
retry with exponential backoff
```

---

## 9.4 Run comparison flow

```text
Dashboard
  -> POST eval-api /eval-runs/:id/compare
    -> load baseline run
    -> load candidate run
    -> match results by test_case_id
    -> calculate metric deltas
    -> classify improved/regressed cases
    -> store comparison
  -> return comparison detail
```

---

# 10. Retrieval architecture

## MVP retrieval

```text
query
  -> embedding
  -> vector similarity search in pgvector
  -> top K chunks
```

### Example pgvector query

```sql
SELECT
  id,
  document_id,
  text,
  metadata,
  embedding <=> $1 AS distance
FROM rag.document_chunks
ORDER BY embedding <=> $1
LIMIT $2;
```

## Post-MVP retrieval

Add:

```text
- keyword search
- hybrid search
- metadata filters
- query rewriting
- reranking
- context packing
```

## Retrieval modes

```text
vector
keyword
hybrid
hybrid_reranked
```

For MVP, implement `vector`. Design the config to allow later modes.

---

# 11. Provider architecture

## TypeScript provider interfaces

```ts
export interface ChatProvider {
  complete(input: ChatCompletionInput): Promise<ChatCompletionResult>;
}

export interface EmbeddingProvider {
  embed(input: EmbeddingInput): Promise<EmbeddingResult>;
}

export type ChatCompletionInput = {
  model: string;
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  temperature?: number;
  maxTokens?: number;
};

export type ChatCompletionResult = {
  text: string;
  inputTokens?: number;
  outputTokens?: number;
  estimatedCost?: number;
  raw?: unknown;
};

export type EmbeddingInput = {
  model: string;
  text: string;
};

export type EmbeddingResult = {
  embedding: number[];
  inputTokens?: number;
  estimatedCost?: number;
  raw?: unknown;
};
```

## MVP providers

```text
OpenAIChatProvider
OpenAIEmbeddingProvider
```

## Later providers

```text
AnthropicChatProvider
OpenRouterChatProvider
OllamaChatProvider
```

## Python eval provider

The Python eval service can have its own judge provider abstraction:

```python
class JudgeProvider(Protocol):
    async def judge(self, request: JudgeRequest) -> JudgeResult:
        ...
```

Keep the Python judge abstraction separate from the TypeScript provider code.

---

# 12. Prompt architecture

## Prompt versioning

Store prompt templates in code/config first:

```text
apps/rag-api/src/modules/prompts/templates/answer-v1.ts
apps/eval-api/app/modules/judges/prompts/judge-v1.py
```

Store the version used in traces and eval results.

## RAG answer prompt responsibilities

The answer prompt should instruct the model to:

```text
- answer only from provided context
- cite source chunks
- say when context is insufficient
- avoid unsupported claims
- return structured output if possible
```

## Judge prompt responsibilities

The judge prompt should evaluate:

```text
- groundedness
- correctness
- completeness
- citation support
- unsupported claims
- missing important points
```

The judge output should be structured JSON.

---

# 13. Evaluation architecture

## Deterministic retrieval metrics

Input:

```text
test case expected_sources
query trace retrieved_chunks
```

Output:

```json
{
  "hitAt5": true,
  "recallAt10": 0.5,
  "expectedSourceRank": 2
}
```

## Citation metrics

Input:

```text
trace citations
trace retrieved chunks
document chunks table
```

Output:

```json
{
  "citationPresent": true,
  "citationValidity": 1.0,
  "citationTraceability": 1.0
}
```

## LLM judge metrics

Input:

```text
question
expected answer
generated answer
retrieved context
citations
```

Output:

```json
{
  "groundedness": 0.87,
  "correctness": 0.82,
  "completeness": 0.78,
  "citationSupport": 0.91,
  "unsupportedClaims": [],
  "missingImportantPoints": [
    "The answer did not mention manager approval for remote work over two weeks."
  ],
  "verdict": "pass"
}
```

## Verdict calculation

Keep this deterministic and configurable.

Example:

```text
fail if:
  hitAt5 is false
  citationValidity < 0.95
  groundedness < 0.85
  correctness < 0.80

warning if:
  latency exceeds threshold
  cost exceeds threshold
```

---

# 14. Observability architecture

## Request IDs

Every API request should have a request ID.

```text
x-request-id
```

If not provided, generate one.

## Trace IDs

Every RAG query should return:

```text
traceId
```

Every eval case result should link to:

```text
traceId
```

## Logging

Use structured logs.

### rag-api log fields

```text
request_id
trace_id
route
provider
model
operation
latency_ms
status
error_message
```

### eval-api log fields

```text
request_id
eval_run_id
test_case_id
trace_id
operation
latency_ms
status
error_message
```

## Provider call logging

Store provider calls in `rag.provider_calls` where relevant.

For eval judge calls, either:

```text
- store in eval judge result JSON for MVP
- create eval.provider_calls later
```

---

# 15. Security architecture

## MVP security

```text
- local-only by default
- API keys loaded from environment variables
- .env.example checked in
- .env ignored
- secrets never logged
- provider raw responses stored carefully
```

## Post-MVP security

```text
- authentication
- API key per service
- dashboard login
- workspace isolation
- document-level permissions
- audit logs
```

## Sensitive logging rule

Do not log:

```text
- API keys
- full provider auth headers
- raw secrets
```

Be careful storing full prompts if documents may contain sensitive content. For MVP sample docs, this is fine.

---

# 16. Deployment architecture

## Local MVP

Use Docker Compose.

```yaml
services:
  postgres:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_DB: raglens
      POSTGRES_USER: raglens
      POSTGRES_PASSWORD: raglens
    ports:
      - "5432:5432"

  rag-api:
    build: ./apps/rag-api
    depends_on:
      - postgres
    environment:
      DATABASE_URL: postgres://raglens:raglens@postgres:5432/raglens
      OPENAI_API_KEY: ${OPENAI_API_KEY}
    ports:
      - "3001:3001"

  eval-api:
    build: ./apps/eval-api
    depends_on:
      - postgres
      - rag-api
    environment:
      DATABASE_URL: postgres://raglens:raglens@postgres:5432/raglens
      RAG_API_BASE_URL: http://rag-api:3001
      OPENAI_API_KEY: ${OPENAI_API_KEY}
    ports:
      - "3002:3002"

  dashboard:
    build: ./apps/dashboard
    depends_on:
      - rag-api
      - eval-api
    environment:
      NEXT_PUBLIC_RAG_API_URL: http://localhost:3001
      NEXT_PUBLIC_EVAL_API_URL: http://localhost:3002
    ports:
      - "3000:3000"
```

## Later cloud deployment options

```text
Option 1:
  Azure Container Apps + Azure Database for PostgreSQL

Option 2:
  AWS ECS + RDS PostgreSQL

Option 3:
  Render/Fly.io + managed Postgres

Option 4:
  Railway/Supabase for simpler portfolio deployment
```

For AI Engineer role alignment, Azure is attractive later, but not needed for the first version.

---

# 17. CI/CD architecture

## Standard CI

```text
- install dependencies
- lint
- typecheck
- unit tests
- integration tests
- build Docker images
```

## RAG quality gate

```text
1. Start Postgres, rag-api, eval-api.
2. Run migrations.
3. Seed sample documents.
4. Seed eval dataset.
5. Run eval.
6. Check thresholds.
7. Fail CI if quality drops.
8. Upload eval report as artefact.
```

## Example thresholds

```json
{
  "minHitAt5": 0.8,
  "minCitationValidity": 0.95,
  "minGroundedness": 0.85,
  "maxAverageLatencyMs": 5000
}
```

---

# 18. Migration architecture

Because two services share one database, pick a single migration owner.

## Recommendation

Use SQL migrations under `infra/migrations`.

```text
infra/migrations/
  001_create_schemas.sql
  002_create_rag_tables.sql
  003_create_eval_tables.sql
  004_enable_pgvector.sql
```

Why:

```text
- language-neutral
- both TypeScript and Python can use the same DB
- avoids Drizzle/Alembic ownership conflict
```

Later, if each service gets its own DB, move to service-owned migrations.

---

# 19. Contract architecture

Use OpenAPI for service contracts.

```text
packages/contracts/
  openapi/
    rag-api.yaml
    eval-api.yaml
```

Generate clients where useful:

```text
dashboard -> generated TS client
eval-api -> simple Python client or generated client
```

For MVP, manual clients are fine, but document request/response shapes clearly.

---

# 20. Failure handling architecture

## RAG query failures

Possible failures:

```text
- validation error
- no indexed documents
- embedding provider error
- retrieval error
- LLM provider error
- citation parsing error
```

Response should be structured:

```json
{
  "error": {
    "code": "provider_error",
    "message": "Answer generation failed.",
    "requestId": "req_123"
  }
}
```

## Eval run failures

Eval runs should persist partial results.

Case-level failure:

```json
{
  "verdict": "error",
  "failureType": "provider_error",
  "errorMessage": "OpenAI rate limit exceeded"
}
```

Run-level status:

```text
completed
partially_failed
failed
```

---

# 21. Performance architecture

## MVP

```text
- sequential eval runs
- synchronous document ingestion for small docs
- vector retrieval using pgvector
- no streaming
```

## Post-MVP

```text
- async ingestion jobs
- controlled eval concurrency
- provider rate limiting
- cached embeddings
- chunk indexing status
- database indexes
```

## Database indexes

Recommended:

```sql
CREATE INDEX documents_status_idx ON rag.documents(status);
CREATE INDEX document_chunks_document_id_idx ON rag.document_chunks(document_id);
CREATE INDEX query_traces_created_at_idx ON rag.query_traces(created_at DESC);
CREATE INDEX eval_runs_created_at_idx ON eval.eval_runs(created_at DESC);
CREATE INDEX eval_case_results_run_id_idx ON eval.eval_case_results(eval_run_id);
```

For pgvector:

```sql
CREATE INDEX document_chunks_embedding_idx
ON rag.document_chunks
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

Note: create vector indexes after enough data exists. For tiny MVP data, sequential vector scan is acceptable.

---

# 22. Environment configuration

## `rag-api`

```text
PORT
DATABASE_URL
OPENAI_API_KEY
DEFAULT_CHAT_MODEL
DEFAULT_EMBEDDING_MODEL
DEFAULT_TOP_K
DEFAULT_CHUNK_SIZE
DEFAULT_CHUNK_OVERLAP
```

## `eval-api`

```text
PORT
DATABASE_URL
RAG_API_BASE_URL
OPENAI_API_KEY
DEFAULT_JUDGE_MODEL
EVAL_MAX_CASES
EVAL_CONCURRENCY
```

## `dashboard`

```text
NEXT_PUBLIC_RAG_API_URL
NEXT_PUBLIC_EVAL_API_URL
```

---

# 23. Sample data architecture

Use seed scripts.

```text
infra/seed/
  documents/
    remote-work-policy-v1.md
    remote-work-policy-v2.md
    expense-policy.md
    onboarding-policy.md
    mobile-release-process.md
    incident-response-runbook.md
    api-integration-guide.md
    refund-policy.md
    escalation-process.md
    known-issues.md

  datasets/
    company-kb-eval-v1.json
```

Seed flow:

```text
1. start services
2. seed documents through rag-api
3. seed dataset through eval-api
4. run eval
```

This proves API paths work.

---

# 24. Architecture roadmap

## Phase 0: Architecture foundation

Deliverables:

```text
- monorepo structure
- Docker Compose
- Postgres + pgvector
- SQL migrations
- service health checks
- env config
```

## Phase 1: RAG API core

Deliverables:

```text
- document ingestion
- chunking
- embeddings
- vector storage
- vector retrieval
- answer generation
- citations
- query traces
```

## Phase 2: Eval API core

Deliverables:

```text
- datasets
- test cases
- eval runs
- rag-api client
- raw result storage
```

## Phase 3: Metrics

Deliverables:

```text
- retrieval metrics
- citation metrics
- verdict calculation
```

## Phase 4: Judge scoring

Deliverables:

```text
- LLM judge
- structured JSON result
- unsupported claims
- missing points
```

## Phase 5: Dashboard

Deliverables:

```text
- trace detail
- eval run detail
- failed case detail
- comparison detail
```

## Phase 6: Hardening

Deliverables:

```text
- retries
- rate limits
- resumable eval runs
- provider error handling
- quality gate CI
```

---

# 25. Architecture risks

## Risk: Two services create too much overhead

Mitigation:

```text
- keep eval-api minimal at first
- use simple HTTP contracts
- use Docker Compose
- avoid complex service mesh/event bus
```

## Risk: Shared database blurs boundaries

Mitigation:

```text
- separate schemas
- eval-api fetches traces through rag-api for MVP
- document ownership clearly
```

## Risk: Eval runs become expensive

Mitigation:

```text
- sequential runs first
- max test case limit
- token/cost tracking
- judge optional per run
```

## Risk: LLM judge is unreliable

Mitigation:

```text
- deterministic metrics first
- version judge prompts
- store judge explanations
- treat judge score as signal, not absolute truth
```

## Risk: Dashboard scope creep

Mitigation:

```text
- build trace/detail pages first
- defer charts and advanced settings
```

---

# 26. Key architecture decisions to document

Create ADRs:

```text
docs/decisions/
  001-use-typescript-for-rag-api.md
  002-use-python-for-eval-api.md
  003-use-postgres-pgvector.md
  004-use-single-db-separate-schemas.md
  005-eval-api-treats-rag-api-as-black-box.md
  006-use-deterministic-metrics-before-llm-judge.md
  007-use-openapi-for-service-contracts.md
  008-use-docker-compose-for-local-dev.md
```

---

# 27. MVP architecture definition

The MVP architecture is complete when:

```text
- Docker Compose starts all services.
- Postgres has rag and eval schemas.
- rag-api can ingest markdown/text docs.
- rag-api can query indexed docs.
- rag-api returns cited answers.
- rag-api persists query traces.
- eval-api can create datasets/test cases.
- eval-api can run test cases against rag-api.
- eval-api stores eval case results.
- eval-api calculates deterministic metrics.
- dashboard can inspect traces and eval failures.
```

---

# 28. Final architecture summary

RAGLens should be built as a small but realistic distributed system:

```text
TypeScript rag-api
  Owns the production RAG path: documents, chunks, embeddings, retrieval, answers, citations, and traces.

Python eval-api
  Owns the quality path: datasets, test cases, eval runs, scoring, judge evaluation, regression comparison, and CI gates.

Next.js dashboard
  Owns the inspection path: documents, traces, eval runs, failed cases, and comparisons.

PostgreSQL + pgvector
  Owns persistence: source data, vectors, traces, evaluation data, and quality metrics.
```

The most important architecture rule:

```text
rag-api answers questions.
eval-api measures whether those answers are good.
dashboard explains what happened.
```
