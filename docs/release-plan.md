---
title: "Release Plan"
description: "Release strategy and rollout plan for RAGLens."
order: 14
section: "Delivery"
status: "stable"
---
# Release Plan: RAGLens

## 1. Release plan objective

The release plan should move RAGLens from a local engineering prototype to a polished, production-style portfolio system.

The goal is not to “ship everything”. The goal is to release progressively:

```text
1. Foundation release
2. RAG alpha
3. Evaluation alpha
4. Dashboard beta
5. Portfolio demo release
6. Production-style release
7. Hosted demo release, optional
```

Each release should have:

```text
- clear scope
- release criteria
- test criteria
- demo criteria
- known limitations
- rollback strategy
- documentation updates
```

---

# 2. Release principles

## 2.1 Release only working vertical slices

Avoid releasing half-built horizontal layers.

Good release:

```text
A user can ingest documents, ask a question, and inspect a trace.
```

Weak release:

```text
Database tables exist, but no user-facing flow works.
```

## 2.2 Keep early releases local-first

The first releases should optimise for:

```text
- local reliability
- reproducible setup
- clean demo path
- useful README
```

Do not deploy to cloud until the core local demo is stable.

## 2.3 Separate software readiness from RAG quality readiness

A release can pass normal tests but fail RAG quality.

Release gates should check both:

```text
Software gate:
  tests, build, migrations, service health

RAG quality gate:
  eval dataset, traceability, citation validity, failure inspection
```

## 2.4 Document known limitations honestly

Each release should state what is not supported yet.

Examples:

```text
- markdown/text only
- vector retrieval only
- OpenAI only
- no auth
- no PDF parsing
- no async ingestion
- no production RBAC
```

That makes the project look controlled, not incomplete.

---

# 3. Release stages

## Release 0: Foundation release

### Name

```text
v0.1.0-foundation
```

### Goal

Prove the project boots locally and has the correct service foundation.

### Scope

```text
- monorepo structure
- TypeScript rag-api skeleton
- Python eval-api skeleton
- Next.js dashboard skeleton
- Docker Compose
- PostgreSQL + pgvector
- SQL migrations
- health endpoints
- .env.example
- initial README
```

### Included endpoints

```text
rag-api:
  GET /api/v1/health

eval-api:
  GET /api/v1/health
```

### Release criteria

```text
- docker compose up starts all services
- rag-api health check passes
- eval-api health check passes
- dashboard loads
- migrations create rag and eval schemas
- README explains local setup
```

### Test gate

```text
- lint passes
- typecheck passes for Node apps
- pytest passes for eval-api skeleton
- migration smoke test passes
- Docker smoke test passes
```

### Demo script

```text
1. Clone repo.
2. Copy .env.example to .env.
3. Run docker compose up.
4. Open dashboard.
5. Call rag-api /health.
6. Call eval-api /health.
```

### Known limitations

```text
- no document ingestion
- no RAG query
- no evaluation
- no dashboard functionality beyond shell
```

---

## Release 1: RAG ingestion alpha

### Name

```text
v0.2.0-rag-ingestion-alpha
```

### Goal

Prove documents can be ingested, chunked, stored, and inspected.

### Scope

```text
- sample company knowledge base
- document ingestion endpoint
- text/markdown chunking
- document list/detail endpoints
- chunk list/detail endpoints
- dashboard documents page
- seed script for sample documents
```

### Included endpoints

```text
POST /api/v1/documents/ingest
GET  /api/v1/documents
GET  /api/v1/documents/:documentId
GET  /api/v1/documents/:documentId/chunks
GET  /api/v1/documents/:documentId/chunks/:chunkId
```

### Release criteria

```text
- sample documents can be seeded
- documents appear in API and dashboard
- chunks are created and visible
- empty documents are rejected
- unsupported document types are rejected
```

### Test gate

```text
- chunker unit tests pass
- document ingestion route tests pass
- document list/detail tests pass
- seed script smoke test passes
```

### Demo script

```text
1. Start services.
2. Run seed:documents.
3. Open Documents page.
4. Open Remote Work Policy v2.
5. Inspect chunks and metadata.
```

### Known limitations

```text
- no embeddings
- no retrieval
- no answer generation
- no evaluation
- markdown/text only
```

---

## Release 2: RAG query alpha

### Name

```text
v0.3.0-rag-query-alpha
```

### Goal

