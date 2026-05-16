---
title: "Project Concept"
description: "Concept and strategic framing for the RAGLens platform."
order: 1
section: "Overview"
status: "stable"
---
# Updated project concept

Build a **production-grade RAG platform** using a deliberate hybrid architecture:

```text
TypeScript for the user-facing RAG/product system.
Python for the isolated evaluation and AI quality system.
```

The project is no longer just:

```text
A RAG app with some evaluation scripts.
```

It becomes:

```text
A source-grounded RAG service with a separate Python evaluation and observability service that tests retrieval quality, answer groundedness, citation support, latency, cost, and regressions.
```

---

# Project name

Working name:

```text
RAGLens
```

Tagline:

```text
Evaluation and observability for production RAG systems.
```

---

# Core concept

RAGLens has two main backend services:

```text
rag-api:
  TypeScript + Fastify
  Responsible for the production RAG system.

eval-api:
  Python + FastAPI
  Responsible for evaluation, scoring, regression testing, and AI quality analysis.
```

They share infrastructure, but they have clear responsibility boundaries.

```text
rag-api answers questions.
eval-api decides whether those answers are good.
```

---

# Why this architecture

This architecture intentionally uses the right ecosystem for each job.

## TypeScript is used for `rag-api`

Because the RAG service is a product/platform backend.

It needs:

```text
- type-safe APIs
- strict request/response contracts
- provider abstraction
- document ingestion endpoints
- query endpoints
- trace persistence
- dashboard-facing APIs
- good frontend integration
- maintainable service boundaries
```

TypeScript shows production application engineering.

## Python is used for `eval-api`

Because evaluation is closer to data science, benchmarking, and AI quality tooling.

It needs:

```text
- RAGAS / DeepEval integration
- sentence-transformers support
- cross-encoder reranking experiments
- statistical metrics
- dataframe/report generation
- LLM-as-judge scoring
- offline benchmark workflows
```

Python shows AI ecosystem fluency.

---

# Updated architecture

```text
rag-scope/
  apps/
    rag-api/          # TypeScript, Fastify
    eval-api/         # Python, FastAPI
    dashboard/        # TypeScript, Next.js
    worker/           # Optional TypeScript worker for ingestion jobs

  packages/
    shared-contracts/ # OpenAPI schemas, generated types, shared docs
    rag-core/         # TypeScript RAG domain logic
    providers/        # LLM/embedding provider adapters
    observability/    # trace/log helpers

  infra/
    docker/
    migrations/
    seed-data/

  docs/
    architecture/
    eval-methodology/
    decisions/
```

---

# Service responsibilities

## `rag-api` TypeScript service

The RAG API is the production-facing service.

Responsibilities:

```text
- ingest documents
- normalise document metadata
- chunk documents
- generate embeddings
- store vectors in pgvector
- retrieve relevant chunks
- support vector and hybrid retrieval
- generate answers with citations
- enforce citation-aware responses
- persist full query traces
- expose trace inspection APIs
- support provider abstraction
```

Core endpoints:

```text
POST /documents/ingest
GET  /documents
GET  /documents/:id
POST /query
GET  /queries/:traceId
GET  /health
```

Example `POST /query` response:

```json
{
  "answer": "Remote work longer than two consecutive weeks requires manager approval.",
  "citations": [
    {
      "documentId": "remote-work-policy-2025",
      "chunkId": "chunk_123",
      "title": "Remote Work Policy 2025",
      "section": "Approval process"
    }
  ],
  "traceId": "trace_abc",
  "usage": {
    "inputTokens": 3200,
    "outputTokens": 180,
    "estimatedCost": 0.008
  },
  "latencyMs": 1840
}
```

---

## `eval-api` Python service

The Eval API is an isolated quality and regression service.

Responsibilities:

```text
- manage evaluation datasets
- manage golden test cases
- trigger evaluation runs
- call rag-api as a black-box system
- fetch query traces
- calculate retrieval metrics
- calculate citation metrics
- run LLM-as-judge evaluation
- run RAGAS/DeepEval experiments
- compare evaluation runs
- produce pass/fail regression decisions
- expose results to dashboard and CI
```

