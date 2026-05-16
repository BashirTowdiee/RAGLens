---
title: "Product Discovery"
description: "Discovery findings, target users, and product opportunities for RAGLens."
order: 2
section: "Product"
status: "stable"
---
# Product discovery: RAGLens

## 1. Product summary

**RAGLens** is a production-style RAG platform for building, testing, observing, and improving source-grounded AI systems.

It has three main parts:

```text
rag-api
  TypeScript + Fastify
  Handles document ingestion, chunking, embeddings, retrieval, answer generation, citations, and query tracing.

eval-api
  Python + FastAPI
  Handles evaluation datasets, golden test cases, scoring, regression testing, and CI quality gates.

dashboard
  Next.js
  Provides trace inspection, eval run views, failed-case analysis, source previews, metrics, and run comparison.
```

The product is not just a chatbot over documents. It is a system for answering:

```text
Can this RAG system be trusted, measured, debugged, and improved over time?
```

---

# 2. Problem statement

Companies are adding LLM-powered search and assistants over internal knowledge bases, but most teams struggle with production reliability.

They can build a prototype quickly, but then they hit harder questions:

```text
- Did the system retrieve the right documents?
- Is the answer actually supported by the retrieved context?
- Are the citations real?
- Did a prompt change improve or degrade quality?
- Which questions fail repeatedly?
- How much does each query cost?
- Why did quality drop after a model or retrieval change?
- Can we block bad changes before deployment?
```

Most RAG systems fail not because they cannot generate answers, but because teams cannot **measure, explain, or debug answer quality**.

RAGLens solves that by combining:

```text
- a source-grounded RAG API
- complete query traces
- versioned evaluation datasets
- deterministic metrics
- LLM-as-judge scoring
- cost and latency tracking
- regression comparison
- CI quality gates
```

---

# 3. Product vision

## Vision statement

```text
RAGLens helps engineering teams build trustworthy RAG systems by making every answer traceable, measurable, and testable before deployment.
```

## Long-term vision

RAGLens becomes a reusable platform that can evaluate any RAG system as a black box.

In the long term, it should be possible to point RAGLens at:

```text
- an internal knowledge assistant
- a support assistant
- a policy assistant
- an engineering documentation assistant
- a product documentation assistant
```

and get back:

```text
- retrieval quality
- answer quality
- citation quality
- latency
- cost
- regressions
- failure explanations
```

---

# 4. Product positioning

## Poor positioning

```text
A chatbot over documents.
```

## Better positioning

```text
A production-grade RAG evaluation and observability platform.
```

## Best positioning

```text
A source-grounded RAG platform with an isolated Python evaluation service for measuring retrieval quality, groundedness, citation support, cost, latency, and regressions across prompts, models, and retrieval strategies.
```

## Portfolio positioning

```text
Built RAGLens, a production-style RAG evaluation platform using a TypeScript Fastify RAG API, Python FastAPI evaluation service, PostgreSQL/pgvector, and a Next.js dashboard. The system provides document ingestion, source-grounded answers, query traces, golden evaluation datasets, deterministic metrics, LLM-as-judge scoring, cost tracking, latency tracking, regression comparison, and CI quality gates.
```

---

# 5. Target users

## 5.1 AI engineer

### Profile

An engineer responsible for improving RAG quality.

### Goals

```text
- compare retrieval strategies
- compare prompt versions
- compare models
- inspect failed answers
- understand why retrieval failed
- measure groundedness and citation quality
```

### Pain points

```text
- RAG failures are hard to diagnose
- LLM outputs are inconsistent
- prompt changes can silently regress quality
- citations can look correct but be unsupported
- evals are often manual or notebook-based
```

### Needs

```text
- test datasets
- run comparison
- detailed traces
- source previews
- repeatable scoring
```

---

## 5.2 Product engineer

### Profile

An engineer integrating RAG into a product feature.

### Goals

```text
- call a stable API
- receive a structured answer
- display citations
- handle errors predictably
- show trace IDs for support/debugging
```

### Pain points