Prove the system can answer questions over indexed documents with citations.

### Scope

```text
- OpenAI embedding provider
- pgvector embedding storage
- vector retrieval
- default RAG config
- answer generation
- structured citations
- insufficient-evidence behaviour
- basic query endpoint
```

### Included endpoints

```text
GET  /api/v1/rag-configs
POST /api/v1/query
```

### Release criteria

```text
- chunks receive embeddings
- vector retrieval returns ranked chunks
- query returns answer
- query returns structured citations
- query returns usage and latency
- no-context query returns insufficient-evidence answer
```

### Test gate

```text
- embedding provider mocked tests pass
- vector retrieval tests pass
- prompt builder tests pass
- citation parser tests pass
- query route tests pass with mocked providers
```

### Demo script

```text
1. Seed documents.
2. Ask: “What is the remote work approval process?”
3. Show generated answer.
4. Show citations.
5. Ask unsupported question.
6. Show insufficient-evidence response.
```

### Known limitations

```text
- no full query trace detail yet
- vector retrieval only
- OpenAI only
- no eval-api integration
- no run comparison
```

---

## Release 3: Traceability beta

### Name

```text
v0.4.0-traceability-beta
```

### Goal

Make every answer inspectable.

### Scope

```text
- query trace persistence
- retrieved chunk trace records
- citation trace records
- provider call telemetry
- query trace list/detail APIs
- dashboard query trace pages
```

### Included endpoints

```text
GET /api/v1/queries
GET /api/v1/queries/:traceId
GET /api/v1/queries/:traceId/chunks
GET /api/v1/queries/:traceId/citations
```

### Release criteria

```text
- every query returns traceId
- trace stores question, answer, provider, model, prompt version, config
- trace stores retrieved chunks with rank and score
- trace stores citations
- trace stores cost/latency/token usage where available
- dashboard can display query trace detail
```

### Test gate

```text
- query route persists traces
- trace detail route returns chunks and citations
- provider failure stores structured error path
- dashboard trace detail renders populated state
```

### Demo script

```text
1. Ask a question.
2. Open the returned trace.
3. Show retrieved chunks.
4. Show citations.
5. Show model, prompt version, latency, and cost.
```

### Known limitations

```text
- no eval datasets yet
- no automatic scoring
- no run comparison
- no CI quality gate
```

This is the first release that clearly shows production-style thinking.

---

## Release 4: Evaluation alpha

### Name

```text
v0.5.0-evaluation-alpha
```

### Goal

Run golden test cases against the RAG API and store results.

### Scope

```text
- evaluation datasets
- test cases
- seed dataset
- eval run creation
- eval runner
- eval case result storage
- rag-api client inside eval-api
- run status and progress
```

### Included endpoints

```text
POST /api/v1/datasets
GET  /api/v1/datasets
GET  /api/v1/datasets/:datasetId

POST /api/v1/datasets/:datasetId/test-cases
GET  /api/v1/datasets/:datasetId/test-cases
GET  /api/v1/test-cases/:testCaseId

POST /api/v1/eval-runs
GET  /api/v1/eval-runs
GET  /api/v1/eval-runs/:evalRunId
GET  /api/v1/eval-runs/:evalRunId/results
GET  /api/v1/eval-runs/:evalRunId/results/:caseResultId
```

### Release criteria

```text
- dataset can be seeded
- test cases include expected answer and expected sources
- eval run can execute 20 to 30 cases
- eval-api calls rag-api /query
- eval-api fetches query trace
- eval case result stores answer, traceId, latency, cost
- partial failures are persisted safely
```

### Test gate

```text
- dataset route tests pass
- test case route tests pass
- eval runner tests pass with mocked rag-api client
- partial failure tests pass
- run status transition tests pass
```

### Demo script

```text
1. Seed documents.
2. Seed eval dataset.
3. Start eval run.
4. Open eval run detail.
5. Show test cases executed.
6. Open one case result and show linked traceId.
```

### Known limitations

```text
- raw results only or minimal scoring
- no LLM judge
- no comparison
- dashboard may be basic
```

---

## Release 5: Scoring beta

### Name

```text
v0.6.0-scoring-beta
```

### Goal

Add deterministic scoring and verdicts.

### Scope

```text
- retrieval metrics
- citation metrics
- verdict calculation
- failure type classification
- run summary aggregation
- eval run dashboard summary
- failed case detail page
```

