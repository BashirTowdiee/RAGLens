---
title: "Product Requirements"
description: "Product requirements and scope definition for RAGLens."
order: 3
section: "Product"
status: "stable"
---
# Product Requirements Document: RAGLens

## 1. Product name

**RAGLens**

## 2. Product summary

RAGLens is a production-style RAG platform that helps engineering teams build, evaluate, observe, and improve source-grounded AI systems.

It consists of:

```text
rag-api
  TypeScript + Fastify
  Handles document ingestion, chunking, embeddings, retrieval, answer generation, citations, and query traces.

eval-api
  Python + FastAPI
  Handles evaluation datasets, golden test cases, scoring, regression testing, and CI quality gates.

dashboard
  Next.js
  Provides trace inspection, eval run views, failed-case analysis, source previews, metrics, and run comparisons.
```

The product is designed to answer one core question:

```text
Can we prove this RAG system is retrieving the right information, answering from evidence, citing correctly, and not regressing over time?
```

---

# 3. Problem statement

Teams can build RAG prototypes quickly, but production systems require more than answers.

They need to know:

```text
- whether the answer is grounded
- whether the right documents were retrieved
- whether citations are valid
- whether citations actually support the answer
- whether prompt/model/retrieval changes cause regressions
- how much each answer costs
- how long each query takes
- why a specific answer failed
```

Most RAG systems lack:

```text
- proper query traces
- golden evaluation datasets
- repeatable scoring
- citation validation
- regression comparison
- CI quality gates
- useful failure inspection
```

RAGLens solves this by pairing a source-grounded RAG API with a separate Python evaluation service and an inspection dashboard.

---

# 4. Product goals

## Goal 1: Provide source-grounded answers

The RAG API must answer user questions using retrieved source chunks and return citations.

## Goal 2: Make every answer traceable

Every generated answer must have a trace showing:

```text
- original question
- retrieved chunks
- chunk scores
- prompt version
- model/provider
- final answer
- citations
- token usage
- estimated cost
- latency
```

## Goal 3: Evaluate answer quality

The Eval API must run golden test cases against the RAG API and score:

```text
- retrieval quality
- citation validity
- citation support
- groundedness
- correctness
- completeness
- refusal quality
```

## Goal 4: Detect regressions

The system must compare evaluation runs and show whether a change improved or degraded quality, cost, or latency.

## Goal 5: Support CI quality gates

The system must support automated evaluation in CI so changes can fail when quality drops below configured thresholds.

## Goal 6: Provide useful failure analysis

The dashboard must make it clear whether a failed answer was caused by:

```text
- retrieval failure
- citation failure
- unsupported answer
- incomplete answer
- stale or missing source data
- provider error
- prompt weakness
```

---

# 5. Non-goals

The MVP will not include:

```text
- large public archive ingestion
- PDF OCR at scale
- agents
- fine-tuning
- user accounts
- multi-tenancy
- enterprise RBAC
- Kubernetes
- streaming answers
- complex event-driven architecture
- public web crawling
- production billing
```

The MVP should focus on a controlled internal company knowledge base using markdown and text files.

---

# 6. Target users

## 6.1 AI engineer

Needs:

```text
- evaluate RAG quality
- compare prompts
- compare models
- compare retrieval configs
- inspect failed cases
- measure groundedness and citation support
```

Primary workflows:

```text
- create eval dataset
- run eval
- compare two runs
- inspect failures
```

---

## 6.2 Product engineer

Needs:

```text
- stable API for source-grounded answers
- structured response format
- citations
- trace IDs
- predictable errors
```

Primary workflows:

```text
- call /query
- display citations
- retrieve trace for debugging
```

---

## 6.3 Platform engineer

Needs:

```text
- service isolation
- logs and traces
- provider error visibility
- cost and latency tracking
- safe CI gates
```

Primary workflows:

```text
- inspect provider failures
- review latency and cost metrics
- debug failed eval runs
```

---

## 6.4 Risk/compliance reviewer

Needs:

```text
- audit answer provenance
- inspect source chunks
- verify citations
- detect unsupported claims
```

Primary workflows:

```text
- open answer trace
- review citations
- review unsupported-claim notes
```

