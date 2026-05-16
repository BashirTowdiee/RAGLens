---
title: "Technical Design Decisions"
description: "Key technical design decisions and rationale for RAGLens."
order: 7
section: "Architecture"
status: "stable"
---
# Technical Design Decisions: RAGLens

## 1. Decision summary

RAGLens will use a hybrid, service-oriented architecture:

```text
rag-api:
  TypeScript + Fastify
  User-facing RAG service

eval-api:
  Python + FastAPI
  Isolated evaluation and scoring service

dashboard:
  Next.js + TypeScript
  Inspection and reporting UI

database:
  PostgreSQL + pgvector
  Shared persistence with separate schemas

local runtime:
  Docker Compose
```

The core architectural split is:

```text
rag-api answers questions.
eval-api measures whether those answers are good.
dashboard explains what happened.
```

---

# ADR 001: Use TypeScript for `rag-api`

## Status

Accepted

## Context

The RAG API is the product-facing backend. It owns document ingestion, chunking orchestration, embeddings, retrieval, answer generation, citations, provider abstraction, API contracts, and query traces.

This service needs strong structure around request/response contracts, validation, service boundaries, and dashboard integration.

## Decision

Use **TypeScript** for `rag-api`.

Recommended stack:

```text
Node.js
Fastify
TypeScript
Zod
Kysely or Drizzle
PostgreSQL + pgvector
```

## Options considered

### Option A: Python FastAPI

Pros:

```text
- strong AI ecosystem
- good for quick prototyping
- native access to RAG/eval libraries
```

Cons:

```text
- less aligned with the dashboard/product API layer
- weaker compile-time contract guarantees
- overlaps too much with eval-api responsibility
```

### Option B: TypeScript Fastify

Pros:

```text
- strong API and product engineering signal
- excellent type safety
- good fit for dashboard integration
- aligns with existing backend/frontend strengths
- clean Zod validation and typed service boundaries
```

Cons:

```text
- less mature for some AI/data tooling
- some advanced RAG libraries are more Python-native
```

## Rationale

The RAG API is not a model training service. It is a production application backend. TypeScript is appropriate because it will expose stable APIs, serve dashboard requests, manage providers, validate contracts, and store traces.

## Consequences

Positive:

```text
- strong typed API boundaries
- easier frontend integration
- easier provider/config modelling
- production backend credibility
```

Negative:

```text
- some AI-specific tooling may need custom implementation
- Python eval-api must handle more advanced evaluation tasks
```

## Implementation notes

Use a modular structure:

```text
apps/rag-api/src/
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
  db/
  config/
  routes/
```

---

# ADR 002: Use Python for `eval-api`

## Status

Accepted

## Context

Evaluation workloads are different from user-facing query workloads. They are long-running, expensive, batch-oriented, and often rely on Python-native AI/data tooling.

The eval service needs to run golden datasets, score retrieval quality, evaluate groundedness, compare runs, and integrate with CI.

## Decision

Use **Python** for `eval-api`.

Recommended stack:

```text
Python
FastAPI
Pydantic
httpx
SQLAlchemy or asyncpg
pandas or polars later
RAGAS / DeepEval later
```

## Options considered

### Option A: TypeScript worker inside `rag-api`

Pros:

```text
- simpler initial architecture
- fewer services
- shared types and runtime
```

Cons:

```text
- evaluation workload competes with user-facing API
- weaker Python AI/data ecosystem access
- less impressive as production AI architecture
- harder to model isolated CI quality gates
```

### Option B: Python FastAPI eval service

Pros:

```text
- computational and operational isolation
- strong AI evaluation ecosystem
- good portfolio signal for AI engineering
- can treat RAG API as a black box
- better alignment with real production evaluation workflows
```

Cons:

```text
- more local development complexity
- cross-service API contracts required
- separate dependency management
```

## Rationale

The Python eval service gives RAGLens a stronger AI engineering signal. It demonstrates that evaluation is an isolated quality system, not an afterthought inside the main API.

## Consequences

Positive:

```text
- clean serving/evaluation boundary
- access to RAGAS, DeepEval, pandas, sentence-transformers
- supports CI evaluation pattern
- protects rag-api from expensive eval workloads
```

Negative:

```text
- two backend services to maintain
- shared database coordination required
- HTTP contract must be carefully documented
```