### Metrics included

```text
Retrieval:
  hit@5
  hit@10
  recall@10
  expectedSourceRank

Citation:
  citationPresent
  citationValidity
  citationTraceability
```

### Verdicts

```text
pass
fail
warning
error
```

### Failure types

```text
retrieval_miss
low_recall
invalid_citation
citation_not_retrieved
provider_error
timeout
```

### Release criteria

```text
- every eval case has retrievalScores
- every eval case has citationScores
- every eval case has verdict
- failed cases have failureType
- eval run summary aggregates scores
- dashboard shows failed cases clearly
```

### Test gate

```text
- hit@k tests pass
- recall@k tests pass
- expectedSourceRank tests pass
- citationValidity tests pass
- citationTraceability tests pass
- verdict calculation tests pass
- failure type classification tests pass
```

### Demo script

```text
1. Run eval dataset.
2. Show pass rate.
3. Show failed cases.
4. Open a failed case.
5. Explain whether it was retrieval or citation failure.
```

### Known limitations

```text
- answer quality scoring is limited
- no groundedness/correctness/completeness judge yet
- no run comparison
```

---

## Release 6: LLM judge beta

### Name

```text
v0.7.0-llm-judge-beta
```

### Goal

Add qualitative answer scoring.

### Scope

```text
- judge provider abstraction
- OpenAI judge provider
- judge prompt v1
- structured JSON judge output
- groundedness score
- correctness score
- completeness score
- citationSupport score
- refusalQuality for no-answer cases
- unsupportedClaims
- missingImportantPoints
- judge error handling
```

### Release criteria

```text
- judge can be enabled/disabled per eval run
- judge scores are stored
- malformed judge output is handled safely
- no-answer cases are evaluated for refusal quality
- failed case page shows unsupported claims and missing points
```

### Test gate

```text
- judge parser tests pass
- malformed judge output tests pass
- no-answer scoring tests pass
- unsupported claim classification tests pass
- judge-enabled eval run tests pass with mocked judge
```

### Demo script

```text
1. Run judge-enabled eval.
2. Open failed no-answer case.
3. Show unsupported claims.
4. Show groundedness/correctness/citation support scores.
5. Show evaluator explanation.
```

### Known limitations

```text
- LLM judge can be noisy
- no human review workflow
- no RAGAS/DeepEval integration yet
```

---

## Release 7: Dashboard beta

### Name

```text
v0.8.0-dashboard-beta
```

### Goal

Make the system demoable end to end.

### Scope

```text
- app shell and navigation
- documents pages
- query trace pages
- dataset pages
- eval run pages
- failed case detail
- settings/config read-only pages
- loading/empty/error states
```

### Required screens

```text
Documents List
Document Detail
Query Trace List
Query Trace Detail
Dataset List
Dataset Detail
Eval Run List
Eval Run Detail
Failed Case Detail
Configs
Overview
```

### Release criteria

```text
- user can inspect indexed documents
- user can inspect query traces
- user can run or view eval runs
- user can inspect failed cases
- failed case page explains expected vs generated answer
- failed case page shows expected vs retrieved sources
- failed case page shows retrieval, citation, and judge scores
```

### Test gate

```text
- key dashboard component tests pass
- trace detail populated/empty/error states pass
- eval run detail populated/empty/error states pass
- failed case detail renders all key sections
- dashboard build passes
```

### Demo script

```text
1. Open Overview.
2. Open Documents.
3. Open Query Trace.
4. Open Eval Runs.
5. Open Failed Case Detail.
6. Explain failure from UI.
```

### Known limitations

```text
- config editing may be read-only
- no prompt editor
- no auth
- no advanced charts
```

---

## Release 8: Run comparison beta

### Name

```text
v0.9.0-comparison-beta
```

### Goal

Compare baseline and candidate RAG runs.

### Scope

```text
- comparison service
- comparison API
- metric delta calculation
- improved case classification
- regressed case classification
- comparison dashboard page
```

### Included endpoints

```text
POST /api/v1/comparisons
GET  /api/v1/comparisons
GET  /api/v1/comparisons/:comparisonId
```

### Release criteria

```text
- user can compare two runs from same dataset
- comparison shows pass rate delta
- comparison shows retrieval/citation/judge metric deltas
- comparison shows cost and latency deltas
- comparison lists improved cases
- comparison lists regressed cases
```

