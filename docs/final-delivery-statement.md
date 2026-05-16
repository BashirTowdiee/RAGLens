---
title: "Final Delivery Statement"
description: "The final project delivery framing"
order: 16
section: "Delivery"
status: "stable"
---
# Final Company-Style Delivery Plan: RAGLens

## 1. Delivery objective

RAGLens should be delivered like a real product engineering initiative, not as a single large build.

The delivery plan should move through these stages:

```text
1. Product definition
2. Technical foundation
3. RAG core
4. Traceability
5. Evaluation core
6. Scoring
7. Dashboard
8. Run comparison
9. CI quality gate
10. Production-style hardening
11. Portfolio/demo packaging
```

The core delivery principle:

```text
Every milestone must produce something runnable, testable, and demoable.
```

---

# 2. Final product direction

## Product

```text
RAGLens
```

## One-line description

```text
A production-style RAG evaluation and observability platform for building, testing, tracing, scoring, and improving source-grounded AI systems.
```

## System components

```text
rag-api
  TypeScript + Fastify
  Handles document ingestion, chunking, embeddings, retrieval, answer generation, citations, and query traces.

eval-api
  Python + FastAPI
  Handles golden datasets, eval runs, deterministic metrics, LLM-as-judge scoring, run comparison, and CI quality gates.

dashboard
  Next.js + TypeScript
  Provides document inspection, query trace views, eval run summaries, failed-case analysis, and run comparison.

database
  PostgreSQL + pgvector
  Stores documents, chunks, embeddings, traces, datasets, test cases, eval results, and scores.
```

## Product promise

```text
Every answer is traceable.
Every trace is evaluable.
Every evaluation is reproducible.
Every change is measurable.
```

---

# 3. Final delivery sequence

Use this as the official build order.

```text
1. Product discovery
2. Product requirements
3. Product design
4. UX/dashboard design
5. Architecture planning
6. Technical design decisions
7. Data design
8. API planning
9. Evaluation methodology
10. Roadmap
11. Development process
12. Testing strategy
13. CI/CD plan
14. Release plan
15. Production readiness review
16. Implementation
17. Portfolio/demo packaging
```

The planning artefacts are mostly done. The next real step is implementation.

---

# 4. Delivery workstreams

A company would split the work into parallel but coordinated workstreams.

## Workstream 1: Product and UX

Owns:

```text
- product brief
- user personas
- user flows
- dashboard workflows
- acceptance criteria
- demo story
```

Deliverables:

```text
docs/product/product-brief.md
docs/product/product-requirements.md
docs/product/product-design.md
docs/product/ux-dashboard-design.md
docs/product/demo-script.md
```

---

## Workstream 2: Backend platform

Owns:

```text
- rag-api
- eval-api
- database
- migrations
- API contracts
- provider integrations
```

Deliverables:

```text
apps/rag-api
apps/eval-api
infra/migrations
packages/contracts/openapi
```

---

## Workstream 3: Evaluation and quality

Owns:

```text
- golden datasets
- scoring methodology
- judge prompt
- verdict calculation
- failure classification
- run comparison
- CI quality gate
```

Deliverables:

```text
docs/evaluation/evaluation-methodology.md
infra/seed/datasets/company-kb-eval-v1.json
apps/eval-api/app/modules/scoring
apps/eval-api/app/modules/judges
```

---

## Workstream 4: Dashboard

Owns:

```text
- document inspection
- trace inspection
- eval run views
- failed-case analysis
- comparison views
```

Deliverables:

```text
apps/dashboard
apps/dashboard/src/features/documents
apps/dashboard/src/features/queries
apps/dashboard/src/features/eval-runs
apps/dashboard/src/features/comparisons
```

---

## Workstream 5: DevOps and release

Owns:

```text
- Docker Compose
- CI
- migration smoke tests
- deterministic RAG quality gate
- release artefacts
- README/demo docs
```

Deliverables:

```text
docker-compose.yml
.github/workflows/ci.yml
.github/workflows/docker-smoke.yml
.github/workflows/rag-quality-gate.yml
README.md
docs/demo-script.md
```

---

# 5. Company-style phase plan

## Phase 0: Project setup and planning

### Goal

Lock down the product direction and technical baseline.

### Deliverables

```text
- product discovery
- product requirements
- product design
- UX/dashboard design
- architecture plan
- data design
- API plan
- evaluation methodology
- roadmap
- release plan
```

### Exit criteria