```text
- unclear response contracts
- hard-to-debug model failures
- inconsistent output shape
- missing citations
- unexpected latency/cost
```

### Needs

```text
- typed API contracts
- predictable error handling
- citation structure
- cost and latency metadata
```

---

## 5.3 Platform engineer

### Profile

An engineer operating services in production.

### Goals

```text
- keep user-facing traffic isolated from heavy eval workloads
- monitor latency and failure rates
- control provider costs
- manage rate limits
- debug incidents
```

### Pain points

```text
- long-running evals can overload services
- provider calls can fail or timeout
- rate limits can disrupt live queries
- no easy way to inspect historical behaviour
```

### Needs

```text
- isolated eval-api
- request IDs
- trace IDs
- structured logs
- persisted run state
- retry and timeout policies
```

---

## 5.4 Risk / compliance reviewer

### Profile

A stakeholder who cares whether AI answers are auditable and source-backed.

### Goals

```text
- verify that answers come from approved sources
- inspect cited evidence
- detect unsupported claims
- audit answer history
```

### Pain points

```text
- AI answers are hard to trust
- citations may be decorative rather than supportive
- no clear audit trail
```

### Needs

```text
- citation validity
- citation support scoring
- source previews
- trace history
- unsupported claim detection
```

---

# 6. Jobs to be done

## Job 1: Evaluate whether a RAG system is safe to release

```text
When I change a prompt, model, or retrieval configuration,
I want to run a repeatable evaluation suite,
so that I can know whether quality improved or regressed before deploying.
```

## Job 2: Debug a bad answer

```text
When a RAG answer looks wrong,
I want to inspect the retrieved chunks, prompt, citations, and judge notes,
so that I can identify whether the problem was retrieval, generation, citation, or missing source data.
```

## Job 3: Compare two RAG configurations

```text
When I experiment with vector-only vs hybrid retrieval,
I want to compare retrieval recall, groundedness, citation support, latency, and cost,
so that I can choose the best configuration with evidence.
```

## Job 4: Prove citations are meaningful

```text
When an answer includes citations,
I want to verify that the cited chunks actually support the claims,
so that users are not misled by false confidence.
```

## Job 5: Track operational impact

```text
When model or retrieval settings change,
I want to see cost and latency impact,
so that quality improvements do not create unacceptable operational costs.
```

---

# 7. User scenarios

## Scenario 1: Prompt regression

An engineer updates the answer prompt from `answer-v1` to `answer-v2`.

They run the same dataset against both versions.

RAGLens shows:

```text
answer-v1:
  pass rate: 78%
  groundedness: 0.81
  citation support: 0.76
  average cost: $0.008

answer-v2:
  pass rate: 85%
  groundedness: 0.89
  citation support: 0.84
  average cost: $0.009
```

Outcome:

```text
The new prompt improves quality with a small acceptable cost increase.
```

---

## Scenario 2: Retrieval failure

A test case fails.

Expected source:

```text
remote-work-policy-v2.md
```

Retrieved sources:

```text
expense-policy.md
onboarding-policy.md
remote-work-policy-v1.md
```

RAGLens shows:

```text
Failure type:
  retrieval_miss

Explanation:
  The expected source was not retrieved in top 10. The answer was generated from stale policy v1.
```

Outcome:

```text
The engineer adjusts metadata filtering or retrieval strategy.
```

---

## Scenario 3: Unsupported answer

Question:

```text
Does the company allow unlimited remote work from overseas?
```

Expected behaviour:

```text
Refuse or say the documents do not support that claim.
```

Generated answer:

```text
The company allows unlimited overseas remote work with manager approval.
```

RAGLens flags:

```text
unsupported_claims:
  - "unlimited overseas remote work"
  - "with manager approval"

citation_support:
  0.12

verdict:
  fail
```

Outcome:

```text
The team improves the refusal prompt and no-answer handling.
```

---

## Scenario 4: Cost increase

A reranker is enabled.

Quality improves, but cost increases.

```text
without reranker:
  pass rate: 78%
  avg latency: 1.9s
  avg cost: $0.006

with reranker:
  pass rate: 86%
  avg latency: 3.1s
  avg cost: $0.012
```

