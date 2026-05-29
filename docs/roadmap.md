---
title: "Roadmap"
description: "Delivery roadmap and phased milestones for RAGLens."
order: 13
section: "Delivery"
status: "stable"
---
# Roadmap: RAGLens

## Roadmap objective

Build RAGLens in stages so each phase produces a usable, demoable system.

The goal is not to build everything at once. The goal is to progress from:

```text
local foundation
  -> working RAG API
  -> traceable answers
  -> evaluation service
  -> scoring
  -> dashboard
  -> regression comparison
  -> CI quality gate
  -> production hardening
```

Core rule:

```text
Do not add advanced retrieval, PDF parsing, or CI gates until the basic RAG -> trace -> eval -> failure inspection loop works.
```

---

# Roadmap overview

## Phase 0: Product and technical foundation

Goal:

```text
Define the product, architecture, data model, API contracts, and local development setup.
```

Deliverables:

```text
- product discovery
- product requirements
- product design
- UX/dashboard design
- architecture plan
- technical design decisions
- data design
- API plan
- evaluation methodology
- monorepo structure
- Docker Compose
- database migrations
```

Exit criteria:

```text
- clear MVP scope
- clear non-goals
- clear service boundaries
- local services can boot
```

---

## Phase 1: Monorepo and local infrastructure

Goal:

```text
Create the technical base for all services.
```

Scope:

```text
apps/
  rag-api/
  eval-api/
  dashboard/

infra/
  docker-compose.yml
  migrations/
  seed/
```

Build:

```text
- TypeScript Fastify rag-api skeleton
- Python FastAPI eval-api skeleton
- Next.js dashboard skeleton
- PostgreSQL + pgvector
- SQL migrations
- shared .env.example
- health endpoints
- basic CI for lint/test/build
```

Endpoints:

```text
rag-api:
  GET /api/v1/health

eval-api:
  GET /api/v1/health
```

Acceptance criteria:

```text
- docker compose up starts postgres, rag-api, eval-api, dashboard
- both APIs return healthy status
- migrations create rag and eval schemas
- README documents local setup
```

Risks:

```text
- cross-language setup becomes fiddly
- Docker config consumes too much time
```

Mitigation:

```text
Keep the first service skeletons minimal.
Do not add business logic yet.
```

---

# Phase 2: Sample corpus and seed data

Goal:

```text
Create a controlled internal company knowledge base for RAG and evaluation.
```

Build sample documents:

```text
infra/seed/documents/
  policies/
    remote-work-policy-v1.md
    remote-work-policy-v2.md
    expense-policy.md
    onboarding-policy.md

  engineering/
    mobile-release-process.md
    incident-response-runbook.md
    api-integration-guide.md
    architecture-decision-records.md

  support/
    refund-policy.md
    escalation-process.md
    known-issues.md
```

Each document should include enough detail to test:

```text
- factual questions
- comparison questions
- temporal/versioned questions
- multi-hop questions
- no-answer questions
- citation-sensitive questions
```

Also create:

```text
infra/seed/datasets/company-kb-eval-v1.json
```

Initial dataset size:

```text
20 to 30 test cases
```

Acceptance criteria:

```text
- sample documents are realistic enough for demos
- dataset has expected answers and expected sources
- source references are stable across environments
- no-answer test cases are included
```

Risks:

```text
- synthetic data feels too shallow
```

Mitigation:

```text
Write documents like real internal docs: policies, runbooks, escalation paths, release process notes.
```

---

# Phase 3: RAG API document ingestion

Goal:

```text
Allow rag-api to ingest markdown/text documents and store chunks.
```

Build:

```text
- document model
- chunk model
- ingestion endpoint
- text normalisation
- markdown/text chunker
- token counting approximation
- document status
- document list/detail endpoints
- chunk list/detail endpoints
```

Endpoints:

