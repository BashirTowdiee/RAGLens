---
title: "Development Process"
description: "Development process, workflow, and team practices for RAGLens."
order: 15
section: "Delivery"
status: "stable"
---
# Development Process: RAGLens

## 1. Development process objective

The development process should make RAGLens feel like a real company project, not a weekend prototype.

The process should enforce:

```text
- clear phases
- small deliverable milestones
- strict service boundaries
- testable slices
- documented decisions
- working software at each stage
- no premature over-engineering
```

The build should follow this principle:

```text
Every phase should produce something runnable, testable, and demoable.
```

---

# 2. Delivery model

Use an iterative delivery model.

Each phase should include:

```text
1. Scope definition
2. Technical design notes
3. Implementation
4. Tests
5. Documentation
6. Demo checkpoint
7. Review
8. Merge
```

Avoid long-running feature branches that touch everything.

Prefer small vertical slices:

```text
Bad:
  Build the whole RAG service.

Good:
  Add document ingestion endpoint with chunk persistence and route tests.
```

---

# 3. Engineering workflow

## Standard workflow

```text
1. Pick one roadmap phase.
2. Break it into small tickets.
3. Define acceptance criteria.
4. Implement one ticket at a time.
5. Add tests.
6. Run local checks.
7. Update docs if behaviour changed.
8. Review against acceptance criteria.
9. Commit.
10. Move to next ticket.
```

## Branch strategy

Use simple feature branches:

```text
main
feature/phase-01-foundation
feature/phase-02-doc-ingestion
feature/phase-03-query-traces
```

For solo development, you can also use shorter branches:

```text
feat/rag-document-ingestion
feat/eval-runner
feat/query-trace-detail
```

## Commit style

Use conventional commits:

```text
feat(rag-api): add document ingestion endpoint
feat(eval-api): add dataset creation route
test(eval-api): cover retrieval metric scoring
docs: add evaluation methodology
chore(infra): add pgvector docker compose service
```

---

# 4. Definition of ready

A ticket is ready to start when it has:

```text
- clear purpose
- target service
- endpoint/module affected
- acceptance criteria
- data model impact
- test expectations
- non-goals
```

Example:

```text
Ticket:
Implement document ingestion endpoint

Service:
rag-api

Acceptance criteria:
- POST /api/v1/documents/ingest accepts title, content, documentType, metadata
- validates request body
- creates document row
- chunks document content
- stores chunks
- returns document ID and chunk count
- rejects empty content

Tests:
- valid document creates document and chunks
- empty content returns 400
- unsupported type returns 400

Non-goals:
- no embeddings yet
- no async job queue
- no PDF support
```

---

# 5. Definition of done

A ticket is done when:

```text
- implementation is complete
- route/service/domain tests pass
- database migration included if needed
- API contract updated if needed
- error cases handled
- local checks pass
- docs updated if behaviour changed
- demo path still works
```

Minimum checks:

```text
- lint
- typecheck
- unit tests
- integration tests for touched APIs
- Docker Compose smoke test for major milestones
```

---

# 6. Repository structure

Recommended structure:

```text
raglens/
  apps/
    rag-api/
    eval-api/
    dashboard/

  packages/
    contracts/
      openapi/
    docs/

  infra/
    docker-compose.yml
    migrations/
    seed/

  docs/
    product/
    architecture/
    evaluation/
    decisions/

  .github/
    workflows/
```

## Service ownership

```text
apps/rag-api:
  TypeScript RAG service

apps/eval-api:
  Python evaluation service

apps/dashboard:
  Next.js dashboard

infra/migrations:
  shared SQL migrations

infra/seed:
  sample company documents and eval dataset

docs/decisions:
  ADRs
```

---

# 7. Phase-based development process

## Phase 0: Planning and repo foundation

### Goal

Create the repo, docs, and local infrastructure skeleton.

### Tickets

```text
- Create monorepo structure
- Add Docker Compose with Postgres + pgvector
- Add SQL migration runner
- Add rag-api Fastify skeleton
- Add eval-api FastAPI skeleton
- Add dashboard Next.js skeleton
- Add health endpoints
- Add README local setup
```

