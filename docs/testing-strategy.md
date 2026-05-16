---
title: "Testing Strategy"
description: "Testing strategy covering quality, risk, and verification for RAGLens."
order: 11
section: "Delivery"
status: "stable"
---
# Testing Strategy: RAGLens

## 1. Testing strategy objective

RAGLens has three kinds of risk:

```text
1. Software correctness risk
   APIs, database writes, services, dashboard, contracts.

2. RAG quality risk
   Retrieval misses, unsupported answers, bad citations, poor refusal behaviour.

3. Operational risk
   Provider failures, cost spikes, long eval runs, partial failures, flaky CI.
```

The testing strategy should cover all three.

Core principle:

```text
Test normal software behaviour with deterministic tests.
Test RAG quality with golden datasets and evaluation runs.
Do not rely on live LLM calls for normal CI.
```

---

# 2. Test pyramid

Use a practical test pyramid.

```text
Many:
  Unit tests

Some:
  API integration tests

Few:
  End-to-end tests

Separate:
  RAG quality evaluation tests
```

## Test layers

```text
Unit tests:
  Fast, deterministic, no network, no real provider calls.

Integration tests:
  API routes, database, repositories, mocked providers.

End-to-end tests:
  Full local flow through services.

RAG quality tests:
  Eval datasets run against the RAG API.

Manual demo tests:
  Dashboard walkthrough before portfolio/demo releases.
```

---

# 3. Testing goals by system area

## rag-api

Must prove:

```text
- documents can be ingested
- chunks are generated correctly
- embeddings are requested and stored
- retrieval returns ranked chunks
- answers include structured citations
- traces are persisted
- provider failures are handled safely
```

## eval-api

Must prove:

```text
- datasets and test cases are stored correctly
- eval runs call rag-api correctly
- partial failures are persisted
- retrieval metrics are correct
- citation metrics are correct
- judge output is validated
- verdicts are deterministic
- comparisons classify improvements/regressions correctly
```

## dashboard

Must prove:

```text
- key pages render
- loading/empty/error states work
- failed cases are understandable
- trace links work
- comparison data is displayed correctly
```

## system-level

Must prove:

```text
- services boot together
- migrations run from a clean database
- seed data loads
- query -> trace -> eval result flow works
```

---

# 4. Test types

## 4.1 Unit tests

Unit tests should be fast and deterministic.

Use them heavily for:

```text
rag-api:
  - chunking
  - prompt building
  - citation parsing
  - citation validation
  - cost estimation
  - retrieval result mapping

eval-api:
  - hit@k
  - recall@k
  - expectedSourceRank
  - citationValidity
  - citationTraceability
  - verdict calculation
  - failure type classification
  - judge JSON parsing

dashboard:
  - pure component rendering
  - score badge rendering
  - status badge rendering
  - formatting utilities
```

Unit tests must not:

```text
- call OpenAI
- require Docker
- depend on external network
- depend on live model output
```

---

## 4.2 Integration tests

Integration tests verify services with real API routes and database access.

Use them for:

```text
rag-api:
  - document ingestion route
  - document list/detail routes
  - query route with mocked providers
  - trace fetch route

eval-api:
  - dataset routes
  - test case routes
  - eval run route with mocked rag-api client
  - comparison route
```

Integration tests may use:

```text
- test database
- mocked provider implementations
- mocked rag-api client for eval-api
```

They should not call live LLM providers by default.

---

## 4.3 End-to-end tests

End-to-end tests verify the main product flow.

MVP E2E flow:

```text
1. Start Postgres, rag-api, eval-api.
2. Run migrations.
3. Seed documents.
4. Ask a query.
5. Confirm answer has traceId.
6. Fetch trace.
7. Seed dataset.
8. Run eval.
9. Confirm eval case results exist.
```

Keep E2E tests small.

Do not run a full 30-case eval on every PR unless providers are mocked.

---

## 4.4 RAG quality evaluation tests

These are not normal unit tests. They are quality checks.

They use the eval-api and golden dataset to test:

```text
- retrieval quality
- citation validity
- citation traceability
- groundedness
- correctness
- completeness
- refusal quality
```