Outcome:

```text
The team decides whether the quality lift justifies the cost.
```

---

# 8. Core value proposition

RAGLens provides value in four ways.

## 8.1 Trust

Answers are tied to source chunks and citations.

## 8.2 Debuggability

Every query has a trace.

## 8.3 Repeatability

Golden datasets allow repeatable quality checks.

## 8.4 Change safety

CI quality gates prevent silent regressions.

---

# 9. Product principles

## 9.1 Evidence first

The system should prioritise evidence over plausible language.

If the evidence is insufficient, the system should say so.

## 9.2 Trace everything important

A RAG answer without a trace is hard to debug.

Every query should record:

```text
- input question
- retrieval config
- retrieved chunks
- final context
- prompt version
- model/provider
- answer
- citations
- usage
- latency
- cost
```

## 9.3 Separate serving from evaluation

User-facing RAG traffic and evaluation workloads should be isolated.

That is why:

```text
rag-api = TypeScript, user/product-facing
eval-api = Python, long-running quality/evaluation workflows
```

## 9.4 Start deterministic, add LLM judge later

Deterministic metrics are cheaper, repeatable, and easier to trust.

LLM-as-judge should supplement, not replace, deterministic checks.

## 9.5 Make failures useful

A failed eval should explain what failed:

```text
- retrieval failure
- citation failure
- groundedness failure
- correctness failure
- missing source data
- stale document issue
- refusal failure
```

---

# 10. Key assumptions

## Product assumptions

```text
- Teams want RAG systems that are testable, not just demoable.
- Engineers need visibility into retrieval and citation failures.
- Prompt/model/retrieval changes can cause regressions.
- CI quality gates are useful for production AI workflows.
```

## Technical assumptions

```text
- Postgres + pgvector is sufficient for MVP scale.
- Markdown/text documents are enough for the first version.
- OpenAI can be the first provider.
- Python is better suited for evaluation and scoring.
- TypeScript is better suited for product API and dashboard integration.
```

## User assumptions

```text
- Initial users are technical.
- Users are comfortable with datasets, traces, configs, and metrics.
- A polished internal-tool-style dashboard is enough for MVP.
```

---

# 11. Questions to validate

Before building too much, a company would validate these.

## Product questions

```text
- Which failure type matters most: retrieval, citation, groundedness, or cost?
- Who is the first target user: AI engineer, product engineer, or platform engineer?
- Should the MVP optimise for demo value or operational realism?
- What minimum dashboard is needed to explain failures clearly?
```

## Evaluation questions

```text
- What is a good enough golden dataset size for the MVP?
- How should expected sources be represented?
- How strict should citation support scoring be?
- What thresholds should fail CI?
- How much should we trust LLM-as-judge scores?
```

## Technical questions

```text
- Should eval-api read traces through rag-api or directly from Postgres?
- Should prompt versions live in code, database, or both?
- Should RAG configs be editable through the dashboard?
- Should embedding generation be synchronous or job-based?
- Should eval runs execute sequentially first or with controlled concurrency?
```

Recommended initial answers:

```text
- eval-api should call rag-api for traces first, to preserve black-box evaluation.
- prompt versions should start in code/config files and be stored in query traces.
- RAG configs should start as seed/config records.
- embedding generation can be synchronous for MVP, then moved to jobs later.
- eval runs should execute sequentially first, then add concurrency controls.
```

---

# 12. Competitive landscape

This project overlaps with several categories.

## RAG frameworks

Examples:

```text
- LangChain
- LlamaIndex
```

They help build RAG pipelines.

RAGLens differentiates by focusing on:

```text
- traceability
- black-box evaluation
- regression testing
- dashboarded failure analysis
```

## Observability tools

Examples:

```text
- Langfuse
- LangSmith
- Braintrust
```

They offer tracing and evaluation capabilities.

RAGLens differentiates as a portfolio/product by showing that you can build the core mechanics yourself:

```text
- custom RAG service
- custom evaluation service
- custom database model
- custom CI quality gate
```