---

# 7. User stories

## RAG API

### Story RAG-1: Ingest documents

As a product engineer, I want to ingest markdown/text documents so that they can be searched by the RAG system.

Acceptance criteria:

```text
- POST /documents/ingest accepts title, content, document type, and metadata.
- The document is stored in rag.documents.
- The document content is chunked.
- Chunks are stored in rag.document_chunks.
- Embeddings are generated for each chunk.
- Invalid input returns a validation error.
- Empty documents are rejected.
```

---

### Story RAG-2: Ask a question

As a user, I want to ask a question over indexed documents so that I can receive a source-grounded answer.

Acceptance criteria:

```text
- POST /query accepts a question and optional RAG config.
- The system retrieves relevant chunks.
- The system generates an answer using retrieved chunks.
- The response includes answer, citations, traceId, latency, token usage, and estimated cost.
- If there is insufficient evidence, the answer should say so.
```

---

### Story RAG-3: Return citations

As a user, I want answers to include citations so that I can verify the evidence.

Acceptance criteria:

```text
- Every citation includes documentId, chunkId, title, and optional section metadata.
- Citations refer to chunks that exist.
- Citations can be opened in the dashboard.
- The API response uses a predictable citation schema.
```

---

### Story RAG-4: Persist query traces

As an engineer, I want every query to have a trace so that I can debug behaviour later.

Acceptance criteria:

```text
- Every /query response includes traceId.
- Trace stores original question.
- Trace stores retrieved chunks and their scores.
- Trace stores final answer.
- Trace stores citations.
- Trace stores provider, model, prompt version, token usage, estimated cost, and latency.
- GET /queries/:traceId returns trace detail.
```

---

### Story RAG-5: Manage RAG configurations

As an AI engineer, I want to define RAG configs so that I can compare retrieval and model settings.

Acceptance criteria:

```text
- RAG config can include model, provider, embedding model, topK, retrieval mode, prompt version, and chunking strategy metadata.
- Query traces store the config used.
- Eval runs can reference a specific RAG config.
```

---

## Eval API

### Story EVAL-1: Create evaluation dataset

As an AI engineer, I want to create a dataset of golden test cases so that I can repeatedly evaluate RAG quality.

Acceptance criteria:

```text
- POST /datasets creates a dataset.
- Dataset includes name, version, description, and metadata.
- GET /datasets returns existing datasets.
- Dataset version is stored.
```

---

### Story EVAL-2: Create test cases

As an AI engineer, I want to add test cases with expected answers and sources so that the system can score outputs.

Acceptance criteria:

```text
- POST /datasets/:id/test-cases creates a test case.
- Test case includes question, expectedAnswer, expectedSources, tags, type, and difficulty.
- Expected sources can reference document IDs and optional section metadata.
- Test case supports no-answer/negative cases.
```

---

### Story EVAL-3: Run evaluation

As an AI engineer, I want to run a dataset against a RAG config so that I can measure system quality.

Acceptance criteria:

```text
- POST /eval-runs creates an eval run.
- Eval run references datasetId and ragConfigId.
- Eval API calls rag-api /query for each test case.
- Eval API fetches the trace for each result.
- Eval case results are stored.
- Eval run has status: queued, running, completed, failed, or partially_failed.
```

---

### Story EVAL-4: Score retrieval

As an AI engineer, I want to measure whether expected sources were retrieved so that I can identify retrieval failures.

Acceptance criteria:

```text
- Eval result includes hit@k.
- Eval result includes recall@k.
- Eval result includes expectedSourceRank.
- Retrieval score uses the trace retrieved chunks.
- Retrieval scoring can run without LLM judge.
```

---

### Story EVAL-5: Score citations

As a risk reviewer, I want to verify citation validity so that answers do not rely on fake or unsupported citations.

Acceptance criteria:

```text
- Eval result includes citationPresent.
- Eval result includes citationValidity.
- Eval result includes citationTraceability.
- Citation validity checks whether cited chunks exist.
- Citation traceability checks whether cited chunks were retrieved or included in context.
```

---

### Story EVAL-6: Run LLM-as-judge scoring

