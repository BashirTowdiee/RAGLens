---
title: "Final Production Review"
description: "What a Company Would Review Before Production"
order: 15
section: "Review"
status: "stable"
---
# What a Company Would Review Before Production: RAGLens

## 1. Production review objective

Before RAGLens could be considered production-ready, a company would review whether it is safe, reliable, measurable, maintainable, and operable.

The review would not only ask:

```text
Does the RAG system answer questions?
```

It would ask:

```text
Can we trust it?
Can we debug it?
Can we control cost?
Can we prevent regressions?
Can we recover from failures?
Can we explain answers to stakeholders?
Can we operate it safely?
```

For RAGLens, production readiness should be assessed across these areas:

```text
1. Product readiness
2. RAG quality readiness
3. Evaluation readiness
4. Architecture readiness
5. Security readiness
6. Data readiness
7. Operational readiness
8. Reliability readiness
9. Cost readiness
10. Compliance and audit readiness
11. CI/CD readiness
12. Support readiness
```

---

# 2. Product readiness review

## Key question

```text
Does the product solve a real user problem clearly enough?
```

## What a company would check

```text
- Is the target user clear?
- Is the product scope clear?
- Are the main workflows complete?
- Can users inspect answers and failures?
- Does the dashboard help users make decisions?
- Are non-goals documented?
- Is the MVP focused enough?
```

## Expected evidence

```text
- Product brief
- User personas
- Jobs-to-be-done
- Product requirements document
- UX/dashboard design
- Demo script
- Sample user flows
```

## Review checklist

```text
Can an AI engineer:
  - run an eval
  - inspect failed cases
  - compare two RAG configs

Can a product engineer:
  - call the RAG API
  - receive structured citations
  - get a trace ID

Can a platform engineer:
  - see failures
  - monitor costs
  - inspect latency
  - understand provider errors

Can a risk/compliance reviewer:
  - inspect source chunks
  - verify citations
  - identify unsupported claims
```

## Production concern

If the product is only a chatbot UI, it is not production-grade enough.

The production value comes from:

```text
- traceability
- evaluation
- failure analysis
- regression detection
- cost/latency visibility
```

---

# 3. RAG quality readiness review

## Key question

```text
Are answers good enough, grounded enough, and reliable enough for the target use case?
```

## What a company would check

```text
- Does retrieval find the right sources?
- Are answers grounded in retrieved context?
- Are citations valid?
- Do citations support claims?
- Does the model refuse unsupported questions?
- Does quality remain stable across changes?
- Are failure types understood?
```

## Required metrics

```text
Retrieval:
  - hit@5
  - recall@10
  - expectedSourceRank

Citation:
  - citationPresent
  - citationValidity
  - citationTraceability
  - citationSupport

Answer:
  - groundedness
  - correctness
  - completeness
  - refusalQuality
  - unsupportedClaims

Operational:
  - latencyMs
  - inputTokens
  - outputTokens
  - estimatedCost
```

## Minimum production expectations

For a controlled internal knowledge base, a company might expect:

```text
trace coverage:
  100%

citation validity:
  >= 95%

retrieval hit@5:
  >= 80% initially
  >= 90% for stricter production use cases

groundedness:
  >= 85%

correctness:
  >= 80%

no-answer hallucination rate:
  low enough to be acceptable for the use case
```

The exact thresholds depend on risk. HR, legal, finance, medical, or customer-facing use cases would require much stricter gates.

## Review checklist

```text
- Are golden test cases representative?
- Are no-answer cases included?
- Are multi-hop cases included?
- Are versioned/temporal cases included?
- Are known failure modes documented?
- Are poor-quality answers visible in the dashboard?
- Can a failed answer be traced back to retrieval, citation, or generation?
```

## Red flags

```text
- answers often cite irrelevant chunks
- citations are only decorative
- no no-answer tests
- no failed case inspection
- no source version handling
- no way to compare prompt/model changes
```

---

# 4. Evaluation readiness review

## Key question

```text
Can the company prove quality before release?
```

## What a company would check

```text
- Are eval datasets versioned?
- Are test cases well-labelled?
- Are expected sources stable?
- Are deterministic metrics implemented?
- Is LLM-as-judge used carefully?
- Are judge prompts versioned?
- Are eval runs reproducible?
- Can eval runs be compared?
- Can CI fail on quality regressions?
```

## Required artefacts

```text
- Evaluation methodology
- Golden dataset
- Test case taxonomy
- Threshold presets
- Judge prompt version
- Eval report format
- Run comparison reports
```

