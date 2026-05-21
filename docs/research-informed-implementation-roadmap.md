---
title: "Research-Informed Implementation Roadmap"
description: "Staged high, mid, and low level implementation plan for turning RAGLens into a production-style RAG evaluation and observability platform."
order: 14
section: "Delivery"
status: "draft"
---

# Research-Informed Implementation Roadmap

## Purpose

This document converts the RAGLens research review, Reddit practitioner notes, and current RAG engineering patterns into a staged implementation roadmap.

It is intended to answer three questions:

1. What should be built first?
2. What should be deferred until the core product loop works?
3. What concrete implementation slices should exist inside each stage?

RAGLens should stay positioned as:

```text
rag-api answers questions.
eval-api decides whether those answers are good.
dashboard explains what happened.
```

The roadmap below keeps that boundary intact.

---

## Research inputs

The plan is informed by three source groups.

| Source group | Useful signals | How it changes the plan |
|---|---|---|
| Existing RAGLens docs | RAGLens is framed around a TypeScript RAG API, Python evaluation API, dashboard, query traces, failed-case analysis, run comparison, and CI quality gates. | Preserve the current service split and make traceability the product centre. |
| Reddit practitioner posts | Enterprise RAG failure modes are often ingestion quality, document structure, metadata, tables, auditability, and reliability, not just model choice. | Add document quality routing, metadata-first indexing, table-aware parsing, and operational observability earlier than advanced agents. |
| Web research | Current best practice favours hybrid retrieval, reranking, contextual retrieval, standardised tracing, evaluation regression suites, prompt caching, and explicit security controls. | Add hybrid retrieval and reranking after the basic trace and eval loop, then add CI gates and production hardening. |

Important note:

The Reddit posts are useful as practitioner signals, not hard evidence. Their business claims and exact percentages should not be treated as product requirements. The technical pain points are useful because they match recurring enterprise RAG issues.

---

## Roadmap principles

### Principle 1: Core loop before advanced retrieval

Do not optimise retrieval before the product can ingest documents, answer with citations, persist traces, run evaluations, and show failures.

```text
document -> chunk -> embed -> retrieve -> answer -> cite -> trace -> evaluate -> inspect failure
```

This is the critical path.

### Principle 2: Deterministic evaluation before LLM-as-judge

LLM-as-judge should improve evaluation coverage, not replace deterministic checks.

Deterministic checks must cover:

- retrieval hit rate
- expected source recall
- citation validity
- citation traceability
- no-answer handling
- latency and cost boundaries

### Principle 3: Metadata is product infrastructure

Metadata is not an afterthought. It controls filtering, source provenance, ACL-aware retrieval, eval assertions, citation quality, and dashboard inspection.

### Principle 4: Agents are post-MVP

Agent workflows should only be added after the deterministic RAG and evaluation loop works. Early product value comes from reliable answering, traceability, and regression detection.

### Principle 5: RAGLens-style faithfulness gates are selective

A faithfulness or hallucination gate is valuable for high-risk answers, but it should not be used to compensate for poor ingestion, poor retrieval, or missing citations.

---

# Roadmap summary

| Stage | Name | Outcome | Priority |
|---|---|---|---|
| 0 | Product and architecture alignment | The project has a clear scope, boundaries, and acceptance model. | P0 |
| 1 | Local platform foundation | All services boot locally with database schemas and health checks. | P0 |
| 2 | Corpus, ingestion, and metadata baseline | Documents can be ingested, normalised, chunked, and traced to source. | P0 |
| 3 | Retrieval and cited answering MVP | Users can ask questions and receive cited answers. | P0 |
| 4 | Query trace and observability core | Every answer is inspectable from question to retrieved chunks to citations. | P0 |
| 5 | Evaluation API and deterministic scoring | Golden datasets can be run and scored repeatably. | P0 |
| 6 | Dashboard inspection workflow | Users can inspect traces, eval runs, and failed cases. | P0 |
| 7 | Run comparison and CI quality gate | Changes can be compared and blocked when quality regresses. | P1 |
| 8 | Retrieval quality expansion | Hybrid retrieval, reranking, query routing, and contextual retrieval improve answer quality. | P1 |
| 9 | Enterprise ingestion and security hardening | The system handles messy enterprise documents and protects access boundaries. | P1 |
| 10 | Selective agents and faithfulness gates | Controlled agent workflows and high-risk answer gates are introduced. | P2 |
| 11 | Production polish and portfolio packaging | The system is documented, deployable, and demo-ready. | P2 |