## Implementation notes

Start minimal:

```text
apps/eval-api/app/
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
```

Do not add RAGAS immediately. Build deterministic metrics first.

---

# ADR 003: Eval API treats RAG API as a black box

## Status

Accepted

## Context

The eval service needs to assess the RAG system in a realistic way. If it imports RAG internals, the evaluation becomes coupled to implementation details and less reusable.

## Decision

`eval-api` will call `rag-api` over HTTP.

Primary flow:

```text
eval-api -> POST rag-api /query
eval-api <- answer + citations + traceId
eval-api -> GET rag-api /queries/:traceId
eval-api <- query trace
eval-api -> score result
```

## Options considered

### Option A: Eval imports RAG modules directly

Pros:

```text
- faster local execution
- easier access to internal data
- fewer HTTP calls
```

Cons:

```text
- tight coupling
- less realistic
- cannot evaluate external RAG systems
- blurs service boundaries
```

### Option B: Eval calls RAG API over HTTP

Pros:

```text
- realistic black-box evaluation
- reusable harness
- clearer architecture
- mirrors CI/staging quality gate design
```

Cons:

```text
- more network overhead
- requires stable API contracts
- needs trace fetch endpoint
```

## Rationale

The evaluation service should test the public behaviour of the RAG API. This is closer to how production systems are evaluated.

## Consequences

Positive:

```text
- stronger architecture story
- easier future support for external RAG APIs
- cleaner separation of concerns
```

Negative:

```text
- eval-api depends on rag-api availability
- API contract changes can break evals
```

## Implementation notes

Define the minimal RAG API contract early:

```text
POST /query
GET /queries/:traceId
```

Use OpenAPI documentation for both endpoints.

---

# ADR 004: Use PostgreSQL + pgvector

## Status

Accepted

## Context

The system needs to store relational data, JSON metadata, query traces, evaluation results, and vector embeddings.

Options include dedicated vector databases, embedded local stores, or Postgres with pgvector.

## Decision

Use **PostgreSQL + pgvector** for the MVP.

## Options considered

### Option A: Chroma

Pros:

```text
- easy local vector search
- common in RAG demos
- quick to prototype
```

Cons:

```text
- less suitable for full relational app data
- would still need Postgres for traces/evals
- weaker production architecture signal
```

### Option B: Weaviate / Qdrant / Pinecone

Pros:

```text
- dedicated vector search
- strong vector retrieval features
- production scalable
```

Cons:

```text
- extra infrastructure
- more moving parts
- not necessary for MVP
```

### Option C: PostgreSQL + pgvector

Pros:

```text
- one database for documents, chunks, traces, evals, and vectors
- production-realistic
- simpler Docker Compose setup
- supports metadata queries and relational joins
```

Cons:

```text
- not as specialised as a dedicated vector DB
- vector index tuning required later
```

## Rationale

Postgres + pgvector gives the best balance of simplicity, production relevance, and portfolio value.

## Consequences

Positive:

```text
- simpler local setup
- easier trace/eval joins
- fewer services
- realistic backend architecture
```

Negative:

```text
- advanced vector search features require custom work
- may need migration later if scaling heavily
```

## Implementation notes

Use separate schemas:

```text
rag.*
eval.*
```

Enable pgvector:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

---

# ADR 005: Use one shared database with separate schemas

## Status

Accepted for MVP

## Context

The system has two backend services. Each has separate domain ownership, but both need access to related data.

A fully production system might use separate databases per service. For MVP, that adds unnecessary complexity.

## Decision

Use one PostgreSQL database with separate schemas:

```text
rag.*
eval.*
```

## Options considered

### Option A: Separate databases

Pros:

```text
- stronger service isolation
- clearer ownership
- easier independent scaling later
```

Cons:

```text
- harder local development
- more migrations/seeding complexity
- cross-service reporting is harder
```

### Option B: One database, one schema

Pros:

```text
- simplest setup
```

Cons:

```text
- blurred ownership
- less clear domain separation
```

### Option C: One database, separate schemas

Pros:

```text
- simple local setup
- clear logical separation
- easy dashboard joins
- realistic enough for MVP
```

Cons:

```text
- not true database isolation
- services must avoid uncontrolled cross-schema coupling
```

## Rationale

Separate schemas are the right compromise for a portfolio MVP.

## Consequences