## Required test case types

```text
- factual
- comparison
- temporal/versioned
- multi-hop
- no-answer
- citation-sensitive
```

## LLM judge review

A company would be careful with LLM-as-judge.

They would check:

```text
- Is judge output structured?
- Is malformed output handled?
- Is the judge prompt versioned?
- Are judge explanations stored?
- Are deterministic metrics still used?
- Is the judge treated as a signal, not absolute truth?
```

## Red flags

```text
- LLM judge is the only scoring mechanism
- eval scores are not reproducible
- no dataset versioning
- no expected sources
- no threshold configuration
- no distinction between retrieval failure and generation failure
```

---

# 5. Architecture readiness review

## Key question

```text
Is the system architecture appropriate for production workloads?
```

## What a company would check

```text
- Are service boundaries clear?
- Is evaluation isolated from user-facing traffic?
- Does eval-api treat rag-api as a black box?
- Is the database schema maintainable?
- Are APIs documented?
- Are provider integrations abstracted?
- Are prompt/config versions captured?
```

## Expected architecture

```text
rag-api:
  Owns document ingestion, chunks, embeddings, retrieval, generation, citations, traces.

eval-api:
  Owns datasets, test cases, eval runs, scoring, judge evaluation, comparisons, CI gates.

dashboard:
  Owns inspection and reporting UI.

PostgreSQL + pgvector:
  Stores source data, vectors, traces, eval data, and metrics.
```

## Production review checklist

```text
Service boundaries:
  - rag-api and eval-api are independently deployable
  - eval workloads do not block user queries
  - dashboard is not coupled to internal DB details

Contracts:
  - APIs use stable request/response shapes
  - error responses are standardised
  - OpenAPI specs exist or are planned

Data model:
  - traces are first-class
  - eval results are stored
  - configs are versioned
  - prompt versions are stored

Extensibility:
  - providers are abstracted
  - retrieval modes can evolve
  - scoring methods can evolve
```

## Red flags

```text
- eval logic runs inside the same request path as user queries
- no provider abstraction
- no trace model
- no config versioning
- dashboard reads random DB tables directly instead of API contracts
```

---

# 6. Security readiness review

## Key question

```text
Can this system handle sensitive documents and provider credentials safely?
```

## What a company would check

```text
- Are API keys stored securely?
- Are secrets excluded from logs?
- Is authentication required?
- Are users authorised to access documents?
- Are prompts/traces treated as sensitive data?
- Are provider raw responses stored safely?
- Are uploads validated?
```

## MVP security baseline

For local portfolio MVP:

```text
- .env used for secrets
- .env.example checked in
- .env ignored
- API keys never logged
- no raw auth headers logged
- no secrets in screenshots or reports
```

## Production security requirements

```text
Authentication:
  - dashboard login
  - API authentication
  - service-to-service authentication

Authorisation:
  - workspace-level access
  - document-level permissions, if needed
  - role-based access for admin/eval/reviewer users

Secrets:
  - managed secrets store
  - key rotation
  - no secrets in logs or traces

Input security:
  - file type validation
  - size limits
  - content sanitisation
  - upload scanning, depending environment

Data security:
  - encryption at rest
  - TLS in transit
  - backup encryption
  - audit logs
```

## RAG-specific security checks

```text
- prompt injection handling
- malicious document content handling
- source trust boundaries
- system prompt leakage prevention
- citation spoofing prevention
- no arbitrary tool execution
```

## Red flags

```text
- public dashboard with no auth
- unrestricted arbitrary queries using live API key
- provider keys exposed to frontend
- prompts containing sensitive documents logged forever
- raw uploaded files stored without controls
```

---

# 7. Data readiness review

## Key question

```text
Is the source data reliable, versioned, and suitable for evaluation?
```

## What a company would check

```text
- Are documents clean and deduplicated?
- Are source references stable?
- Are document versions handled?
- Are chunks traceable to documents?
- Are embeddings tied to model/config version?
- Can documents be re-indexed safely?
- Can stale data be detected?
```

## Required checks

```text
Document quality:
  - no empty documents
  - no duplicate documents
  - document metadata exists
  - source URI/reference exists

Chunk quality:
  - chunks are non-empty
  - chunks preserve document ID
  - chunks preserve section metadata where possible
  - chunk sizes are appropriate

Embedding quality:
  - embedding model is recorded
  - missing embeddings are detectable
  - embedding dimensions are consistent

Versioning:
  - document version stored
  - prompt version stored
  - RAG config stored
  - dataset version stored
```