Core endpoints:

```text
POST /datasets
GET  /datasets
POST /datasets/:id/test-cases
POST /eval-runs
GET  /eval-runs
GET  /eval-runs/:id
GET  /eval-runs/:id/results
POST /eval-runs/:id/compare
GET  /health
```

Example eval run:

```json
{
  "datasetId": "policy-eval-v1",
  "ragConfigId": "hybrid-openai-v1",
  "thresholds": {
    "minGroundedness": 0.85,
    "minCitationSupport": 0.8,
    "minRetrievalRecallAt10": 0.75
  }
}
```

---

# Updated system diagram

```text
                      ┌──────────────────────┐
                      │      Dashboard       │
                      │   Next.js / TS       │
                      └──────────┬───────────┘
                                 │
              ┌──────────────────┴──────────────────┐
              │                                     │
      ┌───────▼────────┐                    ┌───────▼────────┐
      │    rag-api     │                    │    eval-api    │
      │ TypeScript     │◄──── HTTP ──────── │ Python         │
      │ Fastify        │                    │ FastAPI        │
      └───────┬────────┘                    └───────┬────────┘
              │                                     │
              │                                     │
              └──────────────────┬──────────────────┘
                                 │
                       ┌─────────▼─────────┐
                       │ PostgreSQL        │
                       │ pgvector          │
                       │                   │
                       │ rag schema        │
                       │ eval schema       │
                       └─────────┬─────────┘
                                 │
                       ┌─────────▼─────────┐
                       │ Object storage    │
                       │ raw documents     │
                       │ generated reports │
                       └───────────────────┘
```

---

# Key architectural rule

The eval service should treat the RAG service as a black box.

Good:

```text
eval-api calls rag-api /query
eval-api receives answer + citations + traceId
eval-api fetches trace from rag-api
eval-api scores the result
eval-api stores scores
```

Avoid:

```text
eval-api importing rag-api internals
eval-api duplicating retrieval logic
eval-api reaching directly into RAG implementation code
```

This makes the evaluation service reusable. In theory, it could evaluate any RAG API, not just yours.

---

# What the project solves

This project solves the main production problems with RAG systems:

```text
1. Can the RAG service retrieve the right evidence?
2. Does the generated answer stay grounded in retrieved context?
3. Are citations valid and supportive?
4. Do prompt, model, chunking, or retrieval changes cause regressions?
5. How much does each answer cost?
6. Where does latency come from?
7. Which test cases fail repeatedly?
8. Which document sources are missing or stale?
9. Can the system be tested automatically before deployment?
10. Can engineers inspect exactly why an answer failed?
```

---

# Who this serves

## AI Engineers

They use it to improve RAG quality.

```text
- compare models
- compare prompts
- compare retrieval strategies
- inspect failed cases
- run regression tests
```

## Platform Engineers

They use it to operate the system.

```text
- trace requests
- monitor latency
- manage failures
- track provider errors
- isolate expensive evaluation workloads
```

## Product Teams

They use it to understand answer quality.

```text
- see common failed questions
- identify missing documents
- review user-facing quality trends
```

## Risk / Compliance Teams

They use it to verify source-grounded answers.

```text
- inspect citations
- check unsupported claims
- review audit trails
- confirm answers came from approved documents
```

---

# Updated MVP scope

## MVP `rag-api`

Must include:

```text
- markdown/text document ingestion
- metadata storage
- chunking
- embeddings
- pgvector storage
- vector search
- answer generation
- citations
- trace persistence
- provider abstraction for at least OpenAI
```

Should not include yet:

```text
- massive PDF ingestion
- complex RBAC
- multi-tenancy
- Kubernetes
```

---

## MVP `eval-api`

Must include:

```text
- dataset creation
- test case creation
- eval run creation
- calls to rag-api /query
- trace fetching
- deterministic retrieval metrics
- citation validity checks
- simple LLM-as-judge scoring
- run result storage
```

Should not include yet:

```text
- complex RAGAS pipelines
- advanced statistical reporting
- large batch parallelism
- distributed queues
- auto-scaling
```

---

## MVP dashboard

Must include:

```text
- document list
- query trace detail
- eval run list
- eval run summary
- failed case explorer
- citation/source preview
```

---

# Updated build phases

## Phase 0: Monorepo foundation

```text
- create monorepo
- add TypeScript rag-api
- add Python eval-api
- add Next.js dashboard
- add Docker Compose
- add Postgres + pgvector
- add migration setup
- add shared environment config
```

Exit criteria:

```text
All services boot locally and health checks pass.
```

---

## Phase 1: RAG API core

```text
- ingest documents
- chunk text
- embed chunks
- store chunks
- query chunks
- generate cited answer
- persist query trace
```

Exit criteria:

```text
A user can ask a question and inspect the source-backed trace.
```

---

## Phase 2: Eval API skeleton

```text
- create datasets
- create test cases
- create eval runs
- call rag-api for each test case
- store raw answers and trace IDs
```

Exit criteria:

```text
eval-api can run 5 to 10 test cases against rag-api.
```

---

## Phase 3: Deterministic scoring

```text
- hit@k
- recall@k
- expected source rank
- citation exists
- cited chunk exists
- cited chunk appeared in retrieved context
```

Exit criteria:

```text
Every eval case has repeatable non-LLM metrics.
```

---

## Phase 4: LLM-as-judge scoring

```text
- groundedness
- correctness
- completeness
- citation support
- unsupported claims
- missing important points
- verdict calculation
```

Exit criteria:

```text
Every failed answer includes an explanation.
```

---

## Phase 5: Dashboard

```text
- eval run list
- eval run detail
- query trace viewer
- failed case explorer
- source/citation inspector
```

Exit criteria:

```text
The system is demoable to a hiring manager.
```

---

## Phase 6: Regression and CI

```text
- compare eval run A vs eval run B
- show improved cases
- show regressed cases
- calculate quality delta
- add GitHub Actions quality gate
```

Exit criteria:

```text
A prompt or retrieval change can fail CI if quality drops.
```

---

# Recommended tech stack

## `rag-api`

```text
Language: TypeScript
Runtime: Node.js
Framework: Fastify
Validation: Zod
Database: PostgreSQL + pgvector
ORM/query layer: Drizzle or Kysely
Embeddings: OpenAI initially
LLM: OpenAI initially
Logs/traces: structured logs + trace tables
```

## `eval-api`

```text
Language: Python
Framework: FastAPI
Validation: Pydantic
Evaluation: custom metrics first
Optional: RAGAS / DeepEval
Data tooling: pandas or polars
Model tooling: sentence-transformers later
HTTP client: httpx
```

## `dashboard`

```text
Language: TypeScript
Framework: Next.js
Data fetching: TanStack Query
UI: Tailwind
Charts: Recharts or Tremor
```

## Infrastructure

```text
Docker Compose
PostgreSQL + pgvector
Shared database with separate schemas
Environment-based secrets
GitHub Actions
```

---

# Database schema split

Use one database with clear schemas:

```text
rag.*
eval.*
```

## `rag` schema

```text
rag.documents
rag.document_chunks
rag.query_traces
rag.query_trace_chunks
rag.rag_configs
rag.prompt_versions
```

## `eval` schema

```text
eval.datasets
eval.test_cases
eval.eval_runs
eval.eval_case_results
eval.eval_run_comparisons
eval.evaluator_prompts
```

---

# Final updated project statement

```text
RAGLens is a production-style RAG platform built with a TypeScript Fastify RAG API and a separate Python FastAPI evaluation service. The RAG API handles document ingestion, chunking, embeddings, retrieval, answer generation, citations, and query tracing. The Python Eval API treats the RAG API as a black-box system and runs versioned golden datasets against it, scoring retrieval quality, groundedness, citation support, latency, cost, and regressions. A Next.js dashboard provides trace inspection, failed-case analysis, eval run comparison, and CI-ready quality gates.
```

This is the version I would build.