There should be two modes:

```text
Deterministic quality mode:
  Uses mocked/stable provider responses or deterministic answer fixtures.
  Safe for CI.

Live quality mode:
  Uses real LLM provider calls.
  Run manually, nightly, or before demo releases.
```

---

## 4.5 Contract tests

Because `eval-api` calls `rag-api`, API contracts matter.

Contract tests should verify:

```text
- POST /query response contains traceId
- GET /queries/:traceId response contains retrievedChunks
- citation shape is stable
- error response shape is stable
```

Use OpenAPI later, but early tests can validate JSON schemas directly.

---

## 4.6 Smoke tests

Smoke tests should prove the system starts.

```text
- rag-api /health returns ok
- eval-api /health returns ok
- dashboard loads
- database connection works
- migrations applied
```

Run smoke tests in CI and local setup.

---

# 5. Testing tools

## rag-api

Recommended:

```text
Test runner:
  Vitest

HTTP testing:
  Fastify inject or Supertest

Validation:
  Zod

Database:
  Testcontainers or Docker Compose test DB
```

Use Fastify `inject` for route tests where possible. It is fast and avoids binding ports.

## eval-api

Recommended:

```text
Test runner:
  pytest

HTTP testing:
  httpx AsyncClient or FastAPI TestClient

Validation:
  Pydantic

Database:
  pytest fixtures with test Postgres
```

## dashboard

Recommended:

```text
Test runner:
  Vitest

Component testing:
  React Testing Library

E2E, later:
  Playwright
```

## shared/system

Recommended:

```text
Docker Compose
GitHub Actions
SQL migration smoke tests
```

---

# 6. rag-api test strategy

## 6.1 Chunker tests

The chunker is core RAG infrastructure.

Test cases:

```text
- splits long document into multiple chunks
- does not split short document unnecessarily
- preserves chunk order
- includes chunk_index
- respects approximate chunk size
- respects overlap
- strips empty chunks
- stores section metadata where available
```

Example test names:

```text
chunker creates one chunk for short document
chunker creates ordered chunks for long document
chunker applies overlap between chunks
chunker ignores empty markdown sections
chunker preserves heading metadata
```

---

## 6.2 Document ingestion tests

Test route:

```text
POST /api/v1/documents/ingest
```

Cases:

```text
valid markdown:
  returns 201
  creates document
  creates chunks

empty content:
  returns 400

unsupported document type:
  returns 400

metadata included:
  stores metadata

provider embedding failure:
  returns structured error or marks document failed, depending implementation
```

For MVP, if embeddings are part of ingestion, mock the embedding provider.

---

## 6.3 Embedding provider tests

Provider tests should not call OpenAI in CI.

Test the interface with mocks.

Cases:

```text
- embedding provider returns vector
- embedding service stores embedding
- provider timeout is mapped to provider error
- provider error does not log API key
```

Use one optional live provider test that is skipped by default:

```text
RUN_LIVE_PROVIDER_TESTS=true
```

---

## 6.4 Retrieval tests

Test vector retrieval behaviour.

Cases:

```text
- returns top K chunks
- returns rank order
- includes score
- respects metadata filters, post-MVP
- handles no chunks
- handles chunks without embeddings
```

For deterministic tests, insert known fake vectors.

Example:

```text
query vector: [1, 0, 0]
chunk A: [0.99, 0, 0]
chunk B: [0.20, 0.90, 0]
expect chunk A rank 1
```

---

## 6.5 Prompt builder tests

Prompt building should be deterministic.

Cases:

```text
- includes question
- includes retrieved context
- includes citation IDs
- includes insufficient-evidence instruction
- includes prompt version
- does not include undefined/null metadata
```

This prevents accidental prompt breakage.

---

## 6.6 Citation parser/validator tests

Citations are a key product feature.

Cases:

```text
- parses valid structured citations
- rejects citation with unknown chunkId
- detects citation with known documentId but unknown chunkId
- maps citation to retrieved chunk
- returns empty citations safely
```

---

## 6.7 Query route tests

Route:

```text
POST /api/v1/query
```

Cases:

```text
valid question:
  returns answer, citations, traceId, latencyMs, usage

missing question:
  returns 400

unknown ragConfigId:
  returns 404

no retrieved chunks:
  returns insufficient-evidence answer and traceId

generation provider failure:
  returns structured provider error

successful query:
  persists query trace
  persists retrieved chunks
  persists citations
```

Use mocked embedding and chat providers.

---

## 6.8 Trace route tests

Routes:

```text
GET /api/v1/queries
GET /api/v1/queries/:traceId
```

Cases:

```text
- returns trace list
- returns trace detail with retrieved chunks
- returns citations
- unknown trace returns 404
- failed trace includes error details
```

---

# 7. eval-api test strategy

## 7.1 Dataset tests

Routes:

```text
POST /api/v1/datasets
GET /api/v1/datasets
GET /api/v1/datasets/:datasetId
```

Cases:

```text
- creates dataset
- duplicate name/version returns 409
- list returns testCaseCount
- unknown dataset returns 404
```

---

## 7.2 Test case tests

Routes:

```text
POST /api/v1/datasets/:datasetId/test-cases
GET /api/v1/datasets/:datasetId/test-cases
GET /api/v1/test-cases/:testCaseId
```

Cases:

```text
- creates factual test case
- creates comparison test case
- creates multi-hop test case with multiple expected sources
- creates no-answer test case without expected answer
- rejects invalid type
- rejects missing expected sources for normal case
- allows empty expected sources for no-answer case
```

---

## 7.3 Retrieval metric tests

These are critical and should be exhaustive.

### hit@k

Cases:

```text
expected source at rank 1:
  hit@5 = true

expected source at rank 5:
  hit@5 = true

expected source at rank 6:
  hit@5 = false

expected source missing:
  hit@5 = false
```

### recall@k

Cases:

```text
one expected source, one retrieved:
  recall@10 = 1.0

two expected sources, one retrieved:
  recall@10 = 0.5

two expected sources, none retrieved:
  recall@10 = 0.0

no expected sources:
  metric not applicable
```

### expectedSourceRank

Cases:

```text
expected source rank 3:
  expectedSourceRank = 3

expected source missing:
  expectedSourceRank = null

multiple expected sources:
  expectedSourceRank = best rank
```

---

## 7.4 Citation metric tests

### citationPresent

```text
no citations:
  false

one citation:
  true
```

### citationValidity

```text
all cited chunks exist:
  1.0

one of two cited chunks missing:
  0.5

no citations:
  0 or not applicable depending test type
```

### citationTraceability

```text
cited chunk was retrieved:
  1.0

cited chunk exists but was not retrieved:
  0.0

one of two cited chunks was retrieved:
  0.5
```

---

## 7.5 Verdict calculation tests

Test verdict rules separately from scoring.

Cases:

```text
all thresholds met:
  verdict = pass

hitAt5 false:
  verdict = fail
  failureType = retrieval_miss

citationValidity below threshold:
  verdict = fail
  failureType = invalid_citation

citationTraceability below threshold:
  verdict = fail
  failureType = citation_not_retrieved

groundedness below threshold:
  verdict = fail
  failureType = unsupported_claim

latency above threshold but quality passed:
  verdict = warning

provider error:
  verdict = error
  failureType = provider_error
```

---

## 7.6 Failure type classification tests

Use deterministic priority.

Priority:

```text
1. provider_error / timeout / judge_error
2. retrieval_miss
3. low_recall
4. invalid_citation
5. citation_not_retrieved
6. unsupported_claim
7. incorrect_answer
8. incomplete_answer
9. bad_refusal
```

Cases:

```text
retrieval miss and incorrect answer:
  failureType = retrieval_miss

invalid citation and unsupported claim:
  failureType = invalid_citation

provider error and missing retrieval:
  failureType = provider_error
```

---

## 7.7 Judge parser tests

Judge output must be validated.

Cases:

```text
valid JSON:
  parsed successfully

JSON with missing required field:
  judge_error

JSON with score outside 0-1:
  judge_error

plain text response:
  judge_error

unsupportedClaims not array:
  judge_error
```

Do not trust model output.

---

## 7.8 Eval runner tests