## Red flags

```text
- expected sources depend on unstable UUIDs only
- no document version metadata
- no checksum/deduplication
- chunks cannot be traced back to source docs
- embedding model not recorded
```

---

# 8. Operational readiness review

## Key question

```text
Can the system be operated, monitored, and debugged in production?
```

## What a company would check

```text
- Are services health-checkable?
- Are logs structured?
- Are request IDs used?
- Are trace IDs used?
- Are provider calls observable?
- Are eval run states visible?
- Are errors classified?
- Are dashboards useful for debugging?
```

## Required operational features

```text
Health checks:
  - rag-api /health
  - eval-api /health
  - database connectivity check

Logging:
  - requestId
  - traceId
  - evalRunId
  - provider
  - model
  - operation
  - latency
  - errorCode

Metrics:
  - request count
  - error rate
  - latency
  - provider failure rate
  - token usage
  - estimated cost
  - eval pass rate

Dashboards:
  - service health
  - recent failed evals
  - provider errors
  - cost trends
  - latency trends
```

## Red flags

```text
- errors only appear in terminal logs
- no request IDs
- no provider latency tracking
- no eval run progress
- failed evals are not inspectable
```

---

# 9. Reliability readiness review

## Key question

```text
Does the system fail safely?
```

## What a company would check

```text
- What happens if the LLM provider times out?
- What happens if embeddings fail?
- What happens if eval run fails halfway?
- What happens if database writes fail?
- What happens if dashboard requests stale data?
- Can failed cases be retried?
- Can eval runs resume?
```

## Required behaviours

```text
Provider failure:
  - classified error
  - no secret leakage
  - trace/error persisted
  - user receives structured error

Eval failure:
  - completed case results stay stored
  - run becomes partially_failed or failed
  - failure reason visible

Ingestion failure:
  - document status becomes failed
  - error is visible
  - no corrupted indexed state

Database failure:
  - request fails clearly
  - logs include requestId
  - no partial inconsistent writes where transactions are needed
```

## Production hardening checklist

```text
- provider timeouts
- retry policy
- rate-limit handling
- idempotent ingestion
- transactional writes
- partial eval persistence
- resumable eval runs
- dead-letter/error state, if jobs are added later
```

## Red flags

```text
- eval run crashes and loses all progress
- provider timeout hangs request indefinitely
- document status says indexed when embeddings failed
- no distinction between user error and provider error
```

---

# 10. Cost readiness review

## Key question

```text
Can the company predict and control AI provider costs?
```

## What a company would check

```text
- Is token usage tracked?
- Is estimated cost tracked?
- Are eval runs cost-capped?
- Is judge scoring optional?
- Is concurrency controlled?
- Are expensive configs visible?
- Can CI accidentally run expensive live evals?
```

## Required cost controls

```text
Per query:
  - input tokens
  - output tokens
  - estimated cost
  - model/provider

Per eval run:
  - total estimated cost
  - average cost per case
  - max cases
  - judge enabled/disabled
  - concurrency limit

CI:
  - mock providers by default
  - live eval manual or scheduled
  - small dataset for live eval
```

## Red flags

```text
- no token usage stored
- no cost estimate
- live LLM eval runs on every PR
- no max case limit
- no concurrency limit
- judge calls always enabled
```

---

# 11. Compliance and audit readiness review

## Key question

```text
Can the company explain why the system produced a given answer?
```

## What a company would check

```text
- Does every answer have a trace?
- Are retrieved chunks stored?
- Are citations stored?
- Can source documents be inspected?
- Are unsupported claims detected?
- Are eval results retained?
- Are prompt/model/config versions recorded?
```

## Required audit trail

For every answer:

```text
- question
- answer
- citations
- retrieved chunks
- source documents
- RAG config
- prompt version
- model/provider
- timestamp
- token usage
- estimated cost
```

For every eval:

```text
- dataset version
- test cases
- expected answers
- expected sources
- trace IDs
- scores
- verdicts
- failure types
- judge prompt version
```

## Red flags

```text
- no trace per answer
- no citation validation
- no prompt version
- no source document metadata
- no way to inspect failed answers
```

---

# 12. CI/CD readiness review

## Key question

```text
Can changes be released safely and repeatably?
```

## What a company would check

```text
- Does CI run tests?
- Do migrations run in CI?
- Do Docker builds work?
- Are services smoke-tested?
- Are quality gates automated?
- Are eval reports generated?
- Can releases be rolled back?
```

## Required CI gates