As an AI engineer, I want qualitative answer scores so that I can assess groundedness, correctness, and completeness.

Acceptance criteria:

```text
- Eval API sends question, expected answer, generated answer, retrieved context, and citations to evaluator model.
- Judge returns structured JSON.
- Judge scores groundedness, correctness, completeness, and citation support.
- Judge returns unsupported claims and missing important points.
- Malformed judge output is handled safely.
```

---

### Story EVAL-7: Compare eval runs

As an AI engineer, I want to compare two eval runs so that I can see whether a change improved or regressed quality.

Acceptance criteria:

```text
- POST /eval-runs/:id/compare accepts another run ID.
- Comparison shows metric deltas.
- Comparison shows improved cases.
- Comparison shows regressed cases.
- Comparison shows cost and latency changes.
```

---

### Story EVAL-8: CI quality gate

As a platform engineer, I want CI to fail when RAG quality drops so that bad changes do not get merged.

Acceptance criteria:

```text
- POST /ci/evaluate triggers an eval run or returns a report for an existing run.
- Quality thresholds are configurable.
- CI response includes pass/fail.
- CI response includes summary metrics.
- CI fails if required thresholds are not met.
```

---

## Dashboard

### Story UI-1: View documents

As a user, I want to view indexed documents so that I know what the RAG system can search.

Acceptance criteria:

```text
- Documents page lists title, document type, status, chunk count, and indexed date.
- User can open a document detail page.
- Document detail shows metadata and chunks.
```

---

### Story UI-2: View query traces

As an engineer, I want to inspect query traces so that I can debug answers.

Acceptance criteria:

```text
- Trace page shows question, answer, citations, retrieved chunks, scores, provider, model, cost, and latency.
- Retrieved chunks are ordered by rank.
- Citations link to source chunks.
```

---

### Story UI-3: View eval runs

As an AI engineer, I want to see eval run summaries so that I can track quality.

Acceptance criteria:

```text
- Eval runs page lists dataset, config, status, pass rate, average scores, cost, and latency.
- Eval run detail shows case-level results.
- Failed cases are visually distinguishable.
```

---

### Story UI-4: Inspect failed case

As an AI engineer, I want to inspect failed eval cases so that I can understand what went wrong.

Acceptance criteria:

```text
- Failed case page shows expected answer and generated answer.
- Page shows expected sources and retrieved sources.
- Page shows citations and source chunks.
- Page shows judge notes, unsupported claims, and missing points.
- Page shows failure category where available.
```

---

### Story UI-5: Compare runs

As an AI engineer, I want to compare two eval runs so that I can understand quality changes.

Acceptance criteria:

```text
- Comparison page shows pass rate delta.
- Page shows retrieval, citation, groundedness, cost, and latency deltas.
- Page lists improved cases.
- Page lists regressed cases.
```

---

# 8. Functional requirements

## 8.1 Document ingestion

Priority: MVP

Requirements:

```text
FR-001: System must ingest markdown and plain text documents.
FR-002: System must store document metadata.
FR-003: System must reject empty documents.
FR-004: System must generate chunks from document content.
FR-005: System must generate embeddings for chunks.
FR-006: System must store chunks and embeddings in Postgres + pgvector.
FR-007: System must expose document list and detail APIs.
```

---

## 8.2 Chunking

Priority: MVP

Requirements:

```text
FR-008: System must support configurable chunk size.
FR-009: System must support configurable chunk overlap.
FR-010: System must store chunk index and token count.
FR-011: System must preserve document ID and metadata per chunk.
```

Initial default:

```text
chunkSize: 800 tokens
chunkOverlap: 100 tokens
```

---

## 8.3 Retrieval

Priority: MVP

Requirements:

```text
FR-012: System must embed the user query.
FR-013: System must retrieve top K chunks using vector similarity.
FR-014: System must store retrieved chunks in query trace.
FR-015: System must support configurable topK.
FR-016: System should support hybrid retrieval after MVP.
FR-017: System should support reranking after MVP.
```

Initial default:

```text
topK: 8
retrievalMode: vector
```

---

## 8.4 Answer generation

Priority: MVP

Requirements:

```text
FR-018: System must generate an answer using retrieved context.
FR-019: System must include citations in response.
FR-020: System must return a trace ID.
FR-021: System must return token usage where provider supports it.
FR-022: System must estimate cost where pricing config exists.
FR-023: System must include latency in response.
FR-024: System must refuse or state insufficient evidence when context does not support an answer.
```

---

## 8.5 Citations

Priority: MVP

Requirements:

```text
FR-025: Citations must include documentId and chunkId.
FR-026: Citations must reference stored chunks.
FR-027: Citations must be returned as structured data.
FR-028: Citations must be stored in query trace.
FR-029: Citation chunks must be visible in dashboard.
```

---

## 8.6 Query tracing

Priority: MVP

Requirements:

```text
FR-030: Every query must create a trace.
FR-031: Trace must include original question.
FR-032: Trace must include retrieved chunks.
FR-033: Trace must include generated answer.
FR-034: Trace must include citations.
FR-035: Trace must include provider and model.
FR-036: Trace must include prompt version.
FR-037: Trace must include latency.
FR-038: Trace must include token usage and estimated cost when available.
FR-039: Trace must be retrievable by trace ID.
```

---

## 8.7 Evaluation datasets

Priority: MVP

Requirements:

```text
FR-040: System must create evaluation datasets.
FR-041: Dataset must have name, version, description, and metadata.
FR-042: System must list datasets.
FR-043: System must retrieve dataset detail.
```

---

## 8.8 Test cases

Priority: MVP

Requirements:

```text
FR-044: System must create test cases.
FR-045: Test case must include question.
FR-046: Test case must include expected answer.
FR-047: Test case must include expected sources.
FR-048: Test case must support tags.
FR-049: Test case must support type.
FR-050: Test case must support difficulty.
FR-051: Test case must support no-answer cases.
```

Test case types:

```text
- factual
- comparison
- temporal
- multi-hop
- summarisation
- no-answer
- citation-sensitive
```

---

## 8.9 Eval runs

Priority: MVP

Requirements:

```text
FR-052: System must create eval runs.
FR-053: Eval run must reference dataset and RAG config.
FR-054: Eval run must call rag-api for each test case.
FR-055: Eval run must store trace ID for each case.
FR-056: Eval run must store generated answer.
FR-057: Eval run must store latency and estimated cost.
FR-058: Eval run must expose status.
FR-059: Eval run must handle partial failures.
```

Eval run statuses:

```text
- queued
- running
- completed
- failed
- partially_failed
```

---

## 8.10 Deterministic scoring

Priority: MVP

Requirements:

```text
FR-060: System must calculate hit@k.
FR-061: System must calculate recall@k.
FR-062: System must calculate expected source rank.
FR-063: System must calculate citation presence.
FR-064: System must calculate citation validity.
FR-065: System must calculate citation traceability.
FR-066: Deterministic scoring must not require LLM calls.
```

---

## 8.11 LLM-as-judge scoring

Priority: MVP+

Requirements:

```text
FR-067: System must run judge scoring for groundedness.
FR-068: System must run judge scoring for correctness.
FR-069: System must run judge scoring for completeness.
FR-070: System must run judge scoring for citation support.
FR-071: Judge output must be structured JSON.
FR-072: System must store unsupported claims.
FR-073: System must store missing important points.
FR-074: System must handle malformed judge output.
FR-075: Judge prompt version must be stored.
```

---

## 8.12 Regression comparison

Priority: MVP+

Requirements:

```text
FR-076: System must compare two eval runs.
FR-077: Comparison must include pass rate delta.
FR-078: Comparison must include retrieval metric deltas.
FR-079: Comparison must include citation metric deltas.
FR-080: Comparison must include judge score deltas.
FR-081: Comparison must include cost delta.
FR-082: Comparison must include latency delta.
FR-083: Comparison must identify improved cases.
FR-084: Comparison must identify regressed cases.
```

---

## 8.13 CI quality gate

Priority: MVP+

Requirements:

```text
FR-085: System must support triggering eval from CI.
FR-086: System must support configurable thresholds.
FR-087: System must return pass/fail result.
FR-088: System must return summary report.
FR-089: System must fail if thresholds are not met.
```