## Evaluation libraries

Examples:

```text
- RAGAS
- DeepEval
```

They provide scoring frameworks.

RAGLens can integrate them later, but the MVP should include custom deterministic metrics to show engineering understanding.

---

# 13. MVP definition

## MVP goal

Prove that RAGLens can:

```text
1. ingest documents
2. answer questions with citations
3. store query traces
4. run golden test cases
5. score retrieval/citation/answer quality
6. inspect failures in a dashboard
```

## MVP corpus

Use a synthetic internal company knowledge base.

Example:

```text
sample-company-knowledge-base/
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

## MVP test cases

Create 20 to 30 golden questions.

Include:

```text
- factual questions
- comparison questions
- temporal/version questions
- multi-hop questions
- no-answer questions
- citation-sensitive questions
```

Example test cases:

```text
Factual:
  What is the approval process for remote work longer than two weeks?

Comparison:
  What changed between remote-work-policy-v1 and remote-work-policy-v2?

Temporal:
  What was the remote work rule before the 2025 update?

Multi-hop:
  If a mobile release fails after deployment, who should be notified and what rollback steps apply?

No-answer:
  Does the company allow unlimited overseas remote work?

Citation-sensitive:
  What evidence supports the refund escalation process?
```

---

# 14. MVP feature scope

## In scope

### rag-api

```text
- health endpoint
- document ingestion for text/markdown
- chunking
- embedding generation
- pgvector storage
- vector retrieval
- answer generation
- citation output
- query trace persistence
- trace fetch endpoint
```

### eval-api

```text
- health endpoint
- dataset creation
- test case creation
- eval run creation
- calls to rag-api
- trace fetching
- raw result storage
- deterministic retrieval metrics
- deterministic citation metrics
- basic LLM-as-judge scoring
```

### dashboard

```text
- document list
- query trace detail
- eval dataset list
- eval run list
- eval run detail
- failed case detail
- source chunk preview
```

---

## Out of scope

```text
- user accounts
- multi-tenancy
- PDF OCR
- large-scale ingestion
- Kubernetes
- enterprise RBAC
- streaming answers
- advanced workflow automation
- fine-tuning
- agents
- public web crawling
```

---

# 15. Success metrics

## Product success metrics

```text
- A reviewer can understand why an answer passed or failed.
- A user can compare two RAG configs.
- A user can trace every answer back to source chunks.
- A CI run can fail when quality thresholds are not met.
```

## Technical success metrics

```text
- 100% of query responses include trace IDs.
- 100% of cited chunks exist.
- 100% of eval case results link to traces.
- Eval runs persist partial results.
- Deterministic metrics can run without an LLM judge.
```

## MVP demo metrics

```text
- 10 documents indexed
- 20 golden test cases
- 2 RAG configurations compared
- at least 1 failed case inspected
- cost and latency shown per run
```

---

# 16. Key workflows in detail

## 16.1 Document ingestion workflow

### User action

Upload or seed documents.

### System behaviour

```text
1. Validate document input.
2. Store document metadata.
3. Normalise text.
4. Split into chunks.
5. Generate embeddings.
6. Store chunks and embeddings.
7. Mark document as indexed.
```

### Failure states

```text
- invalid document format
- empty document
- embedding provider failure
- database insert failure
```

### Acceptance criteria

```text
- valid markdown document can be ingested
- chunks are created
- embeddings are stored
- document appears in dashboard
- ingestion errors are visible
```

---

## 16.2 Query workflow

### User action

Ask a question.

### System behaviour

```text
1. Validate question.
2. Embed query.
3. Retrieve top K chunks.
4. Build context.
5. Generate answer.
6. Attach citations.
7. Persist trace.
8. Return answer, citations, usage, latency, trace ID.
```

### Failure states

```text
- no chunks found
- embedding provider failure
- LLM provider failure
- answer cannot be grounded
```

### Acceptance criteria

```text
- response includes answer
- response includes citations
- response includes traceId
- trace stores retrieved chunks
- trace stores model/provider/prompt version
```

---

## 16.3 Eval run workflow

### User action

Start an eval run.

### System behaviour

```text
1. Load dataset.
2. Create eval run with status running.
3. For each test case:
   - call rag-api /query
   - fetch trace
   - calculate retrieval metrics
   - calculate citation metrics
   - run LLM judge
   - store case result