```text
POST /api/v1/documents/ingest
GET  /api/v1/documents
GET  /api/v1/documents/:documentId
GET  /api/v1/documents/:documentId/chunks
GET  /api/v1/documents/:documentId/chunks/:chunkId
```

Database:

```text
rag.documents
rag.document_chunks
```

Acceptance criteria:

```text
- user can ingest a markdown document
- document is stored
- chunks are created
- chunks can be listed
- invalid/empty documents are rejected
- document status is visible
```

Tests:

```text
- valid document ingestion
- empty document rejection
- unsupported document type rejection
- chunking preserves document/chunk metadata
```

Do not build yet:

```text
- PDF parsing
- async ingestion
- OCR
- re-index workflow
```

---

# Phase 4: Embeddings and vector retrieval

Goal:

```text
Make ingested chunks searchable with vector retrieval.
```

Build:

```text
- OpenAI embedding provider
- embedding service
- pgvector storage
- vector retrieval query
- default RAG config
- retrieval service abstraction
```

Database:

```text
rag.document_chunks.embedding
rag.rag_configs
rag.provider_calls, optional but recommended
```

Endpoints:

```text
GET /api/v1/rag-configs
```

Internal interfaces:

```text
EmbeddingProvider
Retriever
VectorRetriever
```

Acceptance criteria:

```text
- chunks receive embeddings
- a query can retrieve top K relevant chunks
- retrieval returns rank and score
- default RAG config is seeded
```

Tests:

```text
- embedding provider can be mocked
- vector retriever returns ranked chunks
- retrieval respects topK
- missing embeddings are handled safely
```

Risks:

```text
- provider costs during tests
```

Mitigation:

```text
Use mocked provider tests.
Only use real provider in local/manual integration.
```

---

# Phase 5: RAG query and cited answer generation

Goal:

```text
Ask questions over indexed documents and return source-grounded answers with citations.
```

Build:

```text
- query endpoint
- answer prompt builder
- OpenAI chat provider
- context packing
- structured citation output
- insufficient-evidence response
- basic citation validation
```

Endpoint:

```text
POST /api/v1/query
```

Response must include:

```text
- answer
- citations
- traceId
- usage
- latencyMs
```

Acceptance criteria:

```text
- user can ask a question
- system retrieves chunks
- system generates answer from context
- response includes structured citations
- response includes traceId
- no-context questions produce insufficient-evidence response
```

Tests:

```text
- prompt builder includes retrieved context
- citations map to known chunks
- query route validates input
- provider failure returns structured error
```

Do not build yet:

```text
- hybrid retrieval
- reranking
- streaming answers
- advanced citation claim checking
```

---

# Phase 6: Query trace persistence

Goal:

```text
Make every RAG answer inspectable.
```

Build:

```text
- query trace creation
- retrieved chunk trace records
- citation trace records
- provider call telemetry
- query trace list/detail endpoints
```

Database:

```text
rag.query_traces
rag.query_trace_chunks
rag.query_trace_citations
rag.provider_calls
```

Endpoints:

```text
GET /api/v1/queries
GET /api/v1/queries/:traceId
GET /api/v1/queries/:traceId/chunks
GET /api/v1/queries/:traceId/citations
```

Acceptance criteria:

```text
- every /query response creates a trace
- trace stores question, answer, model, provider, prompt version, config
- trace stores retrieved chunks with ranks and scores
- trace stores citations
- trace stores cost/latency/token usage where available
- trace can be fetched by traceId
```

Tests:

```text
- trace created on successful query
- failed provider call stores failed trace or provider error
- retrieved chunks are persisted in rank order
- citations are persisted as structured data
```

This phase is critical. Do not move to eval before traces work.

---

# Phase 7: Eval API datasets and test cases

Goal:

```text
Create golden datasets that define expected RAG behaviour.
```

Build:

```text
- dataset model
- test case model
- dataset CRUD, at least create/list/detail
- test case create/list/detail
- seed dataset loader
```