Example thresholds:

```text
min_hit_at_5: 0.80
min_citation_validity: 0.95
min_groundedness: 0.85
min_correctness: 0.80
max_average_latency_ms: 5000
```

---

# 9. Non-functional requirements

## 9.1 Reliability

```text
NFR-001: Eval runs must persist case results as they complete.
NFR-002: Partial eval failures must not delete completed results.
NFR-003: Provider errors must be captured and stored.
NFR-004: API requests must return structured errors.
NFR-005: Failed document ingestion must be visible.
```

---

## 9.2 Reproducibility

```text
NFR-006: Query traces must store model and provider.
NFR-007: Query traces must store prompt version.
NFR-008: Query traces must store RAG config.
NFR-009: Eval runs must store dataset version.
NFR-010: Eval results must store evaluator prompt version.
```

---

## 9.3 Performance

For MVP:

```text
NFR-011: Query API should respond within 10 seconds for small corpora under normal provider latency.
NFR-012: Dashboard pages should load within 2 seconds for MVP-sized datasets.
NFR-013: Eval runs may be long-running and do not need request/response completion in the same HTTP request.
```

---

## 9.4 Cost control

```text
NFR-014: System must track token usage where available.
NFR-015: System must estimate cost where provider pricing is configured.
NFR-016: Eval API should support a max test case limit per run.
NFR-017: Eval API should support sequential execution first, then controlled concurrency later.
```

---

## 9.5 Security

For MVP:

```text
NFR-018: API keys must be loaded from environment variables.
NFR-019: API keys must not be logged.
NFR-020: API keys must not be committed.
NFR-021: Local development should use .env.example without secrets.
```

Later:

```text
NFR-022: Add authentication.
NFR-023: Add workspace isolation.
NFR-024: Add document-level permissions.
```

---

## 9.6 Observability

```text
NFR-025: All services must expose /health.
NFR-026: API logs should include request IDs.
NFR-027: Provider calls should be logged with provider, model, latency, token usage, and error state.
NFR-028: Eval runs should expose status and progress.
```

---

## 9.7 Maintainability

```text
NFR-029: Services must have clear boundaries.
NFR-030: eval-api must call rag-api over HTTP rather than import its internals.
NFR-031: API request/response contracts must be documented.
NFR-032: Core metric calculations must be unit tested.
```

---

# 10. System requirements

## Services

```text
SR-001: System must run rag-api as a TypeScript Fastify service.
SR-002: System must run eval-api as a Python FastAPI service.
SR-003: System must run dashboard as a Next.js app.
SR-004: System must use PostgreSQL with pgvector.
SR-005: System must run locally through Docker Compose.
```

## Storage

```text
SR-006: Documents, chunks, traces, datasets, eval runs, and results must be stored in PostgreSQL.
SR-007: Vector embeddings must be stored in pgvector.
SR-008: Use separate schemas: rag and eval.
```

## Provider support

MVP:

```text
SR-009: OpenAI must be supported for embeddings.
SR-010: OpenAI must be supported for answer generation.
SR-011: OpenAI or compatible provider must be supported for LLM judge.
```

Later:

```text
SR-012: Anthropic support.
SR-013: OpenRouter support.
SR-014: Ollama/local model support.
```

---

# 11. Data requirements

## Sample corpus

MVP requires a controlled sample knowledge base.

Minimum:

```text
- 8 to 10 documents
- markdown or plain text
- enough overlap to test retrieval confusion
- at least two document versions
```

Suggested corpus:

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

## Golden dataset

MVP requires:

```text
- 20 to 30 test cases
- expected answers
- expected sources
- test case tags
- test case types
```

Required test types:

```text
- factual
- comparison
- temporal/versioned
- multi-hop
- no-answer
- citation-sensitive
```

---

# 12. API requirements

## `rag-api`

### `POST /documents/ingest`

Request:

```json
{
  "title": "Remote Work Policy v2",
  "documentType": "markdown",
  "content": "# Remote Work Policy...",
  "metadata": {
    "version": "v2",
    "department": "People"
  }
}
```

Response:

```json
{
  "documentId": "doc_123",
  "status": "indexed",
  "chunkCount": 12
}
```

---

### `POST /query`

Request:

```json
{
  "question": "What is the remote work approval process?",
  "ragConfigId": "config_default"
}
```

Response:

```json
{
  "answer": "Remote work longer than two consecutive weeks requires manager approval.",
  "citations": [
    {
      "documentId": "doc_remote_work_v2",
      "chunkId": "chunk_123",
      "title": "Remote Work Policy v2",
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

### `GET /queries/:traceId`

Response:

```json
{
  "traceId": "trace_abc",
  "question": "What is the remote work approval process?",
  "answer": "Remote work longer than two consecutive weeks requires manager approval.",
  "retrievedChunks": [
    {
      "chunkId": "chunk_123",
      "documentId": "doc_remote_work_v2",
      "rank": 1,
      "score": 0.91,
      "text": "Remote work longer than two consecutive weeks requires manager approval."
    }
  ],
  "citations": [],
  "provider": "openai",
  "model": "gpt-4.1-mini",
  "promptVersion": "answer-v1",
  "latencyMs": 1840,
  "usage": {
    "inputTokens": 3200,
    "outputTokens": 180,
    "estimatedCost": 0.008
  }
}
```

---

## `eval-api`

### `POST /datasets`

Request:

```json
{
  "name": "Company Knowledge Base Eval",
  "version": "v1",
  "description": "Golden questions for policy, engineering, and support docs."
}
```

Response:

```json
{
  "datasetId": "dataset_123"
}
```

---

### `POST /datasets/:id/test-cases`

Request:

```json
{
  "question": "What is the remote work approval process?",
  "expectedAnswer": "Remote work longer than two consecutive weeks requires manager approval.",
  "expectedSources": [
    {
      "documentId": "doc_remote_work_v2",
      "section": "Approval process"
    }
  ],
  "tags": ["policy", "remote-work"],
  "type": "factual",
  "difficulty": "easy"
}
```

Response:

```json
{
  "testCaseId": "case_123"
}
```

---

### `POST /eval-runs`

Request:

```json
{
  "datasetId": "dataset_123",
  "ragConfigId": "config_default",
  "thresholds": {
    "minHitAt5": 0.8,
    "minCitationValidity": 0.95,
    "minGroundedness": 0.85
  }
}
```

Response:

```json
{
  "evalRunId": "run_123",
  "status": "queued"
}
```

---

### `GET /eval-runs/:id`

Response:

```json
{
  "evalRunId": "run_123",
  "datasetId": "dataset_123",
  "ragConfigId": "config_default",
  "status": "completed",
  "summary": {
    "passRate": 0.84,
    "hitAt5": 0.88,
    "citationValidity": 0.96,
    "groundedness": 0.87,
    "averageLatencyMs": 2100,
    "estimatedCost": 0.18
  }
}
```

---

# 13. Dashboard requirements

## Documents page

Must show:

```text
- title
- type
- status
- chunk count
- created date
```

## Trace detail page

Must show:

```text
- question
- answer
- citations
- retrieved chunks
- scores
- provider/model
- prompt version
- token usage
- cost
- latency
```

## Eval runs page

Must show:

```text
- run ID
- dataset
- RAG config
- status
- pass rate
- average scores
- cost
- latency
```

## Eval result detail page

Must show:

```text
- question
- expected answer
- generated answer
- expected sources
- retrieved chunks
- citations
- retrieval scores
- citation scores
- judge scores
- unsupported claims
- missing important points
- verdict
```

## Comparison page

Must show:

```text
- run A vs run B
- metric deltas
- improved cases
- regressed cases
- cost delta
- latency delta
```

---

# 14. MVP requirements

The MVP is complete when the following are true.

## RAG MVP

```text
- Can ingest markdown/text documents.
- Can chunk and embed documents.
- Can retrieve relevant chunks.
- Can generate an answer.
- Can return citations.
- Can store and fetch query traces.
```

## Eval MVP

```text
- Can create dataset.
- Can create test cases.
- Can run eval against rag-api.
- Can store trace IDs and generated answers.
- Can calculate deterministic retrieval/citation metrics.
- Can run basic LLM-as-judge scoring.
```

## Dashboard MVP

```text
- Can list documents.
- Can inspect query traces.
- Can list eval runs.
- Can inspect eval case results.
- Can show failed cases.
```

## Demo MVP

```text
- 8 to 10 sample documents.
- 20 to 30 golden test cases.
- At least two RAG configs compared.
- At least one failed case explained.
- Cost and latency visible.
```

---

# 15. Acceptance criteria for MVP

The system is acceptable if:

```text
AC-001: Docker Compose starts Postgres, rag-api, eval-api, and dashboard.
AC-002: Migrations create rag and eval schemas.
AC-003: Sample documents can be seeded.
AC-004: A query returns an answer with citations and trace ID.
AC-005: Trace detail shows retrieved chunks and answer metadata.
AC-006: Eval dataset can be seeded.
AC-007: Eval run executes all test cases.
AC-008: Eval results include deterministic scores.
AC-009: Eval results include judge scores where enabled.
AC-010: Dashboard shows eval summary and failed case detail.
AC-011: Run comparison shows at least pass rate, retrieval, citation, cost, and latency deltas.
```

---

# 16. Future requirements

## Post-MVP

```text
- hybrid retrieval
- reranker adapter
- metadata filtering
- query rewriting
- prompt version management UI
- RAG config management UI
- resumable eval runs
- controlled concurrency
- GitHub Actions quality gate
```

## Later

```text
- PDF parsing
- DOCX ingestion
- HTML ingestion
- OpenRouter provider
- Anthropic provider
- Ollama provider
- RAGAS integration
- DeepEval integration
- manual human review
- auth
- workspace support
```

---

# 17. Dependencies

## Technical dependencies

```text
- Node.js
- Python
- PostgreSQL
- pgvector
- Docker
- OpenAI API key
```

## External services

MVP:

```text
- OpenAI for embeddings and generation
```

Optional later:

```text
- Anthropic
- OpenRouter
- Ollama local models
```

---

# 18. Risks and mitigations

## Risk: Evaluation scores are noisy

Mitigation:

```text
- deterministic metrics first
- LLM judge second
- store judge explanations
- version evaluator prompts
```

## Risk: Two-service architecture slows development

Mitigation:

```text
- keep eval-api minimal initially
- use Docker Compose
- use OpenAPI contracts
- keep HTTP boundary simple
```

## Risk: Provider costs grow

Mitigation:

```text
- small eval datasets first
- track token usage
- limit test cases per run
- add concurrency limits later
```

## Risk: Dashboard scope creep

Mitigation:

```text
- build table/detail views first
- skip complex charts for MVP
```

## Risk: RAG quality is poor at first

Mitigation:

```text
- use controlled documents
- use clear expected sources
- start with simple factual questions
- add harder test types gradually
```

---

# 19. Open product questions

```text
- Should the first sample corpus be policy-heavy, engineering-heavy, or mixed?
- Should dashboard design optimise for recruiter demo polish or engineering debug depth?
- Should eval-api read traces only through rag-api, or directly from Postgres for performance later?
- What exact thresholds should define pass/fail?
- Should LLM-as-judge run by default or be optional per eval run?
- Should failed cases be manually reviewable in the dashboard?
```

Recommended initial answers:

```text
- Use a mixed corpus: policy, engineering, support.
- Optimise dashboard for debug depth first.
- eval-api should fetch traces through rag-api for MVP.
- Make thresholds configurable.
- Make LLM judge optional but enabled in demo evals.
- Manual review can come later.
```

---

# 20. Product requirement summary

RAGLens must deliver a complete source-grounded RAG evaluation loop:

```text
1. Ingest controlled business documents.
2. Query those documents through rag-api.
3. Return cited answers.
4. Persist query traces.
5. Define golden test cases.
6. Run evals through eval-api.
7. Score retrieval, citations, and answer quality.
8. Inspect failures in the dashboard.
9. Compare runs.
10. Gate regressions in CI after MVP.
```

The central product requirement is:

```text
Every answer should be traceable, every trace should be evaluable, and every change should be measurable.
```