4. Aggregate summary scores.
5. Mark run completed or failed.
```

### Failure states

```text
- rag-api unavailable
- provider timeout
- malformed judge response
- partial run failure
```

### Acceptance criteria

```text
- run status is visible
- each completed case stores result
- failures do not erase prior results
- run summary is calculated
```

---

## 16.4 Failed case analysis workflow

### User action

Open failed eval case.

### System shows

```text
- question
- expected answer
- generated answer
- expected sources
- retrieved chunks
- citations
- judge scores
- unsupported claims
- missing important points
- latency and cost
```

### Acceptance criteria

```text
- user can tell whether the issue was retrieval, citation, or generation
```

---

# 17. Dashboard information architecture

## Navigation

```text
Documents
Traces
Datasets
Eval Runs
Comparisons
Settings
```

## Documents

Purpose:

```text
Inspect what has been indexed.
```

Fields:

```text
- title
- type
- status
- chunk count
- indexed date
- metadata
```

## Traces

Purpose:

```text
Inspect individual RAG queries.
```

Fields:

```text
- question
- answer
- model
- provider
- prompt version
- latency
- cost
- citations
```

## Eval Runs

Purpose:

```text
Inspect quality runs.
```

Fields:

```text
- dataset
- RAG config
- status
- pass rate
- groundedness
- citation support
- recall@k
- cost
- latency
```

## Failed Case Detail

Purpose:

```text
Explain failure.
```

Sections:

```text
- expected vs actual
- retrieved context
- citation check
- judge explanation
- trace metadata
```

## Comparisons

Purpose:

```text
Compare two runs.
```

Fields:

```text
- pass rate delta
- recall delta
- groundedness delta
- citation delta
- cost delta
- latency delta
- improved cases
- regressed cases
```

---

# 18. Evaluation methodology

## Deterministic metrics

These should exist first.

### Retrieval hit@k

```text
Did at least one expected source appear in top K retrieved chunks?
```

### Retrieval recall@k

```text
How many expected sources appeared in top K?
```

### Expected source rank

```text
Where did the first expected source appear?
```

### Citation validity

```text
Do cited chunk IDs exist?
```

### Citation traceability

```text
Were cited chunks included in retrieved context?
```

These are cheap and reliable.

---

## LLM-as-judge metrics

These come after deterministic metrics.

### Groundedness

```text
Does the answer rely only on retrieved context?
```

### Correctness

```text
Does the answer accurately answer the question?
```

### Completeness

```text
Does the answer include the key expected points?
```

### Citation support

```text
Do the citations support the answer claims?
```

### Refusal quality

```text
When context is insufficient, does the system refuse correctly?
```

---

## Verdict calculation

Example:

```text
pass if:
  retrieval_hit_at_5 == true
  citation_validity >= 0.95
  groundedness >= 0.85
  correctness >= 0.80

fail otherwise
```

The exact thresholds should be configurable.

---

# 19. Key risks

## Risk 1: Scope creep

The product can become too large.

### Mitigation

Keep MVP focused on:

```text
text docs
query traces
eval runs
scoring
dashboard inspection
```

---

## Risk 2: Evaluation scores are noisy

LLM judges can be inconsistent.

### Mitigation

```text
- use deterministic metrics first
- version evaluator prompts
- store judge explanations
- support manual review later
```

---

## Risk 3: Dashboard consumes too much time

A polished UI can slow the core build.

### Mitigation

Use simple tables and detail pages first.

Do not build complex charts until the backend is useful.

---

## Risk 4: Python/TypeScript integration overhead

Two services add complexity.

### Mitigation

```text
- use HTTP boundaries
- use OpenAPI contracts
- use Docker Compose
- keep eval-api small initially
```

---

## Risk 5: Provider costs

Eval runs can generate many LLM calls.

### Mitigation

```text
- start with small datasets
- track token usage
- add max test cases per run
- add concurrency limits
- add cost estimates before running large evals
```

---

# 20. Validation plan

## Before building

Validate the concept by writing:

```text
- 10 sample documents
- 20 sample questions
- expected answers
- expected sources
```

If you cannot create meaningful expected answers and sources, the product will not evaluate well.

## Prototype validation

Build a minimal script that:

```text
1. loads documents
2. chunks them
3. retrieves chunks
4. asks an LLM
5. stores answer and retrieved chunks
```

Then manually inspect 10 outputs.

## MVP validation

Run two configs:

```text
config A:
  vector-only retrieval