### Test gate

```text
- fail -> pass classified as improved
- pass -> fail classified as regressed
- metric deltas calculated correctly
- mismatched datasets are rejected or warned
- comparison page renders summary and case lists
```

### Demo script

```text
1. Run baseline config.
2. Run candidate config.
3. Compare runs.
4. Show quality improved.
5. Show cost/latency trade-off.
6. Open one regressed case.
```

### Known limitations

```text
- comparison is dataset-level only
- no statistical significance testing
- no long-term trend charts
```

This is the strongest pre-1.0 feature for interviews.

---

# 4. Version 1.0: Portfolio demo release

## Name

```text
v1.0.0-portfolio-demo
```

## Goal

Create a polished, complete, locally reproducible portfolio release.

This should be the first release you would confidently show to a recruiter, hiring manager, or technical interviewer.

## Required capabilities

```text
- local Docker Compose setup
- sample company knowledge base
- document ingestion
- chunking
- embeddings
- vector retrieval
- source-grounded answer generation
- structured citations
- query traces
- evaluation datasets
- deterministic scoring
- LLM-as-judge scoring
- failed case inspection
- run comparison
- dashboard
- README and demo script
```

## Required docs

```text
README.md
docs/product/product-brief.md
docs/architecture/system-overview.md
docs/architecture/data-model.md
docs/api/api-overview.md
docs/evaluation/evaluation-methodology.md
docs/decisions/
docs/demo-script.md
```

## Required screenshots

```text
docs/screenshots/
  documents.png
  query-trace-detail.png
  eval-run-detail.png
  failed-case-detail.png
  run-comparison.png
```

## Required demo path

```text
1. Start system locally.
2. Seed sample documents.
3. Ask a question.
4. Inspect trace.
5. Run eval dataset.
6. Inspect failed case.
7. Compare baseline and candidate runs.
```

## Release criteria

```text
- fresh clone setup works from README
- all services run locally
- seed data works
- demo script works
- tests pass
- deterministic eval passes
- dashboard build passes
- no secrets committed
- known limitations documented
```

## Test gate

```text
- standard CI passes
- Docker smoke passes
- migration smoke passes
- deterministic RAG quality gate passes
- manual demo checklist passes
```

## Known limitations to state

```text
- no auth
- no multi-tenancy
- no enterprise RBAC
- markdown/text only
- vector retrieval only by default, unless hybrid has been added
- OpenAI first provider
- local-first demo
- live LLM judge can vary slightly between runs
```

## Release tag

```text
v1.0.0
```

---

# 5. Version 1.1: CI quality gate release

## Name

```text
v1.1.0-ci-quality-gate
```

## Goal

Add production-style AI quality gates.

## Scope

```text
- threshold presets
- CI evaluation endpoint
- CI gate result storage
- GitHub Actions deterministic eval workflow
- JSON/Markdown eval reports
- PR quality report artefact
```

## Included endpoint

```text
POST /api/v1/ci/evaluate
```

## Release criteria

```text
- GitHub Actions can run deterministic eval
- eval report is uploaded as artefact
- CI fails when deterministic quality threshold fails
- report shows threshold failures
```

## Test gate

```text
- CI workflow tested on branch
- forced failing threshold fails workflow
- passing threshold passes workflow
- report artefact generated
```

## Known limitations

```text
- live LLM judge not blocking PRs by default
- deterministic gate is primary blocker
- live eval runs manually or scheduled
```

---

# 6. Version 1.2: Advanced retrieval release

## Name

```text
v1.2.0-advanced-retrieval
```

## Goal

Make retrieval comparison meaningful.

## Scope

```text
- keyword retrieval
- hybrid retrieval
- metadata filtering
- optional query rewriting
- retrieval mode comparison
- persisted retrieval mode in traces
```

## New RAG configs

```text
vector-default
vector-topk-12
hybrid-default
hybrid-filtered
```

## Release criteria

```text
- same dataset can be run against vector and hybrid configs
- comparison shows retrieval metric delta
- trace shows retrieval mode
- metadata filters work where configured
```

## Test gate

```text
- keyword retrieval tests pass
- hybrid merge tests pass
- metadata filter tests pass
- retrieval comparison eval passes
```

---

# 7. Version 1.3: Reranking release

## Name

```text
v1.3.0-reranking
```

## Goal

Add reranking to improve retrieval quality.

## Scope