Positive:

```text
- simple Docker Compose setup
- clear table ownership
- easier dashboard data access
```

Negative:

```text
- requires discipline to maintain boundaries
```

## Implementation notes

Ownership rule:

```text
rag-api owns rag.*
eval-api owns eval.*
```

For MVP, eval-api should fetch traces through rag-api. Direct DB reads from `rag.*` can be considered later for performance, but should not be the starting point.

---

# ADR 006: Use SQL migrations owned by infrastructure

## Status

Accepted

## Context

The project uses both TypeScript and Python services. If each service uses a different migration framework, schema ownership becomes messy.

## Decision

Use raw SQL migrations in `infra/migrations`.

## Options considered

### Option A: Drizzle migrations from TypeScript

Pros:

```text
- good TypeScript integration
- typed schema definitions
```

Cons:

```text
- Python service becomes second-class
- eval schema ownership is awkward
```

### Option B: Alembic migrations from Python

Pros:

```text
- mature Python migration tooling
```

Cons:

```text
- TypeScript service becomes second-class
- rag schema ownership is awkward
```

### Option C: Raw SQL migrations

Pros:

```text
- language-neutral
- explicit
- easy to inspect
- works for both services
```

Cons:

```text
- less ergonomic than ORM migrations
- more manual schema management
```

## Rationale

Raw SQL is the clearest option for a cross-language architecture.

## Consequences

Positive:

```text
- schema is centralised
- easy for both services to share
- avoids dual migration systems
```

Negative:

```text
- less automatic type generation
```

## Implementation notes

Structure:

```text
infra/migrations/
  001_enable_extensions.sql
  002_create_rag_schema.sql
  003_create_eval_schema.sql
  004_create_indexes.sql
```

---

# ADR 007: Use OpenAPI for service contracts

## Status

Accepted

## Context

There are three consumers of backend contracts:

```text
dashboard -> rag-api
dashboard -> eval-api
eval-api -> rag-api
```

Cross-language services need a stable contract.

## Decision

Use OpenAPI specifications for `rag-api` and `eval-api`.

## Options considered

### Option A: Informal docs only

Pros:

```text
- fastest at the start
```

Cons:

```text
- contracts drift
- harder cross-language integration
```

### Option B: Shared TypeScript types

Pros:

```text
- good for dashboard/rag-api
```

Cons:

```text
- does not help Python cleanly
- creates language coupling
```

### Option C: OpenAPI

Pros:

```text
- language-neutral
- supports generated clients
- good documentation
- helps CI contract checks later
```

Cons:

```text
- extra maintenance
- generated clients can be noisy
```

## Rationale

OpenAPI is the right contract format for cross-language HTTP services.

## Consequences

Positive:

```text
- dashboard contracts are clear
- eval-api can rely on stable rag-api contract
- useful for documentation and portfolio review
```

Negative:

```text
- must keep specs in sync
```

## Implementation notes

Initial structure:

```text
packages/contracts/openapi/
  rag-api.yaml
  eval-api.yaml
```

Manual clients are acceptable for MVP. Generated clients can come later.

---

# ADR 008: Use Docker Compose for local development

## Status

Accepted

## Context

The project has multiple services and infrastructure dependencies.

Developers need one command to run:

```text
postgres
rag-api
eval-api
dashboard
```

## Decision

Use Docker Compose for local development.

## Options considered

### Option A: Run services manually

Pros:

```text
- simple per-service debugging
```

Cons:

```text
- setup is error-prone
- hard to onboard
- inconsistent local environments
```

### Option B: Docker Compose

Pros:

```text
- one-command startup
- production-like service isolation
- easy Postgres setup
- good portfolio signal
```

Cons:

```text
- Docker overhead
- local debugging needs some configuration
```

## Rationale

Docker Compose best represents the intended system architecture while keeping local development manageable.

## Consequences

Positive:

```text
- easier demo
- easier CI setup
- clear service dependencies
```

Negative:

```text
- more initial setup work
```

## Implementation notes

Required services:

```text
postgres
rag-api
eval-api
dashboard
```

Optional later:

```text
redis
minio
otel-collector
```

---

# ADR 009: Start with synchronous document ingestion

## Status

Accepted for MVP

## Context

Document ingestion can become asynchronous and long-running, especially with PDFs, OCR, large files, and batch ingestion.