```text
- controlled internal company knowledge base chosen
- service boundaries agreed
- MVP scope agreed
- non-goals documented
```

### Status

```text
Planning complete enough to start implementation.
```

---

## Phase 1: Foundation

### Goal

Create the working local system skeleton.

### Build

```text
- monorepo
- apps/rag-api
- apps/eval-api
- apps/dashboard
- PostgreSQL + pgvector
- Docker Compose
- SQL migrations
- health endpoints
- .env.example
- README setup
```

### Acceptance criteria

```text
- docker compose up starts all services
- rag-api /health returns ok
- eval-api /health returns ok
- dashboard loads
- migrations create rag and eval schemas
```

### Demo

```text
Fresh clone -> docker compose up -> health checks pass.
```

---

## Phase 2: Sample corpus and dataset

### Goal

Create controlled sample data for product demos and evals.

### Build

```text
sample-company-knowledge-base:
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

company-kb-eval-v1:
  20 to 30 test cases
```

### Test case types

```text
- factual
- comparison
- temporal/versioned
- multi-hop
- no-answer
- citation-sensitive
```

### Acceptance criteria

```text
- documents are realistic enough for demo
- expected answers are defined
- expected sources are defined
- no-answer cases exist
- source references are stable
```

### Demo

```text
Show the sample knowledge base and explain the eval dataset.
```

---

## Phase 3: Document ingestion

### Goal

Ingest markdown/text documents and store chunks.

### Build

```text
rag-api:
  POST /api/v1/documents/ingest
  GET  /api/v1/documents
  GET  /api/v1/documents/:documentId
  GET  /api/v1/documents/:documentId/chunks

database:
  rag.documents
  rag.document_chunks

dashboard:
  Documents list
  Document detail
  Chunk preview
```

### Acceptance criteria

```text
- valid documents are stored
- chunks are created
- metadata is preserved
- empty documents are rejected
- documents are visible in dashboard
```

### Demo

```text
Seed sample docs -> open Documents page -> inspect chunks.
```

---

## Phase 4: Retrieval and answer generation

### Goal

Ask questions over indexed documents.

### Build

```text
- OpenAI embedding provider
- vector storage in pgvector
- vector retriever
- answer prompt builder
- OpenAI chat provider
- structured citations
- insufficient-evidence behaviour
- POST /api/v1/query
```

### Acceptance criteria

```text
- chunks receive embeddings
- query retrieves relevant chunks
- answer is generated from context
- citations are structured
- no-context questions produce insufficient-evidence response
- query returns traceId placeholder or actual traceId
```

### Demo

```text
Ask “What is the remote work approval process?”
Return answer with citation to Remote Work Policy v2.
```

---

## Phase 5: Query tracing

### Goal

Make every answer inspectable.

### Build

```text
rag.query_traces
rag.query_trace_chunks
rag.query_trace_citations
rag.provider_calls

GET /api/v1/queries
GET /api/v1/queries/:traceId

dashboard:
  Query trace list
  Query trace detail
```

### Acceptance criteria

```text
- every query returns traceId
- trace stores question, answer, config, prompt version, model, provider
- trace stores retrieved chunks with rank and score
- trace stores citations
- trace stores latency, tokens, estimated cost
- dashboard shows trace detail
```

### Demo

```text
Ask a question -> open trace -> show retrieved chunks, citations, model, cost, latency.
```

This is the first major product proof point.

---

## Phase 6: Evaluation datasets and runner

### Goal

Run golden test cases against the RAG API.

### Build

```text
eval-api:
  POST /api/v1/datasets
  GET  /api/v1/datasets
  POST /api/v1/datasets/:datasetId/test-cases
  GET  /api/v1/datasets/:datasetId/test-cases
  POST /api/v1/eval-runs
  GET  /api/v1/eval-runs
  GET  /api/v1/eval-runs/:evalRunId
  GET  /api/v1/eval-runs/:evalRunId/results

database:
  eval.datasets
  eval.test_cases
  eval.eval_runs
  eval.eval_case_results
```

### Acceptance criteria

```text
- dataset can be seeded
- eval run calls rag-api /query for each test case
- traceId is stored for each case
- raw answer is stored
- partial failures do not erase completed results
```

### Demo

```text
Run 20 test cases against rag-api and show eval results.
```

---

## Phase 7: Deterministic scoring

### Goal

Score retrieval and citation behaviour without relying on LLM judge.

### Build