### Acceptance criteria

```text
- docker compose up starts all services
- rag-api /health works
- eval-api /health works
- dashboard loads
- migrations create rag and eval schemas
```

### Review checklist

```text
- local setup is documented
- no secrets committed
- service ports are consistent
- env variables documented
```

---

## Phase 1: Data model and migrations

### Goal

Create the database foundation.

### Tickets

```text
- Add pgvector and pgcrypto extensions
- Add rag.documents table
- Add rag.document_chunks table
- Add rag.rag_configs table
- Add rag.query_traces tables
- Add eval.datasets table
- Add eval.test_cases table
- Add eval.eval_runs tables
- Add indexes
```

### Acceptance criteria

```text
- migrations run from clean database
- schemas are created
- tables match data design
- rollback strategy documented, even if manual for MVP
```

### Tests

```text
- migration smoke test in CI
- simple DB connection test per service
```

---

## Phase 2: Sample corpus and seed scripts

### Goal

Create realistic sample data.

### Tickets

```text
- Write sample company policy documents
- Write engineering runbook documents
- Write support process documents
- Create company-kb-eval-v1 dataset JSON
- Add seed script for documents
- Add seed script for eval dataset
```

### Acceptance criteria

```text
- at least 8 to 10 documents exist
- at least 20 golden test cases exist
- test cases include expected answers and expected sources
- no-answer cases are included
- seed script can be run repeatedly in local dev
```

### Review checklist

```text
- documents are realistic
- expected sources are unambiguous
- test cases cover factual, comparison, temporal, multi-hop, no-answer, citation-sensitive
```

---

## Phase 3: rag-api document ingestion

### Goal

Allow documents to be ingested and chunked.

### Tickets

```text
- Add document schemas with Zod
- Add document repository
- Add document service
- Add text/markdown chunker
- Add POST /documents/ingest
- Add GET /documents
- Add GET /documents/:id
- Add GET /documents/:id/chunks
```

### Acceptance criteria

```text
- valid document can be ingested
- document row is stored
- chunks are stored
- empty document returns 400
- unsupported document type returns 400
- document list shows chunk count
```

### Tests

```text
- chunker unit tests
- document service tests
- ingestion route tests
- list/detail route tests
```

### Non-goals

```text
- no embeddings yet
- no async ingestion
- no PDF support
```

---

## Phase 4: Embeddings and retrieval

### Goal

Make chunks searchable.

### Tickets

```text
- Add embedding provider interface
- Add OpenAI embedding provider
- Add mock embedding provider for tests
- Store embeddings in pgvector
- Add vector retriever
- Seed default RAG config
- Add GET /rag-configs
```

### Acceptance criteria

```text
- ingested chunks receive embeddings
- vector retriever returns top K chunks
- retrieval includes rank and score
- tests do not depend on live provider calls
```

### Tests

```text
- embedding provider mock tests
- vector retriever tests
- topK behaviour tests
- missing embedding handling
```

### Non-goals

```text
- no hybrid retrieval
- no reranking
```

---

## Phase 5: Query generation and citations

### Goal

Return source-grounded answers.

### Tickets

```text
- Add chat provider interface
- Add OpenAI chat provider
- Add answer prompt builder
- Add citation schema
- Add citation parser/validator
- Add POST /query
- Add insufficient-evidence response behaviour
```

### Acceptance criteria

```text
- POST /query accepts question
- retrieves relevant chunks
- generates answer
- returns structured citations
- returns usage and latency
- handles no-context case
```

### Tests

```text
- prompt builder tests
- citation parser tests
- query route validation tests
- provider failure tests with mocks
```

### Review checklist

```text
- answer prompt instructs model to use context only
- citations reference known chunks
- provider raw errors are not leaked directly
```

---

## Phase 6: Query tracing

### Goal

Persist every query as inspectable trace data.

### Tickets

```text
- Add trace repository
- Persist query trace
- Persist retrieved chunks
- Persist citations
- Persist provider call metadata
- Add GET /queries
- Add GET /queries/:traceId
```