Mock the `rag-api` client.

Cases:

```text
successful case:
  calls /query
  fetches trace
  stores case result

rag-api /query fails:
  stores error result
  continues next case

trace fetch fails:
  stores error result
  continues next case

partial failure:
  run status = partially_failed

all success:
  run status = completed

all fail due to system error:
  run status = failed
```

---

## 7.9 Comparison tests

Cases:

```text
baseline fail, candidate pass:
  improved case

baseline pass, candidate fail:
  regressed case

candidate groundedness improves by >= 0.10:
  improved metric

candidate citation support drops by >= 0.10:
  regression

different datasets:
  reject or warn
```

For MVP, reject mismatched datasets.

---

# 8. Dashboard test strategy

## 8.1 Component tests

Test key components:

```text
MetricCard
StatusBadge
ScoreBadge
VerdictBadge
FailureTypeBadge
CitationCard
ChunkCard
ExpectedVsActualPanel
RunComparisonTable
```

Cases:

```text
- renders pass/fail/warning states
- renders null scores safely
- renders empty citations
- renders long question text
- renders unsupported claims list
```

---

## 8.2 Page tests

Test with mocked API responses.

Pages:

```text
Documents list
Document detail
Query trace detail
Dataset detail
Eval run detail
Failed case detail
Comparison detail
```

Each page should test:

```text
- loading state
- empty state
- error state
- populated state
```

---

## 8.3 Failed case UX tests

This is the highest-value dashboard area.

Test that failed case detail shows:

```text
- verdict
- failure type
- question
- expected answer
- generated answer
- expected sources
- retrieved sources
- retrieval scores
- citation scores
- judge scores
- unsupported claims
- missing important points
- trace link
```

---

## 8.4 E2E dashboard tests, post-MVP

Use Playwright later for:

```text
- open eval run
- filter failed cases
- open failed case detail
- open underlying trace
- compare two runs
```

Do not add Playwright too early unless dashboard becomes central.

---

# 9. Provider testing strategy

## Default: no live provider calls in CI

Live LLM calls are:

```text
- slow
- costly
- flaky
- rate-limit prone
- nondeterministic
```

CI should use mocks/fixtures.

## Provider mock strategy

Create mock providers:

```text
MockEmbeddingProvider
MockChatProvider
MockJudgeProvider
```

They should return deterministic outputs.

Example:

```text
MockEmbeddingProvider:
  returns fixed vectors based on input text hash or configured fixtures

MockChatProvider:
  returns answer fixture for known question

MockJudgeProvider:
  returns score fixture for known case
```

## Live provider tests

Allow manual live tests:

```text
RUN_LIVE_PROVIDER_TESTS=true
```

These should be excluded from normal CI.

---

# 10. Fixture strategy

Use fixtures heavily.

## rag-api fixtures

```text
fixtures/documents/
  remote-work-policy-v1.md
  remote-work-policy-v2.md

fixtures/chunks/
  remote-work-chunks.json

fixtures/provider-responses/
  embedding-response.json
  chat-answer-response.json
```

## eval-api fixtures

```text
fixtures/test-cases/
  factual-case.json
  multi-hop-case.json
  no-answer-case.json

fixtures/traces/
  successful-trace.json
  retrieval-miss-trace.json
  invalid-citation-trace.json

fixtures/judge-responses/
  pass.json
  unsupported-claim.json
  malformed.txt
```

## dashboard fixtures

```text
fixtures/api/
  trace-detail.json
  eval-run-detail.json
  failed-case-detail.json
  comparison-detail.json
```

Fixtures make tests stable and dashboard development faster.

---

# 11. Test data design

## Golden sample cases

Create specific cases to force failures.

### Passing case

```text
Question:
What is the remote work approval process?

Expected:
Remote work longer than two consecutive weeks requires manager approval.

Expected source:
Remote Work Policy v2
```

### Retrieval miss case

```text
Expected source:
Incident Response Runbook

Retrieved:
Mobile Release Process only
```

### Invalid citation case

```text
Generated citation:
chunk_does_not_exist
```

### Citation not retrieved case

```text
Cited chunk exists but was not in retrieved context.
```