The MVP only supports markdown/text documents.

## Decision

Start with synchronous ingestion for small markdown/text documents.

## Options considered

### Option A: Async ingestion job from day one

Pros:

```text
- more production-realistic
- better for large documents
```

Cons:

```text
- requires queue/job infrastructure
- slows MVP
- adds operational complexity before needed
```

### Option B: Synchronous ingestion

Pros:

```text
- simple
- easier to test
- enough for controlled sample corpus
```

Cons:

```text
- not suitable for large documents
- request may timeout for bigger input
```

## Rationale

The MVP should prove the RAG/eval loop, not build a full ingestion platform.

## Consequences

Positive:

```text
- faster implementation
- easier debugging
- fewer services
```

Negative:

```text
- must be revisited before large corpus support
```

## Implementation notes

MVP limits:

```text
max document size
supported types: markdown, text
```

Post-MVP path:

```text
add job queue
document status: pending/indexing/indexed/failed
retry failed indexing jobs
```

---

# ADR 010: Start eval runs sequentially

## Status

Accepted for MVP

## Context

Evaluation runs can involve many LLM calls. Parallel execution improves speed but introduces rate limiting, cost spikes, retries, and concurrency complexity.

## Decision

Execute eval test cases sequentially for MVP.

## Options considered

### Option A: Full parallel evaluation

Pros:

```text
- faster runs
- better for large datasets
```

Cons:

```text
- rate-limit risk
- harder error handling
- harder cost control
```

### Option B: Controlled concurrency from day one

Pros:

```text
- realistic
- scalable
```

Cons:

```text
- more complexity than needed initially
```

### Option C: Sequential first

Pros:

```text
- simple
- reliable
- easy to debug
- predictable provider usage
```

Cons:

```text
- slow for larger datasets
```

## Rationale

Start with correctness and traceability. Speed can come later.

## Consequences

Positive:

```text
- simpler failure handling
- lower rate-limit risk
- easier testability
```

Negative:

```text
- slow evaluation runs
```

## Implementation notes

Design the runner so concurrency can be added later:

```python
async def run_eval_case(...)
async def run_eval_cases_sequentially(...)
```

Later:

```text
max_concurrency
rate limiter
retry with backoff
resume failed cases
```

---

# ADR 011: Use deterministic metrics before LLM-as-judge

## Status

Accepted

## Context

LLM-as-judge can evaluate nuanced answer quality but can be noisy, expensive, and hard to reproduce.

Deterministic metrics are cheaper and reliable.

## Decision

Implement deterministic scoring first.

MVP deterministic metrics:

```text
hit@5
recall@10
expectedSourceRank
citationPresent
citationValidity
citationTraceability
```

Then add LLM-as-judge for:

```text
groundedness
correctness
completeness
citationSupport
unsupportedClaims
missingImportantPoints
```

## Options considered

### Option A: LLM judge only

Pros:

```text
- faster to implement broad scoring
- handles nuance
```

Cons:

```text
- noisy
- costly
- less trustworthy
```

### Option B: Deterministic only

Pros:

```text
- stable
- cheap
- repeatable
```

Cons:

```text
- cannot judge language quality deeply
```

### Option C: Deterministic first, judge second

Pros:

```text
- strong foundation
- nuanced scoring where needed
- better explainability
```

Cons:

```text
- more implementation work
```

## Rationale

This is the most production-realistic approach.

## Consequences

Positive:

```text
- reliable baseline metrics
- lower eval cost
- better debugging
```

Negative:

```text
- takes longer than judge-only scoring
```

## Implementation notes

Scoring module:

```text
eval-api/app/modules/scoring/
  retrieval_metrics.py
  citation_metrics.py
  verdict.py
```

---

# ADR 012: Store query traces as first-class records

## Status

Accepted

## Context

RAG failures are hard to diagnose without detailed traces.

The trace is also the input to evaluation.

## Decision

Persist every query trace.

Trace must include:

```text
question
answer
retrieved chunks
chunk scores
citations
provider
model
prompt version
RAG config
latency
token usage
estimated cost
status/error
```

## Options considered

### Option A: Only return answer and citations

Pros:

```text
- simple
- less storage
```

Cons:

```text
- poor debuggability
- eval-api has little evidence to score
```

### Option B: Store full query traces

Pros:

```text
- strong observability
- enables evaluation
- supports failure inspection
- production-grade signal
```

Cons:

```text
- more storage
- sensitive prompt/context considerations later
```

## Rationale

The trace is central to the product. Without traces, RAGLens loses its core value.

## Consequences

Positive:

```text
- detailed debugging
- eval reproducibility
- dashboard value
```

Negative:

```text
- database grows over time
- retention policies needed later
```

## Implementation notes

Tables:

```text
rag.query_traces
rag.query_trace_chunks
rag.query_trace_citations
rag.provider_calls
```

---

# ADR 013: Store prompt versions in code/config first

## Status

Accepted for MVP

## Context

Prompts are part of system behaviour and must be versioned. The question is whether to manage them in code, database, or UI.

## Decision

Store prompt templates in code/config for MVP, and persist the version used in traces.

## Options considered

### Option A: Database-managed prompts from day one

Pros:

```text
- editable through UI
- easier experimentation
```

Cons:

```text
- more product surface area
- harder review/version control
- adds complexity
```

### Option B: Code/config prompts

Pros:

```text
- version-controlled
- reviewable in PRs
- simple
- aligns with CI quality gates
```

Cons:

```text
- less flexible experimentation
```

## Rationale

Prompt changes should be treated like code changes initially.

## Consequences

Positive:

```text
- prompts are reviewable
- quality gates can run on prompt PRs
- simpler MVP
```

Negative:

```text
- no prompt editor in dashboard yet
```

## Implementation notes

Example:

```text
apps/rag-api/src/modules/prompts/templates/answer-v1.ts
apps/eval-api/app/modules/judges/prompts/judge-v1.py
```

Store in traces:

```text
prompt_version: "answer-v1"
judge_prompt_version: "judge-v1"
```

---

# ADR 014: Use RAG configs as explicit records

## Status

Accepted

## Context

Evaluation needs to compare different system behaviours. These behaviours are controlled by RAG configuration.

## Decision

Represent RAG configurations as explicit records.

A RAG config includes:

```text
provider
model
embedding provider
embedding model
retrieval mode
topK
chunk size
chunk overlap
prompt version
reranker setting
metadata
```

## Options considered

### Option A: Hardcoded config

Pros:

```text
- simple
```

Cons:

```text
- cannot compare versions cleanly
- traces are less reproducible
```

### Option B: Explicit config records

Pros:

```text
- reproducible eval runs
- comparable configurations
- clearer dashboard
```

Cons:

```text
- more database/model work
```

## Rationale

RAGLens’s key value is comparison. Configs must be first-class.

## Consequences

Positive:

```text
- can compare vector vs hybrid later
- can compare prompt versions
- can show config on traces and eval runs
```

Negative:

```text
- config management UI may be needed later
```

## Implementation notes

Seed configs first:

```text
vector-default
vector-topk-12
answer-v2
quality-model
cheap-model
```

Editable config UI can come later.

---

# ADR 015: Use vector-only retrieval for MVP, design for hybrid later

## Status

Accepted

## Context

Hybrid retrieval is important for production RAG, but vector retrieval is enough to prove the first RAG/eval loop.

## Decision

Implement vector retrieval first. Design `retrieval_mode` so hybrid and reranking can be added later.

## Options considered

### Option A: Hybrid retrieval from day one

Pros:

```text
- stronger retrieval quality
- more production-realistic
```

Cons:

```text
- more complexity
- slows core loop
- harder to debug first evals
```

### Option B: Vector-only MVP

Pros:

```text
- simpler
- enough for sample corpus
- establishes trace/eval loop first
```

Cons:

```text
- less impressive retrieval quality initially
```

## Rationale

The first value milestone is not optimal retrieval. It is traceable RAG plus measurable evaluation.

## Consequences

Positive:

```text
- faster MVP
- cleaner first implementation
```

Negative:

```text
- later work needed for production-grade retrieval comparisons
```

## Implementation notes

Interface:

```ts
export interface Retriever {
  retrieve(input: RetrieveInput): Promise<RetrieveResult>;
}
```

Implement:

```text
VectorRetriever
```

Later:

```text
KeywordRetriever
HybridRetriever
RerankingRetriever
```

---

# ADR 016: Use structured citation output

## Status

Accepted

## Context