### Acceptance criteria

```text
- every query returns traceId
- trace includes question, answer, config, model, provider, cost, latency
- trace includes retrieved chunks and scores
- trace includes citations
- trace detail endpoint supports dashboard view
```

### Tests

```text
- successful query creates trace
- failed query creates structured error and provider call record where applicable
- trace detail returns chunks and citations
```

### Gate

Do not start eval runner until this phase is done.

---

## Phase 7: eval-api datasets and test cases

### Goal

Create golden evaluation datasets.

### Tickets

```text
- Add dataset Pydantic schemas
- Add dataset repository
- Add dataset routes
- Add test case repository
- Add test case routes
- Add no-answer test support
- Add seed loader for dataset JSON
```

### Acceptance criteria

```text
- dataset can be created/listed/fetched
- test cases can be created/listed/fetched
- expected sources are stored
- no-answer test cases are valid
```

### Tests

```text
- dataset create/list/detail
- duplicate dataset conflict
- test case create/list/detail
- invalid test case type rejected
```

---

## Phase 8: Eval runner

### Goal

Run test cases against rag-api.

### Tickets

```text
- Add rag-api Python client
- Add eval run model/routes
- Add eval case result model
- Add sequential runner
- Fetch trace after each query
- Store raw result
- Track run status and progress
```

### Acceptance criteria

```text
- POST /eval-runs starts run
- eval-api calls rag-api /query for each test case
- traceId is stored
- answer, latency, cost are stored
- partial failures do not erase completed results
```

### Tests

```text
- runner with mocked rag-api client
- success case persists result
- rag-api failure persists error result
- status transitions are correct
```

### Non-goals

```text
- no parallel execution yet
- no retries yet
```

---

## Phase 9: Deterministic scoring

### Goal

Score retrieval and citations without LLM judge.

### Tickets

```text
- Implement hit@k
- Implement recall@k
- Implement expectedSourceRank
- Implement citationPresent
- Implement citationValidity
- Implement citationTraceability
- Implement verdict calculation
- Implement failure type classification
```

### Acceptance criteria

```text
- eval case results include retrievalScores
- eval case results include citationScores
- verdict is calculated
- failureType is set for common failures
- run summary aggregates scores
```

### Tests

```text
- retrieval hit/miss cases
- multi-source recall cases
- citation valid/invalid cases
- citation traceability cases
- verdict threshold cases
```

---

## Phase 10: LLM-as-judge scoring

### Goal

Add qualitative scoring.

### Tickets

```text
- Add judge provider interface
- Add OpenAI judge provider
- Add judge prompt v1
- Add structured JSON parser
- Add judge score storage
- Add unsupportedClaims and missingImportantPoints
- Add judge error handling
```

### Acceptance criteria

```text
- judge can be enabled per eval run
- groundedness/correctness/completeness/citationSupport are stored
- no-answer cases include refusalQuality
- malformed judge output is handled safely
- failed case includes judge explanation
```

### Tests

```text
- valid judge JSON parsed
- malformed JSON handled
- no-answer scoring path
- unsupported claims produce fail where threshold requires
```

---

## Phase 11: Dashboard MVP

### Goal

Make the product inspectable.

### Tickets

```text
- App shell and sidebar
- Documents list/detail
- Query trace list/detail
- Dataset list/detail
- Eval run list/detail
- Failed case detail
- Comparison placeholder/detail later
```

### Acceptance criteria

```text
- user can inspect indexed documents
- user can inspect query traces
- user can inspect eval run summary
- user can open failed case detail
- failed case shows expected vs generated answer
- failed case shows expected vs retrieved sources
- failed case shows citation and judge scores
```

### Testing

```text
- component tests for key states
- mocked API data
- loading/empty/error states
```

### UX priority

Build these first:

```text
1. Query Trace Detail
2. Eval Run Detail
3. Failed Case Detail
```

---

## Phase 12: Run comparison

### Goal

Compare changes across eval runs.

### Tickets