### Unsupported claim case

```text
Question:
Does the company allow unlimited overseas remote work?

Generated:
Yes, unlimited overseas remote work is allowed.

Expected:
No supporting evidence.
```

### Incomplete answer case

```text
Expected:
Notify release manager, rollback, create incident report.

Generated:
Notify release manager and rollback.
```

These cases should exist as fixtures before the full system is complete.

---

# 12. CI testing plan

## PR CI

Run on every pull request:

```text
rag-api:
  lint
  typecheck
  unit tests
  route tests with mocked providers

eval-api:
  lint/format check
  type check if using mypy/pyright, optional
  unit tests
  API tests with mocked rag-api client

dashboard:
  lint
  typecheck
  component tests
  build

infra:
  migration smoke test
```

## Main branch CI

Run all PR checks plus:

```text
- Docker Compose smoke test
- seed data smoke test
- deterministic eval smoke test with mocks
```

## Manual or scheduled CI

Run:

```text
- live provider eval
- full judge-enabled eval
- dashboard E2E tests
```

Do not block all PRs on live LLM calls early.

---

# 13. RAG quality gate strategy

## Phase 1: deterministic quality gate

Use deterministic metrics only:

```text
- hit@5
- recall@10
- citationValidity
- citationTraceability
```

This can run safely in CI with mocked or fixed provider responses.

## Phase 2: judge-enabled quality gate

Add LLM judge once stable:

```text
- groundedness
- correctness
- completeness
- citationSupport
```

Run manually or nightly first.

## Phase 3: blocking PR gate

Only block PRs once:

```text
- dataset is stable
- scoring is stable
- cost is controlled
- false positives are rare
```

---

# 14. Test coverage expectations

Do not chase arbitrary 100% coverage.

Use meaningful minimums.

## rag-api

High coverage for:

```text
- chunking
- prompt building
- citation parsing
- trace persistence
- route validation
```

## eval-api

Very high coverage for:

```text
- scoring metrics
- verdict calculation
- failure type classification
- judge parser
```

These are core product logic and should be close to exhaustive.

## dashboard

Coverage should focus on:

```text
- failed case detail
- trace detail
- eval run detail
- comparison detail
```

---

# 15. Critical tests that must exist

## rag-api critical tests

```text
1. POST /documents/ingest creates document and chunks.
2. Empty document is rejected.
3. POST /query returns traceId.
4. POST /query persists retrieved chunks.
5. POST /query persists citations.
6. GET /queries/:traceId returns full trace.
7. Provider failure returns structured error.
```

## eval-api critical tests

```text
1. hit@5 works.
2. recall@10 works for multi-hop.
3. citationValidity detects invalid citations.
4. citationTraceability detects citations not retrieved.
5. verdict calculation is deterministic.
6. eval runner stores partial failures.
7. judge parser rejects malformed output.
8. comparison identifies regressions.
```

## dashboard critical tests

```text
1. Failed case detail renders expected vs generated answer.
2. Failed case detail renders expected vs retrieved sources.
3. Trace detail renders citations and chunks.
4. Eval run detail shows pass/fail summary.
5. Comparison detail shows metric deltas.
```

---

# 16. Regression testing strategy

Regression testing happens at two levels.

## Code regression

Normal CI tests catch broken implementation.

Examples:

```text
- API route broke
- DB query broke
- dashboard cannot render
- scoring function changed incorrectly
```

## RAG quality regression

Eval datasets catch degraded RAG behaviour.

Examples:

```text
- prompt change caused unsupported claims
- retrieval config stopped finding expected sources
- citation parser changed and citations became invalid
- model changed and refusal quality dropped
```

Both are required.

---

# 17. Test environment strategy

## Local dev

Use:

```text
docker compose up
```

Run service tests separately:

```text
rag-api:
  npm test

eval-api:
  pytest

dashboard:
  npm test
```

## Test database

Use either:

```text
- Docker test database
- Testcontainers
- transaction rollback per test
```

For simplicity:

```text
Use a separate test database and reset schema before integration tests.
```

## Provider mocks

Use environment variable:

```text
AI_PROVIDER_MODE=mock
```

or dependency injection in tests.

---

# 18. Seeding and test reset

Seed scripts should be idempotent where possible.

Test reset should:

```text
- truncate rag and eval schemas
- re-run migrations if needed
- seed required test docs
```

Avoid tests depending on test order.

---

# 19. Manual QA checklist

Before a demo or release, manually verify:

```text
1. Docker Compose starts cleanly.
2. Sample docs seed successfully.
3. Documents page shows indexed docs.
4. Query returns answer with citations.
5. Query trace shows retrieved chunks.
6. Eval dataset exists.
7. Eval run completes.
8. Failed cases are visible.
9. Failed case detail explains failure.
10. Comparison page shows metric deltas.
```

For portfolio demo:

```text
Record screenshots after this checklist passes.
```

---

# 20. Common failure scenarios to test

## Provider failures

```text
- embedding provider timeout
- chat provider timeout
- judge provider malformed response
- rate limit error
```

Expected behaviour:

```text
- structured error
- no crash
- partial eval result stored
- no API key leaked
```

## Data failures

```text
- no documents indexed
- no chunks for document
- expected source missing
- trace ID missing
- citation references missing chunk
```

Expected behaviour:

```text
- clear error or failed metric
- dashboard can display issue
```

## Eval failures

```text
- one test case fails
- all test cases fail
- rag-api unavailable
- judge output invalid
```

Expected behaviour:

```text
- run status reflects outcome
- completed case results remain stored
- failure type is visible
```

---

# 21. Testing anti-patterns to avoid

Avoid:

```text
- live LLM calls in every test
- snapshot testing huge model outputs
- testing implementation details instead of behaviour
- making dashboard tests depend on real backend
- hiding flaky tests with retries instead of fixing them
- using one giant E2E test as the only confidence layer
```

Also avoid:

```text
- judging answer quality only with LLM-as-judge
```

Deterministic metrics must be tested independently.

---

# 22. Test implementation order

Build tests in this order:

```text
1. Migration smoke tests
2. rag-api chunker tests
3. rag-api document ingestion tests
4. rag-api retrieval tests with fake vectors
5. rag-api query route tests with mocked providers
6. rag-api trace route tests
7. eval-api dataset/test case route tests
8. eval-api retrieval metric unit tests
9. eval-api citation metric unit tests
10. eval-api verdict/failure classification tests
11. eval-api runner tests with mocked rag-api client
12. eval-api judge parser tests
13. dashboard failed-case component tests
14. dashboard trace/eval page tests
15. deterministic E2E smoke test
16. live provider eval, manual or scheduled
```

---

# 23. Example test matrix

| Area               |         Unit | Integration |      E2E | Live provider |
| ------------------ | -----------: | ----------: | -------: | ------------: |
| Chunking           |          Yes |          No |       No |            No |
| Document ingestion |         Some |         Yes |      Yes |            No |
| Embeddings         |       Mocked |      Mocked | Optional |        Manual |
| Retrieval          |          Yes |         Yes |      Yes |            No |
| Answer generation  | Prompt tests |      Mocked | Optional |        Manual |
| Citations          |          Yes |         Yes |      Yes |        Manual |
| Query traces       |         Some |         Yes |      Yes |            No |
| Eval metrics       |          Yes |          No |      Yes |            No |
| LLM judge          |   Parser yes |      Mocked | Optional |        Manual |
| Dashboard          |          Yes |      Mocked | Optional |            No |
| CI gate            |          Yes |         Yes |      Yes |      Optional |

---

# 24. Final testing strategy summary

The RAGLens testing strategy should be built around this split:

```text
Software tests:
  Prove the system works.

Evaluation tests:
  Prove the RAG behaviour is good.

Operational tests:
  Prove failures are handled safely.
```

The highest-value test coverage should be around:

```text
- scoring metrics
- verdict calculation
- failure type classification
- trace persistence
- citation validation
- failed case rendering
```

The most important rule:

```text
Normal CI should be deterministic.
Live LLM evaluation should be separate, explicit, and cost-controlled.
```

This gives you a testing approach that looks production-aware rather than demo-only.