```text
retrieval metrics:
  hit@5
  hit@10
  recall@10
  expectedSourceRank

citation metrics:
  citationPresent
  citationValidity
  citationTraceability

verdicts:
  pass
  fail
  warning
  error

failure types:
  retrieval_miss
  low_recall
  invalid_citation
  citation_not_retrieved
  provider_error
  timeout
```

### Acceptance criteria

```text
- every eval case result has retrievalScores
- every eval case result has citationScores
- failed cases have failureType
- eval run summary aggregates pass rate and metrics
- deterministic scoring works without LLM judge
```

### Demo

```text
Open eval run -> show pass rate -> open failed case -> explain retrieval/citation failure.
```

This is the second major product proof point.

---

## Phase 8: LLM-as-judge scoring

### Goal

Assess groundedness, correctness, completeness, citation support, and refusal quality.

### Build

```text
- judge provider abstraction
- judge prompt v1
- structured JSON output parser
- groundedness
- correctness
- completeness
- citationSupport
- refusalQuality
- unsupportedClaims
- missingImportantPoints
```

### Acceptance criteria

```text
- judge can be enabled per run
- judge output is validated
- malformed output becomes judge_error
- no-answer cases assess refusal quality
- failed case detail shows judge explanation
```

### Demo

```text
Open failed no-answer case -> show unsupported claims and judge notes.
```

---

## Phase 9: Dashboard MVP

### Goal

Make the system usable and demoable.

### Build priority

```text
1. Query Trace Detail
2. Eval Run Detail
3. Failed Case Detail
4. Documents List/Detail
5. Dataset List/Detail
6. Run Comparison Detail
7. Overview
8. Configs/Settings
```

### Acceptance criteria

```text
- user can inspect indexed documents
- user can inspect query traces
- user can inspect eval runs
- failed cases are clearly visible
- failed case detail shows expected vs generated answer
- failed case detail shows expected vs retrieved sources
- failed case detail shows citation and judge scores
```

### Demo

```text
Walk through Documents -> Query Trace -> Eval Run -> Failed Case.
```

This is the third major product proof point.

---

## Phase 10: Run comparison

### Goal

Show whether a change improved or regressed RAG quality.

### Build

```text
POST /api/v1/comparisons
GET  /api/v1/comparisons/:comparisonId

comparison metrics:
  passRate delta
  hit@5 delta
  recall@10 delta
  groundedness delta
  correctness delta
  citationSupport delta
  latency delta
  cost delta

case classification:
  improved cases
  regressed cases
```

### Acceptance criteria

```text
- user can compare two runs over the same dataset
- improved cases are listed
- regressed cases are listed
- cost and latency trade-offs are visible
```

### Demo

```text
Compare vector-default vs vector-topk-12 or prompt-v1 vs prompt-v2.
Show quality improved but latency/cost changed.
```

This is the fourth major product proof point.

---

## Phase 11: CI quality gate

### Goal

Make RAG quality part of the engineering workflow.

### Build

```text
- threshold presets
- deterministic CI eval
- GitHub Actions quality workflow
- JSON/Markdown eval reports
- artefact upload
- optional /api/v1/ci/evaluate endpoint
```

### Acceptance criteria

```text
- CI starts services
- migrations run
- sample docs seed
- eval dataset seeds
- deterministic eval runs
- CI fails if thresholds are missed
- report is uploaded
```

### Demo

```text
Show a CI workflow that fails when citation validity or hit@5 drops below threshold.
```

This is the production-style engineering proof point.

---

## Phase 12: Hardening

### Goal

Improve reliability, cost control, and operational safety.

### Build

```text
- request IDs
- structured logs
- provider timeouts
- provider retry policy
- rate limit handling
- eval run partial failure handling
- max cases per eval run
- cost tracking
- controlled concurrency, later
- resumable eval runs, later
```

### Acceptance criteria

```text
- provider errors are classified
- no secrets are logged
- partial eval results survive failures
- costs are visible per query and run
- latency is visible per query and run
```

### Demo

```text
Simulate provider failure -> show structured error and partial eval result.
```

---

## Phase 13: Portfolio/demo packaging

### Goal

Make the project understandable and impressive without needing a verbal explanation.

### Build

```text
README.md
docs/demo-script.md
docs/screenshots/
docs/architecture/system-overview.md
docs/evaluation/evaluation-methodology.md
docs/decisions/
```

### Required screenshots

```text
- Documents page
- Query trace detail
- Eval run detail
- Failed case detail
- Run comparison detail
```

### README must explain