```text
- Add comparison service
- Add POST /comparisons
- Add GET /comparisons/:id
- Calculate metric deltas
- Classify improved/regressed cases
- Add dashboard comparison detail page
```

### Acceptance criteria

```text
- baseline and candidate runs can be compared
- metric deltas are shown
- improved cases are shown
- regressed cases are shown
- cost/latency trade-off is visible
```

### Tests

```text
- fail -> pass is improvement
- pass -> fail is regression
- score deltas are calculated
- mismatched datasets handled
```

---

## Phase 13: CI quality gate

### Goal

Run evals in CI.

### Tickets

```text
- Add quality threshold presets
- Add POST /ci/evaluate
- Add CI gate result storage
- Add GitHub Actions workflow
- Add deterministic-only CI mode
- Add eval report artefact
```

### Acceptance criteria

```text
- CI starts services
- migrations run
- sample docs seeded
- eval dataset seeded
- eval run executes
- CI fails if thresholds fail
- report is printed or uploaded
```

### First version

Use deterministic metrics only in CI to avoid flaky provider costs.

Then add optional LLM judge CI.

---

## Phase 14: Hardening and reliability

### Goal

Improve production readiness.

### Tickets

```text
- Add request IDs
- Add structured logs
- Add provider timeouts
- Add provider retry policy
- Add eval run partial failure handling
- Add retry failed cases, post-MVP
- Add controlled concurrency, post-MVP
- Add cost limits
```

### Acceptance criteria

```text
- provider timeouts do not crash services
- errors are structured
- partial eval results remain visible
- logs include requestId/evalRunId/traceId
```

---

# 8. Ticket breakdown format

Use this format for every ticket.

```text
Title:
  Implement retrieval hit@k scoring

Service:
  eval-api

Context:
  Eval results need deterministic retrieval metrics to identify whether expected sources were retrieved.

Scope:
  - implement hit@k
  - support configurable k
  - use expectedSources and trace retrievedChunks

Acceptance criteria:
  - returns true when expected source appears in top K
  - returns false when source is missing
  - handles no expected sources safely
  - covered by unit tests

Non-goals:
  - no LLM judge scoring
  - no context precision

Tests:
  - expected source rank 1 -> hit@5 true
  - expected source rank 6 -> hit@5 false
  - no expected sources -> not applicable
```

---

# 9. Code review checklist

Use this for every PR or staged commit.

## General

```text
- Does the change match the ticket scope?
- Are non-goals respected?
- Are errors handled explicitly?
- Are tests included?
- Are docs/contracts updated?
- Does local build pass?
```

## rag-api

```text
- Zod validation on route inputs
- service logic not in route handlers
- provider calls abstracted
- no API keys logged
- trace data persisted where needed
- database writes are transactional where needed
```

## eval-api

```text
- Pydantic validation on inputs
- rag-api client is abstracted/mocked in tests
- scoring logic is deterministic and unit tested
- malformed judge output handled
- partial eval failure does not corrupt run
```

## dashboard

```text
- loading, empty, and error states included
- no direct assumptions about missing fields
- data tables handle empty arrays
- failed cases are easy to inspect
```

## database

```text
- migration is additive where possible
- indexes added where query patterns require them
- JSONB shapes documented
- cross-schema coupling is intentional
```

---

# 10. Testing strategy

## Test pyramid

```text
Most:
  unit tests for chunking, scoring, citation parsing, prompt building

Some:
  integration tests for API routes and repositories

Few:
  end-to-end tests for full RAG/eval flow
```

---

## rag-api tests

### Unit tests

```text
- chunker
- prompt builder
- citation parser
- citation validator
- cost estimator
```

### Integration tests

```text
- document ingestion route
- query route with mocked providers
- trace fetch route
```

### Provider tests

```text
- provider adapters are tested with mocks
- no live provider calls in CI by default
```

---

## eval-api tests

### Unit tests

```text
- hit@k
- recall@k
- expectedSourceRank
- citationValidity
- citationTraceability
- verdict calculation
- failure type classification
- judge output parser
```