```text
- reranker provider abstraction
- reranked retrieval mode
- rerank scores persisted
- rerank scores shown in trace detail
- eval comparison: hybrid vs hybrid_reranked
```

## Release criteria

```text
- reranker can be enabled by RAG config
- retrieved chunks include original score and rerank score
- dashboard displays rerank score
- eval comparison shows impact
```

## Known limitations

```text
- reranker may increase latency and cost
- reranking provider support may be limited initially
```

---

# 8. Version 1.4: Provider comparison release

## Name

```text
v1.4.0-provider-comparison
```

## Goal

Compare model providers across quality, cost, and latency.

## Scope

```text
- Anthropic provider, optional
- OpenRouter provider, optional
- provider-specific config
- provider error normalisation
- model pricing config
- provider comparison eval runs
```

## Release criteria

```text
- at least two model providers can be configured
- same dataset can run across providers
- comparison shows quality/cost/latency differences
- provider failures are normalised
```

---

# 9. Version 1.5: Better ingestion release

## Name

```text
v1.5.0-document-ingestion
```

## Goal

Expand ingestion beyond markdown/text.

## Scope

```text
- DOCX parsing
- HTML parsing
- PDF text extraction
- async ingestion jobs
- ingestion status dashboard
- duplicate detection by checksum
```

## Release criteria

```text
- user can ingest DOCX/HTML/PDF text
- ingestion status is visible
- failed ingestion has clear error
- duplicate documents are detected
```

## Non-goal

```text
Full OCR is still optional and should not be a priority unless needed.
```

---

# 10. Version 1.6: Human review release

## Name

```text
v1.6.0-human-review
```

## Goal

Allow human review of eval results and judge calibration.

## Scope

```text
- manual review table
- corrected verdict
- reviewer notes
- mark judge correct/incorrect
- flag ambiguous test cases
- dashboard review workflow
```

## Release criteria

```text
- user can review failed case
- user can override verdict
- review notes are stored
- reviewed cases are visible
```

---

# 11. Hosted demo release

## Name

```text
v1.x-hosted-demo
```

## Goal

Provide a public or private hosted demo.

## Deployment options

Simple:

```text
Render / Railway / Fly.io
```

Enterprise-aligned:

```text
Azure Container Apps + Azure Database for PostgreSQL
```

Backend/platform-aligned:

```text
AWS ECS + RDS PostgreSQL
```

## Hosted demo requirements

```text
- dashboard accessible
- sample data already seeded
- no public write access without protection
- API keys secure
- costs controlled
- reset seed data script available
```

## Hosted demo warning

Do not expose unrestricted live LLM endpoints publicly.

For a hosted demo:

```text
- disable arbitrary query if public
- use fixed sample flows
- add simple auth or access token
- rate-limit query/eval endpoints
```

---

# 12. Release gates

## Standard software release gate

Required for every release:

```text
- lint passes
- typecheck passes
- unit tests pass
- integration tests pass
- dashboard build passes
- migrations apply cleanly
- Docker smoke test passes
```

## RAG quality release gate

Required from `v0.6.0` onward:

```text
- sample dataset runs successfully
- deterministic metrics calculated
- no unexpected provider errors
- citation validity above threshold
- trace coverage is 100%
```

Suggested minimum:

```text
trace coverage: 100%
citation validity: >= 0.95
deterministic eval completion: >= 0.95
```

## Portfolio release gate

Required for `v1.0.0`:

```text
- fresh clone works
- demo script works
- screenshots updated
- docs updated
- known limitations documented
- no secrets committed
- manual QA checklist passes
```

## Production-style release gate

Required for `v1.1.0+`:

```text
- CI quality gate works
- eval report artefacts generated
- failure states visible
- partial eval failures handled
- provider timeouts handled
```

---

# 13. Manual QA checklist

Run before every major release.

```text
1. Clone repo fresh.
2. Copy .env.example to .env.
3. Add required API key if running live mode.
4. Run docker compose up.
5. Run migrations.
6. Seed sample documents.
7. Seed eval dataset.
8. Open dashboard.
9. Confirm documents are visible.
10. Ask a query.
11. Confirm answer includes citations.
12. Open query trace.
13. Confirm retrieved chunks are visible.
14. Run eval dataset.
15. Confirm eval run completes.
16. Open failed case.
17. Confirm failure is understandable.
18. Compare two runs, if available.
19. Confirm README instructions are accurate.
20. Confirm no secrets appear in logs.
```