Endpoints:

```text
POST /api/v1/datasets
GET  /api/v1/datasets
GET  /api/v1/datasets/:datasetId

POST /api/v1/datasets/:datasetId/test-cases
GET  /api/v1/datasets/:datasetId/test-cases
GET  /api/v1/test-cases/:testCaseId
```

Database:

```text
eval.datasets
eval.test_cases
```

Acceptance criteria:

```text
- dataset can be created
- test cases can be created
- expected answers and expected sources are stored
- no-answer cases are supported
- seed dataset loads successfully
```

Tests:

```text
- create dataset
- duplicate dataset version rejected
- create factual test case
- create no-answer test case
- invalid test case type rejected
```

---

# Phase 8: Eval runner MVP

Goal:

```text
Run test cases against rag-api and store raw results.
```

Build:

```text
- rag-api Python HTTP client
- eval run model
- eval case result model
- eval run creation endpoint
- sequential test case runner
- trace fetching from rag-api
- raw answer/result storage
```

Endpoints:

```text
POST /api/v1/eval-runs
GET  /api/v1/eval-runs
GET  /api/v1/eval-runs/:evalRunId
GET  /api/v1/eval-runs/:evalRunId/results
GET  /api/v1/eval-runs/:evalRunId/results/:caseResultId
```

Database:

```text
eval.eval_runs
eval.eval_case_results
```

Acceptance criteria:

```text
- eval run can be created
- eval-api calls rag-api /query for each test case
- eval-api fetches trace for each case
- eval case result stores traceId, answer, latency, cost
- run status progresses from queued/running/completed
- partial failures are stored safely
```

Tests:

```text
- eval runner calls mocked rag-api client
- successful case stores result
- rag-api failure stores error result
- run summary updates after completion
```

Implementation note:

```text
Keep execution sequential for MVP.
Design function boundaries so concurrency can be added later.
```

---

# Phase 9: Deterministic scoring

Goal:

```text
Add cheap, repeatable scoring for retrieval and citations.
```

Build retrieval metrics:

```text
- hit@5
- hit@10
- recall@10
- expectedSourceRank
- retrievedExpectedSources
- missingExpectedSources
```

Build citation metrics:

```text
- citationPresent
- citationCount
- citationValidity
- citationTraceability
- invalidCitations
- untracedCitations
```

Build verdict calculation:

```text
- pass
- fail
- warning
- error
```

Build failure classification:

```text
- retrieval_miss
- low_recall
- invalid_citation
- citation_not_retrieved
- provider_error
- timeout
```

Acceptance criteria:

```text
- every eval case result has retrievalScores
- every eval case result has citationScores
- deterministic scoring can run without LLM judge
- verdict is calculated from thresholds
- failed cases have failureType where possible
```

Tests:

```text
- hit@5 true when expected source is in top 5
- hit@5 false when source missing
- recall@10 handles multi-source cases
- citation validity detects missing chunk IDs
- citation traceability detects citations not in retrieved context
- verdict fails when required threshold is missed
```

This phase gives the first real product value.

---

# Phase 10: LLM-as-judge scoring

Goal:

```text
Evaluate answer quality beyond deterministic checks.
```

Build:

```text
- judge provider abstraction
- OpenAI judge implementation
- judge prompt v1
- structured JSON output parser
- groundedness score
- correctness score
- completeness score
- citationSupport score
- refusalQuality for no-answer cases
- unsupportedClaims
- missingImportantPoints
- judge error handling
```

Database:

```text
eval.evaluator_prompts
eval.eval_case_results.judge_scores
```

Acceptance criteria:

```text
- judge can be enabled/disabled per eval run
- judge output is validated
- malformed judge output becomes judge_error
- judge scores are stored
- unsupported claims are visible in result detail
- final verdict can incorporate judge scores
```

Tests:

```text
- judge prompt receives expected inputs
- valid judge JSON parsed correctly
- malformed judge response handled safely
- no-answer case uses refusalQuality
- unsupported claims create failure when severe
```

Do not add yet:

```text
- RAGAS
- DeepEval
- human review
```

Add those after custom methodology works.

---

# Phase 11: Dashboard MVP

Goal:

```text
Make the system inspectable and demoable.
```

Build pages in this order:

```text
1. App shell/sidebar
2. Documents list/detail
3. Query trace list/detail
4. Dataset list/detail
5. Eval run list/detail
6. Failed case detail
7. Comparison detail
8. Overview page
9. Config/settings pages
```

Most important screens:

```text
- Query Trace Detail
- Eval Run Detail
- Failed Case Detail
- Run Comparison Detail
```

Acceptance criteria:

```text
- user can view indexed documents
- user can inspect document chunks
- user can view query traces
- user can inspect answer, citations, retrieved chunks, cost, latency
- user can view eval run summary
- user can filter failed cases
- user can open failed case detail
- failed case explains expected vs generated answer and expected vs retrieved sources
```

UX principle:

```text
Optimise for debugging depth, not visual polish.
```

---

# Phase 12: Run comparison

Goal:

```text
Compare two eval runs and identify improvements/regressions.
```

Build:

```text
- comparison creation endpoint
- comparison detail endpoint
- case matching by testCaseId
- metric delta calculation
- improved case classification
- regressed case classification
- dashboard comparison page
```

Endpoints:

```text
POST /api/v1/comparisons
GET  /api/v1/comparisons/:comparisonId
```

Metrics to compare:

```text
- passRate
- hit@5
- recall@10
- citationValidity
- citationTraceability
- groundedness
- correctness
- completeness
- citationSupport
- averageLatencyMs
- estimatedCost
```

Acceptance criteria:

```text
- user can compare baseline and candidate runs
- comparison shows metric deltas
- comparison shows improved cases
- comparison shows regressed cases
- comparison shows cost and latency trade-offs
```

Tests:

```text
- pass -> fail classified as regression
- fail -> pass classified as improvement
- metric deltas calculated correctly
- mismatched datasets are rejected or warned
```

This phase produces a strong portfolio demo.

---

# Phase 13: CI quality gate

Goal:

```text
Make RAG evaluation part of engineering workflow.
```

Build:

```text
- CI evaluation endpoint
- threshold presets
- CI gate result storage
- GitHub Actions workflow
- seed sample docs in CI
- seed eval dataset in CI
- run eval suite in CI
- fail build if thresholds fail
- upload JSON/Markdown report artefact
```

Endpoint:

```text
POST /api/v1/ci/evaluate
```

Database:

```text
eval.quality_thresholds
eval.ci_gate_results
```

Acceptance criteria:

```text
- GitHub Actions can start services
- migrations run in CI
- sample docs are seeded
- eval dataset is seeded
- eval run executes
- CI fails if threshold is missed
- CI summary is printed
```

Example blocking thresholds:

```text
minHitAt5: 0.8
minCitationValidity: 0.95
minGroundedness: 0.85
minCorrectness: 0.8
maxAverageLatencyMs: 5000
```

Risks:

```text
- real provider calls in CI cost money and may be flaky
```

Mitigation options:

```text
- use small CI dataset
- make judge optional in PR checks
- use mocked providers for smoke tests
- run full eval manually or nightly
```

Recommended first CI gate:

```text
Use a small deterministic-only eval.
Add LLM judge gate later.
```

---

# Phase 14: Production hardening

Goal:

```text
Make the system more resilient and operationally realistic.
```

Implementation status:

```text
Completed in-repo during the Phase 14 reliability + persistence hardening pass.
Remaining roadmap work starts at Phase 15.
```

Build:

```text
- request IDs
- structured logs
- provider error classification
- provider retry policy
- timeouts
- eval run partial failure handling
- resumable eval runs
- retry failed eval cases
- maxCases and cost limits
- controlled eval concurrency
- basic rate limiting
```

Acceptance criteria:

```text
- provider timeout does not crash eval run
- partial results remain available
- failed cases can be retried, post-MVP
- eval run reports provider errors clearly
- request IDs appear in logs and error responses
```

Implementation priority:

```text
1. timeouts
2. structured errors
3. partial failure persistence
4. retry policy
5. controlled concurrency
6. resumable runs
```

---

# Phase 15: Advanced retrieval

Goal:

```text
Improve retrieval quality and make comparison more meaningful.
```

Build:

```text
- keyword search
- hybrid retrieval
- metadata filters
- query rewriting
- reranking adapter
- context packing improvements
```

New retrieval modes:

```text
vector
keyword
hybrid
hybrid_reranked
```

RAG configs to compare:

```text
vector-default
vector-topk-12
hybrid-default
hybrid-reranked
prompt-v2
cheap-model
quality-model
```

Acceptance criteria:

```text
- user can run same dataset against vector and hybrid retrieval
- comparison shows retrieval quality delta
- trace shows retrieval mode used
- retrieved chunks show original score and rerank score where available
```

Tests:

```text
- keyword retrieval returns lexical matches
- hybrid retrieval combines vector and keyword results
- reranker changes order and persists rerank score
```

This is where the product starts looking more production-grade.

---

# Phase 16: Provider expansion

Goal:

```text
Compare model/provider quality, cost, and latency.
```

Add providers:

```text
- Anthropic
- OpenRouter
- Ollama/local model, optional
```

Build:

```text
- provider interface implementations
- provider-specific model config
- model pricing config
- provider error mapping
- provider comparison RAG configs
```

Acceptance criteria:

```text
- same dataset can run against different model providers
- run comparison shows quality/cost/latency trade-off
- provider errors are normalised
```

Potential configs:

```text
openai-quality
openai-cheap
anthropic-quality
openrouter-mixtral
ollama-local
```

Do this after the core system is stable.

---

# Phase 17: Better document ingestion

Goal:

```text
Expand beyond markdown/text after the core product works.
```

Add:

```text
- PDF parsing
- DOCX parsing
- HTML ingestion
- GitHub repo docs ingestion
- raw file storage
- async ingestion jobs
- re-indexing
- duplicate detection
```

Acceptance criteria:

```text
- user can ingest PDF/DOCX without breaking core flow
- ingestion job status is visible
- failed ingestion can be diagnosed
- duplicate documents are detected by checksum
```

Recommended order:

```text
1. DOCX
2. HTML
3. PDF text extraction
4. PDF OCR only if needed
5. GitHub repo docs connector
```

Avoid making this the centre of the project too early.

---

# Phase 18: Human review and eval calibration

Goal:

```text
Make evaluation more trustworthy by allowing manual review.
```

Build:

```text
- manual review table
- reviewer verdict override
- reviewer notes
- mark judge correct/incorrect
- flag ambiguous test case
- update golden expected answer/source
```

Acceptance criteria:

```text
- user can mark an eval result as incorrectly judged
- user can add review notes
- dashboard shows manual review status
- reviewed cases can be used to improve dataset quality
```

This is a strong post-MVP feature but not required early.

---

# Phase 19: Deployment and cloud demo

Goal:

```text
Deploy a production-style demo environment.
```

Options:

```text
Simple:
  Render/Fly.io/Railway + managed Postgres

AI Engineer alignment:
  Azure Container Apps + Azure Database for PostgreSQL

AWS option:
  ECS/Fargate + RDS PostgreSQL
```

Recommended path:

```text
Local Docker Compose first.
Then deploy dashboard + APIs + managed Postgres.
Then add CI quality gate.
```

Acceptance criteria:

```text
- public demo dashboard available
- sample data seeded
- environment variables managed securely
- health checks configured
- README includes architecture and deployment notes
```

For portfolio:

```text
A local demo with a strong README is acceptable.
A hosted demo is a bonus, not a requirement.
```

---

# Phase 20: Portfolio polish

Goal:

```text
Make the project understandable to recruiters and impressive to engineering managers.
```

Build docs:

```text
README.md
docs/product/product-brief.md
docs/architecture/system-overview.md
docs/architecture/data-model.md
docs/evaluation/evaluation-methodology.md
docs/decisions/
docs/demo-script.md
docs/screenshots/
```

README should include:

```text
- what the project is
- why it exists
- architecture diagram
- tech stack
- local setup
- demo flow
- evaluation methodology
- screenshots
- roadmap
- trade-offs
```

Screenshots to include:

```text
- query trace detail
- eval run detail
- failed case detail
- run comparison detail
```

Portfolio statement:

```text
RAGLens is a production-style RAG evaluation platform built with a TypeScript Fastify RAG API, Python FastAPI evaluation service, PostgreSQL/pgvector, and a Next.js dashboard. It supports document ingestion, source-grounded answers, query traces, golden datasets, deterministic retrieval/citation metrics, LLM-as-judge scoring, run comparison, cost/latency tracking, and CI-ready quality gates.
```

---

# Suggested milestone timeline

This is not a time estimate, just a logical sequence.

## Milestone 1: Foundation demo

Includes:

```text
- Docker Compose
- rag-api health
- eval-api health
- dashboard shell
- database migrations
```

Demo:

```text
All services running locally.
```

---

## Milestone 2: Indexed documents demo

Includes:

```text
- document ingestion
- chunking
- document list/detail
```

Demo:

```text
Seed sample docs and inspect chunks.
```

---

## Milestone 3: First RAG answer demo

Includes:

```text
- embeddings
- vector retrieval
- answer generation
- citations
```

Demo:

```text
Ask a question and receive a cited answer.
```

---

## Milestone 4: Traceability demo

Includes:

```text
- query traces
- retrieved chunks
- citation records
- trace detail endpoint/dashboard
```

Demo:

```text
Open a query trace and explain how the answer was generated.
```

---

## Milestone 5: First eval run demo

Includes:

```text
- datasets
- test cases
- eval runner
- raw results
```

Demo:

```text
Run 20 test cases against rag-api.
```

---

## Milestone 6: Scored eval demo

Includes:

```text
- hit@5
- recall@10
- citation validity
- verdicts
- failure types
```

Demo:

```text
Show pass/fail results and retrieval/citation failures.
```

---

## Milestone 7: Judge scoring demo

Includes:

```text
- groundedness
- correctness
- completeness
- citation support
- unsupported claims
```

Demo:

```text
Open a failed case and show judge explanation.
```

---

## Milestone 8: Dashboard demo

Includes:

```text
- documents
- traces
- eval runs
- failed case detail
```

Demo:

```text
Walk through the full product experience.
```

---

## Milestone 9: Comparison demo

Includes:

```text
- baseline vs candidate run
- metric deltas
- improved/regressed cases
```

Demo:

```text
Show that changing retrieval or prompt improved quality but increased latency/cost.
```

---

## Milestone 10: CI gate demo

Includes:

```text
- GitHub Actions
- eval trigger
- quality thresholds
- pass/fail report
```

Demo:

```text
A pull request fails when RAG quality drops below threshold.
```

---

# MVP roadmap

## MVP must include

```text
- monorepo
- Docker Compose
- Postgres + pgvector
- rag-api document ingestion
- chunking
- embeddings
- vector retrieval
- answer generation
- structured citations
- query traces
- eval-api datasets
- test cases
- eval runner
- deterministic retrieval/citation metrics
- basic LLM-as-judge
- dashboard trace/eval/failure views
```

## MVP can exclude