### Integration tests

```text
- dataset routes
- test case routes
- eval run route with mocked rag-api client
- comparison route
```

---

## dashboard tests

```text
- renders trace detail
- renders eval run detail
- renders failed case detail
- handles loading state
- handles empty state
- handles error state
```

---

## End-to-end smoke test

Post-MVP:

```text
1. Start services.
2. Seed docs.
3. Run one query.
4. Confirm trace exists.
5. Seed dataset.
6. Run eval.
7. Confirm results exist.
```

---

# 11. CI process

## Basic CI

Run on every PR:

```text
- install dependencies
- lint
- typecheck
- unit tests
- API integration tests with mocked providers
- dashboard build
- migration smoke test
```

## RAG quality CI, post-MVP

Run on selected branches or manually first:

```text
- start postgres, rag-api, eval-api
- run migrations
- seed sample docs
- seed eval dataset
- run deterministic eval
- fail if thresholds are not met
```

Avoid full LLM judge in early CI unless cost/flakiness is controlled.

---

# 12. Environment process

## Local

```text
docker compose up
```

Local env:

```text
.env
.env.example
```

Required variables:

```text
OPENAI_API_KEY
DATABASE_URL
RAG_API_BASE_URL
NEXT_PUBLIC_RAG_API_URL
NEXT_PUBLIC_EVAL_API_URL
```

## Test

Use separate test database or transaction rollback.

Recommended:

```text
DATABASE_URL_TEST
```

## CI

Use mocked providers by default.

For real provider evals, use explicit workflow dispatch or nightly run.

---

# 13. Documentation process

Every major phase should update docs.

## Required docs

```text
README.md
docs/product/product-brief.md
docs/architecture/system-overview.md
docs/architecture/data-model.md
docs/api/openapi.md
docs/evaluation/methodology.md
docs/decisions/
docs/demo-script.md
```

## ADR process

Create an ADR when deciding:

```text
- language/framework
- database choice
- service boundary
- eval methodology
- provider strategy
- retrieval strategy
```

ADR format:

```text
Title
Status
Context
Decision
Options considered
Consequences
Implementation notes
```

---

# 14. Release process

## Internal alpha

Includes:

```text
- document ingestion
- query
- citations
- traces
```

Release criteria:

```text
- can run locally
- can ask one question
- can inspect trace
```

## Internal beta

Includes:

```text
- datasets
- eval runs
- deterministic scoring
- dashboard
```

Release criteria:

```text
- can run 20 test cases
- can inspect failed case
```

## Portfolio demo release

Includes:

```text
- LLM judge
- run comparison
- screenshots
- README
- demo script
```

Release criteria:

```text
- reviewer can understand project in under 5 minutes
- demo flow works from fresh setup
```

## Production-style release

Includes:

```text
- CI quality gate
- hardening
- provider timeouts
- structured logs
- cost tracking
```

---

# 15. Backlog management

Organise backlog into epics:

```text
Epic 1: Foundation
Epic 2: Data model
Epic 3: RAG ingestion
Epic 4: Retrieval and generation
Epic 5: Query traces
Epic 6: Evaluation datasets
Epic 7: Eval runner
Epic 8: Scoring
Epic 9: Dashboard
Epic 10: Run comparison
Epic 11: CI quality gate
Epic 12: Hardening
Epic 13: Advanced retrieval
```

Each epic should have:

```text
- goal
- scope
- acceptance criteria
- non-goals
- demo checkpoint
```

---

# 16. Development guardrails

## Do not start with

```text
- agents
- fine-tuning
- PDF OCR
- Kubernetes
- multi-tenancy
- auth system
- complex queues
- public web crawling
- advanced charts
```

## Start with

```text
- markdown/text docs
- vector retrieval
- query traces
- eval runs
- deterministic metrics
- failed case inspection
```

## Escalate only when needed

Add complexity only when a working feature needs it.

Examples:

```text
Add async ingestion after synchronous ingestion becomes limiting.

Add controlled concurrency after sequential eval runs are too slow.

Add hybrid retrieval after vector retrieval baseline is measurable.

Add CI quality gate after eval scoring is stable.
```