---

# Stage 0: Product and architecture alignment

## High-level implementation

Define the product shape, non-goals, acceptance criteria, and system boundaries before adding more code.

RAGLens must remain a production-style RAG evaluation and observability platform, not a generic chatbot demo and not a broad agent framework.

## Mid-level implementation

| Workstream | Implementation intent |
|---|---|
| Product scope | Confirm MVP user, jobs-to-be-done, non-goals, and demo flow. |
| Architecture boundaries | Preserve `rag-api`, `eval-api`, and `dashboard` ownership. |
| Evaluation methodology | Confirm retrieval, citation, answer, and operational quality layers. |
| Dataset strategy | Define required test case types and seed corpus coverage. |
| Risk model | Record major risks: weak corpus, unstable judge, provider cost, overbuilt dashboard, advanced retrieval too early. |

## Low-level implementation

- Review and align the following docs:
  - `docs/product-discovery.md`
  - `docs/product-requirements.md`
  - `docs/product-design.md`
  - `docs/architecture-planning.md`
  - `docs/evaluation-methodology.md`
  - `docs/roadmap.md`
- Add a one-page MVP scope table:
  - must-have
  - should-have
  - post-MVP
  - explicit non-goals
- Define initial quality gates:
  - retrieval hit@5 target
  - citation validity target
  - citation traceability target
  - no-answer correctness target
  - maximum average latency target
  - maximum estimated cost per eval run
- Define test case types:
  - factual
  - comparison
  - temporal
  - multi_hop
  - no_answer
  - citation_sensitive
- Define source document types:
  - policy
  - runbook
  - support process
  - engineering guide
  - architecture decision
  - known issue

## Exit criteria

- The MVP is scoped.
- The service split is confirmed.
- Evaluation layers are documented.
- The first demo path is clear.

---

# Stage 1: Local platform foundation

## High-level implementation

Create the local monorepo foundation so all services can run together with consistent configuration, database access, migrations, and health checks.

## Mid-level implementation

| Workstream | Implementation intent |
|---|---|
| Monorepo structure | Add `apps/rag-api`, `apps/eval-api`, `apps/dashboard`, and shared infra folders. |
| Local infrastructure | Add Docker Compose for PostgreSQL and service bootstrapping. |
| Database schemas | Create separate `rag.*` and `eval.*` schemas. |
| Service health | Add health endpoints for all APIs. |
| CI baseline | Add lint, typecheck, test, and build checks. |

## Low-level implementation

- Create or confirm folders:
  - `apps/rag-api`
  - `apps/eval-api`
  - `apps/dashboard`
  - `infra/docker`
  - `infra/migrations`
  - `infra/seed`
- Implement `rag-api` with:
  - Fastify application factory
  - environment loader
  - database client
  - `GET /api/v1/health`
  - structured error shape
- Implement `eval-api` with:
  - FastAPI application factory
  - settings loader
  - database client
  - `GET /api/v1/health`
  - structured error shape
- Implement `dashboard` with:
  - Next.js app shell
  - basic layout
  - navigation placeholders
  - health/status page
- Add migrations for:
  - `rag` schema
  - `eval` schema
  - extension setup for `pgvector`
- Add root scripts:
  - `dev`
  - `test`
  - `lint`
  - `typecheck`
  - `docs:check`
  - `docs:build`
- Add CI workflow:
  - install dependencies
  - run typecheck
  - run lint
  - run unit tests
  - build services

## Exit criteria

- `docker compose up` starts the local system.
- Both APIs return healthy responses.
- Database schemas exist.
- CI validates the basic project structure.

---

# Stage 2: Corpus, ingestion, and metadata baseline

## High-level implementation