Citations are central to trust. If citations are only embedded as free text, they are hard to validate.

## Decision

The RAG API must return citations as structured objects.

Example:

```json
{
  "documentId": "doc_remote_work_v2",
  "chunkId": "chunk_123",
  "title": "Remote Work Policy v2",
  "section": "Approval process"
}
```

## Options considered

### Option A: Inline markdown citations only

Pros:

```text
- natural answer format
- easy to display
```

Cons:

```text
- hard to validate
- hard to score
- citations can be fake
```

### Option B: Structured citations

Pros:

```text
- easy validation
- dashboard-friendly
- eval-friendly
- supports source preview
```

Cons:

```text
- requires output parsing or controlled generation
```

## Rationale

Evaluation and dashboard inspection depend on structured citations.

## Consequences

Positive:

```text
- citation validity can be deterministic
- citations can link to chunks
- dashboard can preview sources
```

Negative:

```text
- prompt/output design must enforce structure
```

## Implementation notes

Prefer structured JSON output from the model where possible. If not, parse citation markers and map them back to selected chunks.

---

# ADR 017: Do not use LangChain as the core architecture

## Status

Proposed / Recommended

## Context

LangChain can speed up prototyping but can hide important architecture details.

RAGLens is meant to demonstrate production engineering judgement.

## Decision

Do not make LangChain the central architecture for MVP.

Use custom services and interfaces for:

```text
chunking
retrieval
prompt building
provider adapters
citation handling
tracing
evaluation
```

## Options considered

### Option A: LangChain-first

Pros:

```text
- faster prototyping
- many integrations
```

Cons:

```text
- hides internals
- harder to show architectural ownership
- abstractions can become leaky
```

### Option B: Custom core pipeline

Pros:

```text
- demonstrates understanding
- easier to trace each step
- easier to customise metrics
- clearer portfolio value
```

Cons:

```text
- more code to write
```

## Rationale

The project’s value is in showing how a production RAG system works internally.

## Consequences

Positive:

```text
- better learning
- better architecture story
- clearer trace model
```

Negative:

```text
- slower than using a framework
```

## Implementation notes

Using small libraries is fine. Avoid hiding the main RAG flow behind a large orchestration framework.

---

# ADR 018: Use OpenAI as the first provider

## Status

Accepted for MVP

## Context

The MVP needs reliable embeddings, generation, and judge calls. Multi-provider support is useful but should not block the core system.

## Decision

Use OpenAI first.

Support:

```text
chat model
embedding model
judge model
```

## Options considered

### Option A: Multi-provider from day one

Pros:

```text
- impressive
- useful for comparisons
```

Cons:

```text
- more surface area
- slows core loop
- more provider-specific edge cases
```

### Option B: OpenAI first, provider abstraction from day one

Pros:

```text
- fast MVP
- clean future extension
- less complexity
```

Cons:

```text
- fewer provider comparisons initially
```

## Rationale

Implement the abstraction now, but only one provider initially.

## Consequences

Positive:

```text
- faster build
- enough for RAG/eval loop
- future provider switching is prepared
```

Negative:

```text
- portfolio initially shows one provider only
```

## Implementation notes

Provider interface first, OpenAI implementation first.

Later:

```text
Anthropic
OpenRouter
Ollama
```

---

# ADR 019: Use sample company knowledge base as the initial corpus

## Status

Accepted

## Context

The project needs a controlled dataset with known answers and expected sources.

Large public corpora introduce noise, ingestion complexity, and evaluation difficulty.

## Decision

Use a synthetic internal company knowledge base for MVP.

Documents:

```text
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
```

## Options considered

### Option A: Large public corpus

Pros:

```text
- more impressive scale
```

Cons:

```text
- noisy
- harder expected answers
- ingestion can dominate project
```

### Option B: Controlled synthetic corpus

Pros:

```text
- easier golden dataset creation
- easier failure design
- better for eval methodology
```

Cons:

```text
- less impressive scale at first
```

## Rationale

RAGLens’s core value is evaluation and observability, not data collection.

## Consequences

Positive:

```text
- clean MVP
- strong test cases
- controlled failure scenarios
```

Negative:

```text
- later real-world corpus needed for extra credibility
```

## Implementation notes

Include test case types:

```text
factual
comparison
temporal
multi-hop
no-answer
citation-sensitive
```

---