```text
Standard CI:
  - lint
  - typecheck
  - unit tests
  - integration tests
  - dashboard build

Database:
  - migration smoke test

Docker:
  - build images
  - start services
  - health checks

RAG quality:
  - deterministic eval gate
  - live eval manual/scheduled
  - report artefacts
```

## Red flags

```text
- migrations only tested manually
- no Docker smoke test
- no deterministic RAG quality gate
- no eval report artefacts
- live provider calls required for every PR
```

---

# 13. Support readiness review

## Key question

```text
Can engineers investigate and resolve user issues?
```

## Common support scenarios

```text
User says:
  The answer is wrong.

Engineer needs:
  traceId
  retrieved chunks
  citations
  expected source, if eval case
  provider call info
  model/prompt/config version

User says:
  The system is slow.

Engineer needs:
  latency breakdown
  provider latency
  retrieval latency
  token usage
  model used

User says:
  Eval run failed.

Engineer needs:
  evalRunId
  failed case IDs
  provider errors
  partial results
  logs with requestId
```

## Required support tooling

```text
- trace detail page
- failed case detail page
- eval run status
- provider error visibility
- request IDs in logs
- structured error responses
```

## Red flags

```text
- support requires database spelunking
- no trace IDs exposed
- no failed case details
- provider errors are generic
```

---

# 14. Performance readiness review

## Key question

```text
Does the system meet acceptable latency for the intended use case?
```

## What a company would check

```text
- average query latency
- p95 query latency
- retrieval latency
- generation latency
- eval run duration
- dashboard page load time
```

## MVP acceptable targets

For local/sample corpus:

```text
query latency:
  under 10 seconds, provider-dependent

dashboard page load:
  under 2 seconds for MVP dataset

eval run:
  can be slow, but progress should be visible
```

## Production targets would depend on use case

Internal assistant:

```text
query latency:
  3 to 10 seconds may be acceptable
```

Customer-facing assistant:

```text
query latency:
  stricter, often under 3 to 5 seconds
```

## Red flags

```text
- no latency stored
- no visibility into provider latency
- eval run blocks the API
- dashboard loads all traces/results without pagination
```

---

# 15. Scalability readiness review

## Key question

```text
Can the architecture scale beyond the demo without redesigning everything?
```

## What a company would check

```text
- Can ingestion become async?
- Can eval runs use controlled concurrency?
- Can retrieval be improved?
- Can Postgres handle expected vector volume?
- Can services scale independently?
- Can providers be swapped?
```

## MVP is allowed to be simple

Acceptable MVP choices:

```text
- synchronous ingestion
- sequential eval runs
- vector-only retrieval
- single Postgres database
- one provider
```

But production planning should explain how each evolves:

```text
synchronous ingestion
  -> async ingestion jobs

sequential eval
  -> controlled concurrency and resumable runs

vector retrieval
  -> hybrid retrieval and reranking

single provider
  -> provider abstraction

single DB
  -> separate DBs or dedicated vector DB if needed
```

## Red flags

```text
- no clear path to async ingestion
- no provider abstraction
- no retrieval abstraction
- eval-api tightly coupled to rag-api internals
```

---

# 16. Dashboard readiness review

## Key question

```text
Can users understand system behaviour without reading logs?
```

## What a company would check

```text
- Can a user inspect documents?
- Can a user inspect query traces?
- Can a user inspect eval runs?
- Can a user inspect failed cases?
- Can a user compare runs?
- Are loading/empty/error states handled?
```

## Critical dashboard screens

```text
1. Query Trace Detail
2. Eval Run Detail
3. Failed Case Detail
4. Run Comparison Detail
```

## Production readiness checklist

```text
- tables are paginated
- filters exist for failures
- failed cases are obvious
- score labels are clear
- source chunks are readable
- trace links are direct
- errors are human-readable
```

## Red flags

```text
- dashboard only has overview charts
- no failed case detail
- no source chunk preview
- no link from eval result to trace
```

---

# 17. API readiness review

## Key question

```text
Are the APIs stable, predictable, and safe to consume?
```

## What a company would check

```text
- Are endpoints versioned?
- Are request/response schemas documented?
- Are errors standardised?
- Is pagination supported?
- Are list endpoints filterable?
- Are IDs consistent?
- Are breaking changes controlled?
```

## Required standards

```text
- /api/v1 prefix
- JSON camelCase API responses
- standard error shape
- requestId in errors
- pagination for lists
- OpenAPI specs or equivalent docs
```

## Red flags