Create a controlled sample corpus and a reliable ingestion path that turns documents into traceable chunks with useful metadata.

This stage should stay focused on Markdown and plain text first. PDF, DOCX, OCR, and complex table extraction should be deferred until the core loop works.

## Mid-level implementation

| Workstream | Implementation intent |
|---|---|
| Seed corpus | Create realistic internal company documents for testing and demos. |
| Document model | Store source document identity, version, hash, status, and metadata. |
| Chunk model | Store chunk text, source coordinates, order, token estimates, and metadata. |
| Metadata schema | Support filtering, eval assertions, citation traceability, and future ACLs. |
| Ingestion API | Allow seed and manual ingestion through a stable endpoint. |

## Low-level implementation

- Add seed documents under `infra/seed/documents`:
  - remote work policy v1 and v2
  - expense policy
  - onboarding policy
  - mobile release process
  - incident response runbook
  - API integration guide
  - architecture decision records
  - refund policy
  - escalation process
  - known issues
- Create `rag.documents` fields:
  - `id`
  - `source_id`
  - `title`
  - `source_type`
  - `source_uri`
  - `version`
  - `content_hash`
  - `status`
  - `metadata`
  - `created_at`
  - `updated_at`
- Create `rag.document_chunks` fields:
  - `id`
  - `document_id`
  - `chunk_index`
  - `heading_path`
  - `content`
  - `token_count_estimate`
  - `content_hash`
  - `metadata`
  - `created_at`
- Implement ingestion route:
  - `POST /api/v1/documents/ingest`
- Implement document routes:
  - `GET /api/v1/documents`
  - `GET /api/v1/documents/:documentId`
  - `GET /api/v1/documents/:documentId/chunks`
- Implement chunking rules:
  - preserve heading hierarchy
  - keep chunk order stable
  - avoid empty chunks
  - store original document reference
  - store section path
- Add validation for:
  - empty content
  - unsupported content type
  - duplicate content hash
  - malformed metadata
- Add tests for:
  - valid document ingestion
  - duplicate document handling
  - empty document rejection
  - heading-aware chunking
  - chunk metadata persistence

## Exit criteria

- Seed documents can be loaded.
- Documents are chunked predictably.
- Every chunk is traceable to a document and section.
- Metadata supports later retrieval and evaluation.

---

# Stage 3: Retrieval and cited answering MVP

## High-level implementation

Implement the first useful RAG path: embed chunks, retrieve relevant chunks, generate an answer, and return structured citations.

This stage should use vector retrieval first. Hybrid retrieval and reranking come later.

## Mid-level implementation

| Workstream | Implementation intent |
|---|---|
| Embeddings | Add provider abstraction and store embeddings in pgvector. |
| Retrieval | Retrieve top K chunks with scores and rank order. |
| Prompt building | Build context-packed prompts with citation instructions. |
| Generation | Add provider abstraction for answer generation. |
| Cited response | Return answer, citations, trace ID placeholder, usage, and latency. |

## Low-level implementation

- Add provider interfaces:
  - `EmbeddingProvider`
  - `ChatCompletionProvider`
  - `Retriever`
- Add implementations:
  - OpenAI embedding provider
  - OpenAI chat provider
  - pgvector retriever
- Add config model:
  - model name
  - embedding model
  - topK
  - max context chunks
  - prompt version
  - temperature
- Add `rag.rag_configs` table.
- Add embedding storage to `rag.document_chunks`.
- Add query route:
  - `POST /api/v1/query`
- Response shape:
  - `answer`
  - `citations`
  - `traceId`
  - `retrievalSummary`
  - `usage`
  - `latencyMs`
  - `status`
- Citation shape:
  - `chunkId`
  - `documentId`
  - `title`
  - `headingPath`
  - `quote`
- Add insufficient-evidence behaviour:
  - no relevant chunks means no answer
  - weak retrieval score means cautious response
  - missing citation support means fail closed
- Add tests for:
  - retrieval respects `topK`
  - prompt builder includes chunk references
  - citations map to known chunks
  - no-context query returns insufficient evidence
  - provider failure returns structured error