---

# 14. Release artefacts

Each release should produce:

```text
- Git tag
- release notes
- updated README
- migration notes
- known limitations
- screenshots, for portfolio releases
- eval report, for quality releases
```

## Release notes format

```markdown
# RAGLens v0.6.0 - Scoring Beta

## Added
- Deterministic retrieval metrics
- Citation validity scoring
- Verdict calculation
- Failed case classifications

## Changed
- Eval run summary now includes pass rate and score averages

## Fixed
- Trace detail handles missing citations

## Known limitations
- LLM judge scoring not included yet
- CI quality gate not included yet

## Demo
- Seed docs
- Run eval
- Open failed case detail
```

---

# 15. Versioning strategy

Use semantic versioning, but allow pre-1.0 development releases.

```text
v0.1.0 foundation
v0.2.0 ingestion alpha
v0.3.0 RAG query alpha
v0.4.0 traceability beta
v0.5.0 evaluation alpha
v0.6.0 scoring beta
v0.7.0 LLM judge beta
v0.8.0 dashboard beta
v0.9.0 comparison beta
v1.0.0 portfolio demo
v1.1.0 CI quality gate
v1.2.0 advanced retrieval
```

## Version meaning

```text
Patch:
  bug fixes, docs, small UI fixes

Minor:
  new capability or major workflow improvement

Major:
  stable portfolio/product milestone
```

---

# 16. Rollback strategy

## Local-first releases

Rollback means:

```text
git checkout previous tag
docker compose down -v
docker compose up
```

## Database migrations

For MVP, prefer additive migrations.

Avoid destructive migrations until you have backups/export.

Migration rule:

```text
Do not drop or rename columns in early releases unless absolutely necessary.
```

If a migration breaks:

```text
- reset local DB
- rerun migrations
- reseed sample data
```

## Hosted demo rollback, later

If hosted:

```text
- deploy previous image tag
- restore previous database snapshot if needed
- rerun smoke tests
```

---

# 17. Release communication

For portfolio and LinkedIn/GitHub updates, communicate releases by product capability, not implementation detail only.

Weak:

```text
Added eval_case_results table.
```

Better:

```text
Added evaluation runs that execute golden datasets against the RAG API and store case-level results.
```

Strong:

```text
RAGLens can now run repeatable golden evaluations against a source-grounded RAG API, linking every failed case back to the query trace that produced it.
```

---

# 18. README release badges

Eventually add badges for:

```text
CI
Docker smoke
RAG quality gate
Latest release
```

Example:

```text
CI: passing
Docker smoke: passing
RAG quality gate: passing
```

Only add these once stable.

---

# 19. What not to release too early

Do not include these in early releases:

```text
- cloud deployment
- auth
- multi-tenancy
- PDF OCR
- agents
- fine-tuning
- complex queues
- Kubernetes
- public arbitrary query endpoint
```

These can distract from the actual product.

The core release story should remain:

```text
RAG answer
  -> trace
  -> eval
  -> failed case
  -> comparison
  -> quality gate
```

---

# 20. Final release sequence

Use this release sequence:

```text
v0.1.0 Foundation
  Services boot, schemas exist, dashboard shell loads.

v0.2.0 Ingestion Alpha
  Documents can be ingested, chunked, and inspected.

v0.3.0 RAG Query Alpha
  Questions return source-grounded answers with citations.

v0.4.0 Traceability Beta
  Every answer has an inspectable trace.

v0.5.0 Evaluation Alpha
  Golden datasets can run against rag-api.

v0.6.0 Scoring Beta
  Retrieval and citation quality are scored.

v0.7.0 LLM Judge Beta
  Groundedness, correctness, completeness, and unsupported claims are scored.

v0.8.0 Dashboard Beta
  The product is inspectable end to end.

v0.9.0 Comparison Beta
  Baseline and candidate runs can be compared.

v1.0.0 Portfolio Demo
  The project is polished, documented, reproducible, and demo-ready.

v1.1.0 CI Quality Gate
  RAG quality can block regressions in CI.

v1.2.0+ Production-style Enhancements
  Hybrid retrieval, reranking, provider comparison, better ingestion, human review.
```

The most important release is `v1.0.0`: it should make the project understandable, credible, and demoable without requiring you to explain missing pieces verbally.