---

# 17. Quality bar

The project should optimise for:

```text
- clarity
- reproducibility
- traceability
- testability
- realistic service boundaries
```

Not:

```text
- maximum feature count
- flashy UI
- framework-heavy abstraction
- huge dataset scale
```

## Minimum quality bar per service

### rag-api

```text
- typed route schemas
- provider abstraction
- route tests
- trace persistence
- no secrets logged
```

### eval-api

```text
- Pydantic schemas
- scoring unit tests
- mocked rag-api client tests
- judge JSON validation
- partial failure handling
```

### dashboard

```text
- useful detail screens
- robust empty/error states
- direct links between eval result and trace
```

---

# 18. Demo-driven development checkpoints

After each major phase, run a demo.

## Demo 1: Services boot

```text
docker compose up
health checks pass
```

## Demo 2: Documents indexed

```text
seed docs
open documents list
inspect chunks
```

## Demo 3: First answer

```text
ask question
get cited answer
```

## Demo 4: Trace inspection

```text
open trace
show retrieved chunks and citations
```

## Demo 5: First eval

```text
run dataset
store case results
```

## Demo 6: Scored eval

```text
show hit@5, citation validity, verdicts
```

## Demo 7: Failed case analysis

```text
open failed case
explain why it failed
```

## Demo 8: Run comparison

```text
compare baseline vs candidate
show improvements/regressions
```

## Demo 9: CI gate

```text
show PR/check failing on quality threshold
```

---

# 19. Suggested first sprint

## Sprint goal

Get the foundation running locally.

## Tickets

```text
1. Create monorepo structure
2. Add Docker Compose with Postgres + pgvector
3. Add SQL migration runner
4. Add rag-api Fastify health endpoint
5. Add eval-api FastAPI health endpoint
6. Add dashboard app shell
7. Add .env.example
8. Add README local setup
```

## Exit criteria

```text
- one command starts the system
- both APIs are healthy
- dashboard loads
- database schemas exist
```

---

# 20. Suggested second sprint

## Sprint goal

Index sample documents.

## Tickets

```text
1. Add sample company docs
2. Add rag.documents migration
3. Add rag.document_chunks migration
4. Add chunker
5. Add document ingestion endpoint
6. Add document list/detail endpoints
7. Add document ingestion tests
8. Add seed script
```

## Exit criteria

```text
- sample docs can be seeded
- documents and chunks are visible through API
```

---

# 21. Suggested third sprint

## Sprint goal

Ask questions and store traces.

## Tickets

```text
1. Add embedding provider interface
2. Add OpenAI embedding provider
3. Add vector retriever
4. Add chat provider interface
5. Add answer prompt
6. Add POST /query
7. Add citation output
8. Add trace persistence
9. Add GET /queries/:traceId
```

## Exit criteria

```text
- user can ask a question
- response has citations and traceId
- trace shows retrieved chunks
```

---

# 22. Suggested fourth sprint

## Sprint goal

Run evaluations.

## Tickets

```text
1. Add eval datasets
2. Add test cases
3. Add rag-api client in eval-api
4. Add eval run model
5. Add sequential runner
6. Store eval case results
7. Add deterministic scoring
8. Add run summary
```

## Exit criteria

```text
- 20 test cases can run against rag-api
- results include scores and verdicts
```

---

# 23. Final development process summary

Build RAGLens like a company would:

```text
1. Define product and architecture.
2. Build foundation.
3. Create controlled sample data.
4. Build RAG API.
5. Make every answer traceable.
6. Build evaluation service.
7. Add deterministic scoring.
8. Add LLM judge.
9. Build dashboard around traces and failed cases.
10. Add comparison.
11. Add CI quality gate.
12. Harden.
```

The critical path is:

```text
documents
  -> chunks
  -> embeddings
  -> retrieval
  -> answer
  -> citations
  -> trace
  -> eval run
  -> scores
  -> failed case analysis
```

Anything outside that path should wait.