## Exit criteria

- A user can ask a question against seeded docs.
- The answer includes structured citations.
- Citations refer to real chunks.
- No-answer cases do not hallucinate.

---

# Stage 4: Query trace and observability core

## High-level implementation

Make every RAG answer inspectable. Query traces are the product’s core data asset.

The dashboard, evaluation API, run comparison, and CI gates all depend on durable query traces.

## Mid-level implementation

| Workstream | Implementation intent |
|---|---|
| Trace persistence | Store question, answer, config, model, prompt version, provider usage, and latency. |
| Retrieved context trace | Store retrieved chunks in rank order with scores. |
| Citation trace | Store citations as structured records linked to chunks. |
| Provider telemetry | Store provider request summaries, token usage, cost estimate, and errors. |
| Trace API | Expose trace detail for dashboard and eval-api consumption. |

## Low-level implementation

- Create `rag.query_traces` fields:
  - `id`
  - `question`
  - `answer`
  - `status`
  - `rag_config_id`
  - `prompt_version`
  - `provider`
  - `model`
  - `latency_ms`
  - `estimated_cost`
  - `usage`
  - `error`
  - `created_at`
- Create `rag.query_trace_chunks` fields:
  - `id`
  - `trace_id`
  - `chunk_id`
  - `rank`
  - `score`
  - `retrieval_mode`
  - `included_in_prompt`
- Create `rag.query_trace_citations` fields:
  - `id`
  - `trace_id`
  - `chunk_id`
  - `document_id`
  - `quote`
  - `citation_index`
  - `validity_status`
- Create `rag.provider_calls` fields:
  - `id`
  - `trace_id`
  - `provider`
  - `model`
  - `operation`
  - `latency_ms`
  - `input_tokens`
  - `output_tokens`
  - `estimated_cost`
  - `status`
  - `error_type`
- Add trace routes:
  - `GET /api/v1/queries`
  - `GET /api/v1/queries/:traceId`
  - `GET /api/v1/queries/:traceId/chunks`
  - `GET /api/v1/queries/:traceId/citations`
- Add OpenTelemetry-ready event naming:
  - `rag.query.start`
  - `rag.retrieve.start`
  - `rag.retrieve.end`
  - `rag.generate.start`
  - `rag.generate.end`
  - `rag.trace.persisted`
- Add tests for:
  - trace created for successful query
  - trace created or error persisted for provider failure
  - retrieved chunks saved in rank order
  - citations saved with chunk links
  - cost and latency are optional but schema-safe

## Exit criteria

- Every query creates an inspectable trace.
- Traces explain retrieval, prompt context, generation, citations, latency, and provider usage.
- Eval-api can fetch traces without importing rag-api internals.

---

# Stage 5: Evaluation API and deterministic scoring

## High-level implementation

Build the evaluation service as a black-box evaluator over rag-api. It should run golden test cases, fetch query traces, and compute deterministic quality scores.

## Mid-level implementation

| Workstream | Implementation intent |
|---|---|
| Dataset model | Store datasets and test case versions. |
| Eval runner | Execute test cases against rag-api over HTTP. |
| Raw result storage | Store answer, citations, trace ID, latency, and provider error details. |
| Deterministic scoring | Score retrieval quality and citation quality without an LLM judge. |
| Failure classification | Categorise failures for dashboard triage. |

## Low-level implementation

- Create `eval.datasets` fields:
  - `id`
  - `name`
  - `version`
  - `description`
  - `status`
  - `created_at`
- Create `eval.test_cases` fields:
  - `id`
  - `dataset_id`
  - `type`
  - `question`
  - `expected_answer`
  - `expected_source_ids`
  - `expected_chunk_ids`
  - `must_abstain`
  - `metadata`
- Create `eval.eval_runs` fields:
  - `id`
  - `dataset_id`
  - `rag_config_id`
  - `status`
  - `started_at`
  - `completed_at`
  - `summary`
- Create `eval.eval_case_results` fields:
  - `id`
  - `eval_run_id`
  - `test_case_id`
  - `trace_id`
  - `answer`
  - `citations`
  - `retrieval_scores`
  - `citation_scores`
  - `verdict`
  - `failure_type`
  - `error`