# ADR 020: Use dashboard as an inspection tool, not a chat product

## Status

Accepted

## Context

The dashboard could drift into a chatbot UI, but the project’s differentiator is quality inspection.

## Decision

Design the dashboard around:

```text
traces
eval runs
failed cases
comparisons
source chunks
```

Do not centre the UI around chat.

## Options considered

### Option A: Chat-first UI

Pros:

```text
- familiar
- easy to demo quickly
```

Cons:

```text
- looks like every other RAG demo
- hides the evaluation platform story
```

### Option B: Inspection-first dashboard

Pros:

```text
- stronger production signal
- highlights traces/evals
- supports debugging workflow
```

Cons:

```text
- less flashy
- more complex pages
```

## Rationale

RAGLens should look like a RAG quality control centre.

## Consequences

Positive:

```text
- stronger differentiation
- clearer engineering value
```

Negative:

```text
- requires more data-heavy UI design
```

## Implementation notes

Highest-priority pages:

```text
Query Trace Detail
Eval Run Detail
Failed Case Detail
Run Comparison Detail
```

---

# ADR 021: Use CI quality gate as post-MVP but design for it early

## Status

Accepted

## Context

CI gating is a strong production signal. However, it depends on stable eval runs and reliable metrics.

## Decision

Do not implement CI gating first, but design eval-api so CI can trigger it later.

## Options considered

### Option A: CI gate from day one

Pros:

```text
- impressive
- production-aligned
```

Cons:

```text
- premature before stable scoring
```

### Option B: Post-MVP CI gate

Pros:

```text
- lets scoring mature first
- easier implementation later
```

Cons:

```text
- delayed portfolio feature
```

## Rationale

Build the eval system first. Then wire it into CI.

## Consequences

Positive:

```text
- avoids brittle early CI
- keeps MVP focused
```

Negative:

```text
- quality gate story comes later
```

## Implementation notes

Keep this endpoint in mind:

```text
POST /ci/evaluate
```

Response:

```json
{
  "status": "pass",
  "summary": {},
  "thresholdFailures": []
}
```

---

# ADR 022: Use sequential implementation phases

## Status

Accepted

## Context

The project can easily become too large.

## Decision

Build in strict phases.

## Phases

```text
1. Monorepo and Docker foundation
2. rag-api health, config, and database
3. document ingestion
4. vector retrieval
5. answer generation and citations
6. query traces
7. eval-api datasets and test cases
8. eval runner
9. deterministic metrics
10. LLM judge
11. dashboard trace/eval/failure views
12. run comparison
13. CI quality gate
14. hybrid retrieval and reranking
```

## Rationale

This sequence proves value early and avoids architecture outrunning implementation.

## Consequences

Positive:

```text
- clear milestones
- easier progress tracking
- each phase is demoable
```

Negative:

```text
- some production-grade features are delayed
```

---

# 23. Decision dependency map

Some decisions depend on others.

```text
Postgres + pgvector
  -> one shared database
  -> SQL migrations
  -> trace storage
  -> eval result storage

Black-box eval
  -> OpenAPI contracts
  -> trace fetch endpoint
  -> eval runner over HTTP

Deterministic metrics first
  -> expected sources in test cases
  -> trace chunks stored
  -> structured citations

Dashboard inspection-first
  -> trace detail page
  -> eval run detail page
  -> failed case detail page

CI quality gate
  -> stable eval runs
  -> thresholds
  -> reproducible configs
```

---

# 24. Final recommended technical direction

Use this as the fixed technical direction:

```text
RAGLens will be built as a monorepo with a TypeScript Fastify rag-api, a Python FastAPI eval-api, and a Next.js dashboard. The RAG API owns document ingestion, chunking, embeddings, vector retrieval, answer generation, structured citations, and query traces. The Eval API treats the RAG API as a black box and owns datasets, test cases, eval runs, scoring, LLM-as-judge evaluation, regression comparison, and CI quality reporting. PostgreSQL with pgvector will store documents, chunks, embeddings, traces, datasets, eval results, and metrics using separate rag and eval schemas. The MVP will use synchronous markdown/text ingestion, vector-only retrieval, OpenAI as the first provider, deterministic metrics before LLM-as-judge, and an inspection-first dashboard focused on traces, failed cases, and run comparisons.
```

That is the technical baseline I would build from.