```text
- what RAGLens is
- what problem it solves
- architecture
- tech stack
- local setup
- sample demo flow
- evaluation methodology
- known limitations
- roadmap
```

### Acceptance criteria

```text
- fresh clone setup works
- demo script works
- screenshots match current UI
- known limitations are documented
- no secrets committed
```

---

# 6. Final MVP scope

## MVP includes

```text
- monorepo
- Docker Compose
- PostgreSQL + pgvector
- TypeScript Fastify rag-api
- Python FastAPI eval-api
- Next.js dashboard
- markdown/text ingestion
- sample company knowledge base
- chunking
- embeddings
- vector retrieval
- answer generation
- structured citations
- query traces
- golden eval datasets
- eval runner
- deterministic retrieval/citation metrics
- LLM-as-judge scoring
- eval run dashboard
- failed case detail
```

## MVP excludes

```text
- PDF OCR
- agents
- fine-tuning
- auth
- multi-tenancy
- enterprise RBAC
- Kubernetes
- public web crawling
- advanced ingestion
- human review
- multiple providers
```

## MVP success criteria

```text
- Can ingest sample company documents.
- Can ask a question and receive a cited answer.
- Can open query trace and inspect retrieved chunks.
- Can run golden eval dataset.
- Can see retrieval/citation/judge scores.
- Can inspect a failed case.
- Can explain why the answer failed.
```

---

# 7. Final post-MVP scope

## Post-MVP 1: Run comparison

```text
Compare prompt/config/model changes.
```

## Post-MVP 2: CI quality gate

```text
Fail PRs or reports when RAG quality regresses.
```

## Post-MVP 3: Hybrid retrieval

```text
Add keyword + vector retrieval and compare results.
```

## Post-MVP 4: Reranking

```text
Add reranker and persist rerank scores.
```

## Post-MVP 5: Provider expansion

```text
Add Anthropic, OpenRouter, Ollama/local model support.
```

## Post-MVP 6: Better ingestion

```text
DOCX, HTML, PDF text extraction, async ingestion.
```

## Post-MVP 7: Human review

```text
Manual override and judge calibration.
```

---

# 8. Final implementation order

Use this exact order for the build.

```text
1. Create repo structure
2. Add Docker Compose
3. Add Postgres + pgvector
4. Add migrations
5. Add rag-api skeleton
6. Add eval-api skeleton
7. Add dashboard skeleton
8. Add health endpoints
9. Add sample documents
10. Add sample eval dataset
11. Add document ingestion
12. Add chunking
13. Add document/chunk APIs
14. Add embeddings
15. Add vector retrieval
16. Add RAG configs
17. Add answer generation
18. Add structured citations
19. Add query traces
20. Add query trace APIs
21. Add dashboard trace views
22. Add eval datasets
23. Add test cases
24. Add eval runner
25. Add deterministic scoring
26. Add verdict/failure classification
27. Add LLM judge
28. Add dashboard eval run views
29. Add failed case detail
30. Add run comparison
31. Add deterministic CI quality gate
32. Add release docs and screenshots
```

---

# 9. Final engineering epics

## Epic 1: Foundation

```text
Goal:
  Boot the full system locally.

Output:
  Docker Compose, migrations, health checks, dashboard shell.
```

## Epic 2: Corpus and seed data

```text
Goal:
  Provide realistic sample docs and eval dataset.

Output:
  sample-company-knowledge-base and company-kb-eval-v1.
```

## Epic 3: RAG ingestion

```text
Goal:
  Store documents and chunks.

Output:
  document ingestion and chunk inspection.
```

## Epic 4: Retrieval and generation

```text
Goal:
  Answer questions with citations.

Output:
  POST /query.
```

## Epic 5: Traceability

```text
Goal:
  Make answers inspectable.

Output:
  query trace model and dashboard trace page.
```

## Epic 6: Evaluation

```text
Goal:
  Run golden datasets against rag-api.

Output:
  eval runner and case results.
```

## Epic 7: Scoring

```text
Goal:
  Calculate quality metrics and verdicts.

Output:
  retrieval/citation metrics, judge scores, failure types.
```

## Epic 8: Dashboard

```text
Goal:
  Explain documents, traces, eval runs, and failures.

Output:
  inspection-first dashboard.
```

## Epic 9: Comparison

```text
Goal:
  Measure change impact.

Output:
  run comparison.
```

## Epic 10: CI quality gate

```text
Goal:
  Prevent quality regressions.

Output:
  deterministic eval gate in GitHub Actions.
```