- Add dataset routes:
  - `POST /api/v1/datasets`
  - `GET /api/v1/datasets`
  - `GET /api/v1/datasets/:datasetId`
  - `POST /api/v1/datasets/:datasetId/test-cases`
  - `GET /api/v1/datasets/:datasetId/test-cases`
- Add eval routes:
  - `POST /api/v1/eval-runs`
  - `GET /api/v1/eval-runs`
  - `GET /api/v1/eval-runs/:evalRunId`
  - `GET /api/v1/eval-runs/:evalRunId/results`
- Implement deterministic metrics:
  - `hitAt5`
  - `hitAt10`
  - `recallAt10`
  - `expectedSourceRank`
  - `citationPresent`
  - `citationValidity`
  - `citationTraceability`
  - `abstentionCorrectness`
- Implement failure types:
  - `retrieval_miss`
  - `low_recall`
  - `invalid_citation`
  - `citation_not_retrieved`
  - `wrong_answer`
  - `missed_abstention`
  - `provider_error`
  - `timeout`
- Add tests for:
  - dataset creation
  - duplicate dataset version rejection
  - factual test case creation
  - no-answer test case creation
  - eval runner with mocked rag-api client
  - hit@5 and recall@10 calculations
  - citation validity and traceability calculations

## Exit criteria

- Eval-api runs a dataset against rag-api.
- Results are stored case by case.
- Deterministic retrieval and citation scores are available.
- Failed cases are classified.

---

# Stage 6: Dashboard inspection workflow

## High-level implementation

Build a dashboard that helps engineers and product stakeholders debug RAG behaviour.

The dashboard should prioritise inspection depth over visual polish.

## Mid-level implementation

| Workstream | Implementation intent |
|---|---|
| Documents | Inspect ingested documents and chunks. |
| Query traces | Inspect question, answer, retrieved chunks, citations, cost, and latency. |
| Eval runs | Inspect run summary, pass rate, score breakdown, and failure types. |
| Failed cases | Compare expected vs actual answer, expected vs retrieved sources, and citations. |
| Navigation | Make the product flow obvious from ingestion to trace to eval to failure. |

## Low-level implementation

- Add pages:
  - `/documents`
  - `/documents/[documentId]`
  - `/queries`
  - `/queries/[traceId]`
  - `/datasets`
  - `/datasets/[datasetId]`
  - `/eval-runs`
  - `/eval-runs/[evalRunId]`
  - `/eval-runs/[evalRunId]/failures/[caseResultId]`
- Add API clients:
  - rag-api client
  - eval-api client
- Add components:
  - document table
  - chunk viewer
  - trace header
  - retrieved chunk list
  - citation list
  - usage and latency card
  - eval score summary
  - failed case detail panel
  - expected vs actual comparison
- Add filters:
  - result verdict
  - failure type
  - test case type
  - retrieval mode
  - model/provider
- Add empty states:
  - no documents
  - no traces
  - no eval runs
  - no failed cases
- Add tests for:
  - page render with mocked API data
  - failed case detail displays expected and actual fields
  - query trace detail displays retrieved chunks and citations

## Exit criteria

- A user can inspect how an answer was produced.
- A user can inspect why an eval case failed.
- The dashboard demonstrates the product value without needing logs or database access.

---

# Stage 7: Run comparison and CI quality gate

## High-level implementation

Make quality regression visible and enforceable. A prompt, model, or retrieval change should be compared against a baseline before it is trusted.

## Mid-level implementation

| Workstream | Implementation intent |
|---|---|
| Run comparison | Compare baseline and candidate eval runs. |
| Metric deltas | Show quality, latency, and cost movement. |
| Regression classification | Identify cases that moved from pass to fail. |
| CI gate | Run a small deterministic eval suite in CI. |
| Report artefacts | Produce JSON and Markdown reports for build output. |

## Low-level implementation

- Create `eval.run_comparisons` fields:
  - `id`
  - `baseline_run_id`
  - `candidate_run_id`
  - `summary`
  - `created_at`