config B:
  hybrid retrieval or different topK
```

Compare:

```text
- pass rate
- retrieval hit@k
- groundedness
- citation support
- cost
- latency
```

If the comparison is useful, the product is validated.

---

# 21. Product milestones

## Milestone 1: Discovery complete

Deliverables:

```text
- product brief
- users
- workflows
- MVP scope
- non-goals
- sample corpus outline
```

## Milestone 2: Architecture complete

Deliverables:

```text
- architecture diagram
- API contracts
- database schema
- ADRs
- service boundary rules
```

## Milestone 3: RAG core complete

Deliverables:

```text
- document ingestion
- chunking
- embeddings
- vector retrieval
- cited answers
- query traces
```

## Milestone 4: Eval core complete

Deliverables:

```text
- datasets
- test cases
- eval runs
- deterministic metrics
```

## Milestone 5: Judge scoring complete

Deliverables:

```text
- groundedness
- correctness
- completeness
- citation support
- failure notes
```

## Milestone 6: Dashboard complete

Deliverables:

```text
- trace viewer
- eval run viewer
- failed case explorer
```

## Milestone 7: Regression/CI complete

Deliverables:

```text
- run comparison
- GitHub Actions quality gate
```

---

# 22. Open questions

These should be resolved during discovery or early architecture.

## Product

```text
- Is the primary demo audience recruiters, hiring managers, or technical interviewers?
- Should the first dataset be HR/policy-heavy or engineering-doc-heavy?
- Should the dashboard prioritise visual polish or debugging depth?
```

## Technical

```text
- Kysely, Drizzle, or Prisma for TypeScript database access?
- Alembic or SQL migrations shared across services?
- Should eval-api read traces via rag-api only, or directly from Postgres for run efficiency?
- Should embeddings be generated synchronously at first?
- Which OpenAI models should be used for generation and judging?
```

## Evaluation

```text
- How strict should citation support be?
- How should partial correctness be scored?
- How should no-answer/refusal cases be represented?
- Should thresholds be global or dataset-specific?
```

---

# 23. Recommended discovery outputs to create in the repo

```text
docs/
  product/
    product-brief.md
    users-and-personas.md
    jobs-to-be-done.md
    mvp-scope.md
    workflows.md
    success-metrics.md
    risks.md

  architecture/
    system-overview.md
    service-boundaries.md
    data-model.md
    api-contracts.md
    evaluation-methodology.md

  decisions/
    001-typescript-rag-api-python-eval-api.md
    002-postgres-pgvector.md
    003-black-box-evaluation.md
    004-deterministic-metrics-first.md
```

---

# 24. Final product discovery summary

RAGLens should be built as a production-style platform for **trustworthy RAG systems**.

The product exists because teams need more than a working chatbot. They need a way to know whether their RAG system is:

```text
- retrieving the right sources
- answering from evidence
- citing correctly
- avoiding unsupported claims
- staying reliable across changes
- operating within cost and latency limits
```

The MVP should focus on a controlled internal company knowledge base, not a large public dataset.

The first successful version should demonstrate:

```text
1. document ingestion
2. source-grounded answers
3. complete query traces
4. golden eval datasets
5. deterministic retrieval/citation metrics
6. LLM-as-judge scoring
7. failed-case inspection
8. run comparison
9. CI quality gating
```

The most important product insight is this:

```text
The answer is not the product. The ability to prove, inspect, and improve the answer is the product.
```