## Epic 11: Hardening

```text
Goal:
  Improve reliability and operability.

Output:
  structured logs, request IDs, timeouts, partial failure handling.
```

---

# 10. Final team-style responsibilities

If this were a company team:

## Product manager

Owns:

```text
- problem statement
- user stories
- MVP scope
- success metrics
- release priorities
```

## Tech lead

Owns:

```text
- architecture
- service boundaries
- technical decisions
- delivery sequencing
- code review standards
```

## Backend engineer

Owns:

```text
- rag-api
- eval-api
- database
- API contracts
```

## AI engineer

Owns:

```text
- retrieval methodology
- prompt design
- eval methodology
- metrics
- judge prompts
- quality gates
```

## Frontend engineer

Owns:

```text
- dashboard
- trace detail UX
- failed case detail UX
- comparison views
```

## Platform engineer

Owns:

```text
- Docker
- CI/CD
- secrets
- deployment
- observability
```

For a solo build, you wear all hats, but keep the same separation in the repo and docs.

---

# 11. Final delivery milestones

## Milestone 1: Local foundation

```text
All services boot.
```

## Milestone 2: Documents indexed

```text
Sample docs are ingested and chunked.
```

## Milestone 3: First cited answer

```text
A query returns an answer with citations.
```

## Milestone 4: First trace

```text
The answer can be inspected through a trace.
```

## Milestone 5: First eval run

```text
Golden test cases run against rag-api.
```

## Milestone 6: First scored eval

```text
Retrieval and citation metrics produce pass/fail results.
```

## Milestone 7: First judged eval

```text
LLM judge scores groundedness, correctness, completeness, citation support.
```

## Milestone 8: First failed case diagnosis

```text
Dashboard explains why a case failed.
```

## Milestone 9: First run comparison

```text
Two configs are compared with improved/regressed cases.
```

## Milestone 10: First CI quality gate

```text
CI fails when quality thresholds are missed.
```

---

# 12. Final demo flow

This is the final company-style demo path.

```text
1. Open dashboard overview.
2. Show indexed company knowledge base.
3. Open Remote Work Policy v2.
4. Show chunks and metadata.
5. Ask “What is the remote work approval process?”
6. Show cited answer.
7. Open query trace.
8. Show retrieved chunks, scores, citations, model, cost, latency.
9. Open Eval Runs.
10. Show Company KB Eval v1.
11. Open latest eval run.
12. Show pass rate, hit@5, citation validity, groundedness, cost, latency.
13. Filter failed cases.
14. Open a failed no-answer case.
15. Show expected vs generated answer.
16. Show unsupported claim.
17. Show citation/judge scores.
18. Open run comparison.
19. Show baseline vs candidate quality delta.
20. Explain how CI would block a regression.
```

This demo tells the whole product story.

---

# 13. Final production-style checklist

Before calling the project “production-style”, it should have:

```text
- clear README
- Docker Compose setup
- database migrations
- seeded sample data
- health checks
- request validation
- structured errors
- trace IDs
- query traces
- provider abstraction
- deterministic metrics
- LLM judge scoring
- failed case analysis
- run comparison
- tests
- CI
- known limitations
```

Before calling it “production-ready”, it would additionally need:

```text
- auth
- workspace isolation
- document permissions
- proper secrets management
- hosted deployment
- rate limiting
- stronger observability
- backup/restore
- data retention policy
- human review workflow
- provider cost controls
- security review
```

For portfolio purposes, call it:

```text
production-style
```

not:

```text
fully production-ready
```

unless those extra pieces are actually built.

---

# 14. Final delivery statement

Use this as the final project delivery framing:

```text
RAGLens will be delivered as a production-style RAG evaluation platform. The first release will focus on a controlled internal company knowledge base, a TypeScript RAG API, a Python evaluation API, PostgreSQL/pgvector storage, and a Next.js inspection dashboard. The core product loop is document ingestion, source-grounded answering, query tracing, golden dataset evaluation, deterministic scoring, LLM-as-judge scoring, failed-case analysis, and run comparison. Post-MVP releases will add CI quality gates, hybrid retrieval, reranking, provider comparison, better ingestion, and human review.
```

The build should stay focused on the critical path:

```text
documents
  -> chunks
  -> embeddings
  -> retrieval
  -> answer
  -> citations
  -> trace
  -> eval
  -> scores
  -> failed-case analysis
  -> comparison
  -> quality gate
```

That is the complete company-style delivery plan.