- Create `eval.quality_thresholds` fields:
  - `id`
  - `name`
  - `min_hit_at_5`
  - `min_citation_validity`
  - `min_citation_traceability`
  - `min_abstention_correctness`
  - `max_average_latency_ms`
  - `max_estimated_cost`
- Add routes:
  - `POST /api/v1/comparisons`
  - `GET /api/v1/comparisons/:comparisonId`
  - `POST /api/v1/ci/evaluate`
- Compare metrics:
  - pass rate
  - hit@5
  - recall@10
  - citation validity
  - citation traceability
  - no-answer correctness
  - average latency
  - estimated cost
- Classify cases as:
  - unchanged_pass
  - unchanged_fail
  - improved
  - regressed
  - new_error
- Add GitHub Actions workflow:
  - start database
  - run migrations
  - seed sample corpus
  - start rag-api and eval-api
  - run deterministic eval subset
  - fail if thresholds are not met
  - upload report artefact
- Add tests for:
  - pass to fail is regression
  - fail to pass is improvement
  - mismatched dataset comparison is rejected or warned
  - threshold failure returns non-passing CI gate result

## Exit criteria

- Two eval runs can be compared.
- Regressions are visible.
- CI can block a change based on deterministic quality thresholds.

---

# Stage 8: Retrieval quality expansion

## High-level implementation

Improve retrieval quality after the baseline evaluation loop exists. This is where hybrid retrieval, reranking, query rewriting, and contextual retrieval become valuable because their effect can be measured.

## Mid-level implementation

| Workstream | Implementation intent |
|---|---|
| Keyword retrieval | Add lexical search for exact policy, clause, and term matching. |
| Hybrid retrieval | Combine vector and keyword candidates. |
| Reranking | Reorder candidate chunks before prompt construction. |
| Contextual retrieval | Add document-local context to chunks during indexing. |
| Query routing | Select retrieval mode based on query type. |

## Low-level implementation

- Add retrieval modes:
  - `vector`
  - `keyword`
  - `hybrid`
  - `hybrid_reranked`
  - `contextual_hybrid`
- Add keyword index:
  - PostgreSQL full-text search first
  - external search engine only if needed later
- Add hybrid merge strategy:
  - collect vector candidates
  - collect keyword candidates
  - normalise scores
  - deduplicate by chunk ID
  - preserve original score components
- Add reranker interface:
  - `Reranker`
  - `RerankCandidate`
  - `RerankResult`
- Add rerank provider options:
  - local heuristic reranker for tests
  - provider-backed reranker for manual integration
- Add contextual chunk enrichment:
  - document title
  - section path
  - neighbouring heading
  - short generated or deterministic context summary
- Add query classifier:
  - factual lookup
  - comparison
  - temporal
  - multi-hop
  - no-answer probe
  - citation-sensitive
- Persist retrieval metadata in trace:
  - retrieval mode
  - vector score
  - keyword score
  - combined score
  - rerank score
- Add eval comparison presets:
  - `vector-default`
  - `hybrid-default`
  - `hybrid-reranked`
  - `contextual-hybrid`
- Add tests for:
  - keyword retrieval returns lexical matches
  - hybrid retrieval deduplicates candidates
  - reranker changes ordering predictably
  - trace stores all relevant scores
  - comparison shows metric delta between retrieval modes

## Exit criteria

- Retrieval quality improvements can be measured against baseline.
- Trace detail explains why each chunk was retrieved and reranked.
- Run comparison shows quality, latency, and cost trade-offs.

---

# Stage 9: Enterprise ingestion and security hardening

## High-level implementation

Address the enterprise RAG problems raised by practitioner reports: messy documents, duplicate content, tables, scanned PDFs, auditability, and access boundaries.

This should happen after the MVP loop exists because messy ingestion has a large surface area.

## Mid-level implementation

| Workstream | Implementation intent |
|---|---|
| Document quality routing | Detect clean text, OCR-needed, table-heavy, scanned, or malformed documents. |
| File support | Add DOCX, HTML, PDF text extraction, then OCR if needed. |
| Table-aware parsing | Store tables separately from narrative chunks. |
| Incremental indexing | Re-index only changed documents and chunks. |
| Security controls | Add ACL-ready metadata, audit logs, prompt-injection tests, and redaction paths. |