```text
- inconsistent response shapes
- raw provider errors returned
- no API versioning
- list endpoints return everything
- no validation layer
```

---

# 18. Database readiness review

## Key question

```text
Is the database schema safe, indexed, and maintainable?
```

## What a company would check

```text
- Are migrations repeatable?
- Are important tables indexed?
- Are relationships clear?
- Are JSONB fields documented?
- Are destructive migrations avoided?
- Is data retention considered?
```

## Required indexes

```text
rag.documents(status)
rag.document_chunks(document_id)
rag.query_traces(created_at)
rag.query_trace_chunks(trace_id)
rag.query_trace_citations(trace_id)
eval.eval_runs(created_at)
eval.eval_case_results(eval_run_id)
eval.eval_case_results(test_case_id)
```

Vector index once data grows:

```text
pgvector ivfflat or hnsw index depending version/support
```

## Red flags

```text
- no migrations
- manual DB setup
- no indexes on trace/result tables
- no created_at timestamps
- no status fields
```

---

# 19. Pre-production review meeting

A real company would likely hold a formal review with engineering, product, security, and operations.

## Review attendees

```text
- tech lead
- backend engineer
- AI engineer
- frontend engineer
- product manager
- platform/DevOps engineer
- security reviewer
- compliance/risk reviewer, if relevant
```

## Review artefacts

```text
- architecture diagram
- API contracts
- data model
- evaluation methodology
- release plan
- CI/CD plan
- risk register
- security checklist
- demo recording
- eval report
```

## Review questions

```text
Product:
  Is the workflow useful and understandable?

Engineering:
  Are service boundaries clean?

AI quality:
  Are evals meaningful and stable?

Security:
  Are secrets and documents protected?

Operations:
  Can we monitor and recover from failures?

Cost:
  Can we estimate and control provider spend?

Compliance:
  Can we explain answer provenance?

Release:
  Can we roll back safely?
```

---

# 20. Go / no-go checklist

## Go criteria

```text
- Core user flows work end to end
- Query trace coverage is 100%
- Eval dataset runs successfully
- Failed cases are inspectable
- Citation validity is above threshold
- Provider errors are handled safely
- CI passes
- Migrations pass
- Docker smoke test passes
- Secrets are not exposed
- Known limitations documented
```

## No-go criteria

```text
- answers are not traceable
- eval runs fail unpredictably
- citations cannot be validated
- API keys exposed in logs/frontend
- live eval costs are uncontrolled
- dashboard cannot inspect failures
- migrations are unreliable
- no recovery path for failed eval runs
```

---

# 21. Production readiness scorecard

A company may use a scorecard like this.

| Area              |   Status | Required before production             |
| ----------------- | -------: | -------------------------------------- |
| Product workflows | Required | Core flows complete                    |
| RAG quality       | Required | Eval thresholds met                    |
| Traceability      | Required | 100% query trace coverage              |
| Evaluation        | Required | Golden dataset and reports             |
| Security          | Required | Auth/secrets/logging controls          |
| Data model        | Required | Stable migrations and indexes          |
| Observability     | Required | Logs, request IDs, health checks       |
| Reliability       | Required | Timeout/retry/partial failure handling |
| Cost control      | Required | Token/cost tracking and limits         |
| CI/CD             | Required | Tests, migrations, smoke, quality gate |
| Dashboard         | Required | Trace/eval/failure inspection          |
| Documentation     | Required | Setup, architecture, limitations       |

---

# 22. MVP vs real production distinction

For the portfolio MVP, it is acceptable to say:

```text
This is production-style, not production-deployed.
```

MVP can reasonably exclude:

```text
- full auth
- enterprise RBAC
- multi-tenancy
- cloud deployment
- async ingestion
- autoscaling
- complete data retention policies
```

But MVP should still include:

```text
- clean architecture
- traceability
- eval methodology
- deterministic scoring
- failure analysis
- cost/latency tracking
- CI-ready quality gate design
```

That distinction is important and honest.

---

# 23. Final production review summary

Before production, a company would not be satisfied that RAGLens simply answers questions.

They would require confidence that:

```text
- the system retrieves the right evidence
- answers are grounded
- citations are real and traceable
- unsupported claims are detectable
- regressions are caught before release
- failures are inspectable
- provider costs are controlled
- secrets and documents are protected
- services can be monitored and recovered
- releases are repeatable
```

The strongest production-readiness statement for RAGLens is:

```text
RAGLens is production-ready only when every answer is traceable, every trace is evaluable, every eval is reproducible, every failure is diagnosable, and every change can be measured before release.
```