```text
- hybrid retrieval
- reranking
- CI gate
- PDF parsing
- DOCX parsing
- auth
- human review
- multi-provider support
- cloud deployment
```

## MVP demo script

```text
1. Start services locally.
2. Seed sample company documents.
3. Open Documents page.
4. Ask a question.
5. Open query trace.
6. Show retrieved chunks and citations.
7. Run eval dataset.
8. Open eval run summary.
9. Open failed case.
10. Show expected vs generated answer.
11. Show expected vs retrieved sources.
12. Show judge notes.
```

If you can do that cleanly, the MVP is successful.

---

# Post-MVP roadmap

## Post-MVP 1: Run comparison

```text
- compare baseline/candidate runs
- improved/regressed cases
- metric deltas
```

## Post-MVP 2: CI quality gate

```text
- GitHub Actions
- threshold presets
- deterministic gate first
- judge gate later
```

## Post-MVP 3: Hybrid retrieval

```text
- keyword search
- hybrid score merge
- compare vector vs hybrid
```

## Post-MVP 4: Reranking

```text
- reranker adapter
- persist rerank scores
- compare hybrid vs hybrid_reranked
```

## Post-MVP 5: Provider comparison

```text
- OpenAI
- Anthropic
- OpenRouter
- Ollama optional
```

## Post-MVP 6: Better ingestion

```text
- DOCX
- HTML
- PDF
- GitHub repo docs
```

## Post-MVP 7: Human review

```text
- manual verdict override
- judge calibration
- dataset improvement workflow
```

---

# Recommended build order

Use this exact order:

```text
1. Monorepo foundation
2. Docker Compose and migrations
3. Sample documents and eval dataset
4. rag-api document ingestion
5. chunking
6. embeddings
7. vector retrieval
8. answer generation
9. structured citations
10. query trace persistence
11. eval-api datasets
12. eval-api test cases
13. eval runner
14. deterministic scoring
15. LLM-as-judge
16. dashboard trace detail
17. dashboard eval run detail
18. dashboard failed case detail
19. run comparison
20. CI quality gate
21. hybrid retrieval
22. reranking
23. provider expansion
24. improved ingestion
```

This order keeps the product from drifting into infrastructure before the core value exists.

---

# Critical path

The critical path is:

```text
documents
  -> chunks
  -> embeddings
  -> retrieval
  -> answer with citations
  -> trace
  -> eval run
  -> scores
  -> failed case inspection
```

Anything not on that path should be deferred.

Examples to defer:

```text
- fancy charts
- PDF OCR
- auth
- multi-tenancy
- agents
- fine-tuning
- Kubernetes
- public web crawling
```

---

# Roadmap risks

## Risk 1: Building too much infrastructure too early

Avoid:

```text
- queues
- Kubernetes
- auth
- complex deployment
```

Until the core loop works.

## Risk 2: Dashboard before backend value

Avoid building a polished dashboard before traces and eval results exist.

Dashboard depends on useful backend data.

## Risk 3: Poor sample dataset

Bad test data will make the evaluation harness look weak.

Invest enough effort into realistic sample documents and expected answers.

## Risk 4: LLM judge instability

Do not make LLM judge the only scoring mechanism.

Deterministic metrics must work first.

## Risk 5: Provider cost

Keep early datasets small.

Add cost tracking before running large evals.

---

# Final roadmap summary

The roadmap should move through three product maturity levels.

## Level 1: Working RAG

```text
Can ingest documents and answer with citations.
```

## Level 2: Observable RAG

```text
Can inspect exactly how an answer was produced.
```

## Level 3: Evaluated RAG

```text
Can run golden test cases and score quality.
```

## Level 4: Comparable RAG

```text
Can compare prompts, models, and retrieval strategies.
```

## Level 5: Production-style RAG

```text
Can gate changes in CI and diagnose regressions.
```

That is the full path from project idea to production-style portfolio system.