## Low-level implementation

- Add supported file types in order:
  - Markdown
  - text
  - DOCX
  - HTML
  - PDF text extraction
  - PDF OCR
- Add ingestion job model:
  - `rag.ingestion_jobs`
  - status
  - source type
  - document count
  - failed document count
  - error summary
- Add document quality fields:
  - `parse_method`
  - `quality_score`
  - `ocr_required`
  - `table_count`
  - `image_count`
  - `warning_count`
- Add dedupe logic:
  - document content hash
  - chunk content hash
  - source ID plus version
  - selective re-embedding for changed chunks only
- Add table model:
  - `rag.document_tables`
  - document ID
  - page or section reference
  - table markdown
  - structured JSON
  - metadata
- Add ACL-ready fields:
  - tenant ID
  - source owner
  - visibility scope
  - access group IDs
- Add security checks:
  - retrieval must filter by allowed scopes
  - trace detail must not expose unauthorised chunks
  - prompt injection fixtures included in eval dataset
  - provider error logs must not leak secrets
- Add audit events:
  - document ingested
  - document deleted
  - query executed
  - eval run executed
  - trace viewed
  - configuration changed

## Exit criteria

- The system handles more realistic enterprise documents.
- Changed documents do not require full corpus re-indexing.
- Retrieval can be made ACL-aware.
- Security-sensitive operations produce audit records.

---

# Stage 10: Selective agents and faithfulness gates

## High-level implementation

Introduce controlled agent workflows and high-risk answer gates only after deterministic RAG, evaluation, and inspection are working.

Agents should help with bounded workflows. They should not become the core architecture.

## Mid-level implementation

| Workstream | Implementation intent |
|---|---|
| Answerability gate | Decide whether to answer, abstain, retry retrieval, or escalate. |
| Faithfulness gate | Score high-risk answers before returning them. |
| Reviewer workflow | Route uncertain cases to human review. |
| Bounded agents | Add planner, evidence gatherer, and answer drafter only for selected workflows. |
| Calibration | Compare gate decisions against human-reviewed eval cases. |

## Low-level implementation

- Add answerability decision states:
  - `answer`
  - `abstain`
  - `retry_retrieval`
  - `escalate_for_review`
- Add gating inputs:
  - retrieval score summary
  - citation validity
  - citation traceability
  - query type
  - answer confidence
  - unsupported claim signals
- Add optional faithfulness gate:
  - run only for high-risk test case types first
  - persist gate score in trace
  - persist flagged spans if available
  - do not block all answers globally at first
- Add manual review model:
  - reviewer verdict
  - reviewer notes
  - judge correctness flag
  - corrected expected answer
  - corrected expected sources
- Add bounded agent workflow only for post-MVP use cases:
  - plan evidence gathering
  - retrieve evidence
  - draft answer
  - critique answer
  - require approval for write actions
- Add tests for:
  - weak retrieval triggers abstention
  - invalid citation triggers blocked answer or warning
  - high-risk answer invokes gate
  - reviewer override updates result status

## Exit criteria

- High-risk answers have additional safeguards.
- Human review can calibrate automated judgement.
- Agent behaviour is bounded, traceable, and optional.

---

# Stage 11: Production polish and portfolio packaging

## High-level implementation

Make the project understandable to engineers, recruiters, and technical reviewers. The system should be easy to run, inspect, and evaluate locally, with a clear production-style architecture.

## Mid-level implementation

| Workstream | Implementation intent |
|---|---|
| Documentation | Explain product purpose, architecture, local setup, demo flow, and trade-offs. |
| Demo data | Provide deterministic seed data and scripted walkthrough. |
| Screenshots | Show trace detail, eval run detail, failed case detail, and comparison detail. |
| Deployment notes | Document local-first setup and optional hosted deployment path. |
| Release checklist | Define production review and operational readiness checks. |

## Low-level implementation

- Update `README.md` with:
  - product summary
  - architecture diagram
  - service responsibilities
  - local setup
  - demo script
  - evaluation methodology
  - screenshots
  - roadmap link
- Add docs:
  - `docs/demo-script.md`
  - `docs/system-overview.md`, if not already covered
  - `docs/trade-offs.md`, if not already covered
  - `docs/security-review.md`, if not already covered
- Add screenshots:
  - query trace detail
  - eval run detail
  - failed case detail
  - run comparison detail
- Add sample commands:
  - start services
  - seed documents
  - run query
  - run eval
  - compare runs
  - run CI gate locally
- Add release checklist:
  - migrations pass
  - seed data loads
  - eval suite passes
  - dashboard pages render
  - docs build passes
  - no secrets committed
  - provider costs are bounded

## Exit criteria

- A reviewer can understand the product in under five minutes.
- A developer can run the local demo from the README.
- The project shows production-style thinking without pretending to be fully production-deployed.

---

# Roadmap by maturity level

## Level 1: Working RAG

```text
Can ingest documents and answer with citations.
```

Required stages:

- Stage 1
- Stage 2
- Stage 3

## Level 2: Observable RAG

```text
Can inspect exactly how an answer was produced.
```

Required stages:

- Stage 4
- Stage 6 trace screens

## Level 3: Evaluated RAG

```text
Can run golden test cases and score quality.
```

Required stages:

- Stage 5
- Stage 6 eval screens

## Level 4: Comparable RAG

```text
Can compare prompts, models, and retrieval strategies.
```

Required stages:

- Stage 7
- Stage 8

## Level 5: Production-style RAG

```text
Can gate changes in CI and diagnose regressions.
```

Required stages:

- Stage 7 CI gate
- Stage 9 hardening
- Stage 11 documentation and release checklist

---

# Recommended build order

Use this order unless a blocker forces a change:

```text
1. Product and architecture alignment
2. Local platform foundation
3. Seed corpus
4. Document ingestion
5. Chunking and metadata
6. Embeddings
7. Vector retrieval
8. Cited answer generation
9. Query trace persistence
10. Eval datasets
11. Eval runner
12. Deterministic scoring
13. Dashboard trace detail
14. Dashboard eval run detail
15. Dashboard failed case detail
16. Run comparison
17. CI quality gate
18. Hybrid retrieval
19. Reranking
20. Contextual retrieval
21. Enterprise ingestion expansion
22. Security and audit hardening
23. Faithfulness gate pilot
24. Human review workflow
25. Portfolio polish
```

---

# Explicit deferrals

The following should not be built before the core loop works:

- broad autonomous agents
- PDF OCR for all documents
- Kubernetes
- multi-tenancy UI
- public web crawling
- fine-tuning
- full graph retrieval
- complex role management
- polished analytics charts
- multi-provider support beyond the provider abstraction

These are useful later, but they can slow the project down if introduced before traces and evals are useful.

---

# Success definition

The roadmap is successful when RAGLens can demonstrate this workflow end to end:

```text
1. Load a realistic seed corpus.
2. Ask a question.
3. Receive a cited answer.
4. Open the query trace.
5. Inspect retrieved chunks and citations.
6. Run a golden eval dataset.
7. See deterministic quality scores.
8. Open a failed case.
9. Compare baseline and candidate runs.
10. Block a regression through a CI quality gate.
```

That workflow is the strongest version of the product because it demonstrates RAG delivery, evaluation methodology, observability, engineering discipline, and product usefulness in one coherent loop.

---

# Source notes

This roadmap was prepared from:

- Existing RAGLens repository docs and project framing.
- Reddit practitioner posts on enterprise RAG systems and AI agent/RAG project delivery.
- Current RAG engineering patterns covering hybrid retrieval, reranking, contextual retrieval, graph/global retrieval, layout-aware parsing, OpenTelemetry tracing, Ragas-style evaluation, OWASP LLM security guidance, prompt caching, and CI-based quality gates.

The implementation plan deliberately treats anecdotal Reddit material as input for backlog discovery, not as authoritative evidence.