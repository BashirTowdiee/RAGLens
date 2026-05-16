---
title: "Data Design"
description: "Data model and storage design for the RAGLens platform."
order: 8
section: "Architecture"
status: "stable"
---
# Data Design: RAGLens

## 1. Data design objective

RAGLens needs to store and connect four major data areas:

```text
1. Source data
   Documents, chunks, metadata, embeddings.

2. RAG execution data
   Queries, retrieved chunks, citations, provider calls, traces.

3. Evaluation data
   Datasets, test cases, expected answers, expected sources, eval runs, scores.

4. Comparison/reporting data
   Run summaries, metric deltas, improved cases, regressed cases, CI gate results.
```

The core data design principle is:

```text
Every answer should be traceable.
Every trace should be evaluable.
Every eval result should be reproducible.
Every change should be comparable.
```

---

# 2. Database strategy

## Database

Use:

```text
PostgreSQL + pgvector
```

## Schema split

Use one database with two logical schemas:

```text
rag.*
eval.*
```

## Ownership

```text
rag-api owns:
  rag.*

eval-api owns:
  eval.*
```

For MVP, `eval-api` should fetch RAG traces through `rag-api` over HTTP. Later, it may read from `rag.*` directly for performance, but the clean design starts with the API boundary.

---

# 3. High-level entity map

```text
rag.documents
  └── rag.document_chunks
        └── rag.query_trace_chunks

rag.query_traces
  ├── rag.query_trace_chunks
  ├── rag.query_trace_citations
  └── rag.provider_calls

rag.rag_configs
  └── rag.query_traces
  └── eval.eval_runs

eval.datasets
  └── eval.test_cases
        └── eval.eval_case_results

eval.eval_runs
  └── eval.eval_case_results
        └── rag.query_traces via trace_id

eval.eval_runs
  └── eval.run_comparisons
```

---

# 4. Core schemas

## 4.1 `rag` schema

The `rag` schema stores everything needed to ingest, retrieve, answer, cite, and trace RAG queries.

Tables:

```text
rag.documents
rag.document_chunks
rag.rag_configs
rag.prompt_versions
rag.query_traces
rag.query_trace_chunks
rag.query_trace_citations
rag.provider_calls
```

---

## 4.2 `eval` schema

The `eval` schema stores everything needed to evaluate RAG quality.

Tables:

```text
eval.datasets
eval.test_cases
eval.eval_runs
eval.eval_case_results
eval.evaluator_prompts
eval.run_comparisons
eval.quality_thresholds
eval.ci_gate_results
```

---

# 5. `rag` schema design

## 5.1 `rag.documents`

Stores top-level source documents.

### Purpose

Track document metadata, source identity, status, and ingestion state.

### Fields

```text
id
title
document_type
source_uri
status
metadata
checksum
created_at
updated_at
```

### SQL

```sql
CREATE TABLE rag.documents (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  document_type TEXT NOT NULL,
  source_uri TEXT,
  status TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  checksum TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Status values

```text
pending
indexing
indexed
failed
```

### Example record

```json
{
  "id": "7b9f5c5a-8d17-45c0-a9e7-3bb34ad8b111",
  "title": "Remote Work Policy v2",
  "document_type": "markdown",
  "source_uri": "seed://policies/remote-work-policy-v2.md",
  "status": "indexed",
  "metadata": {
    "version": "v2",
    "department": "People",
    "tags": ["policy", "remote-work"]
  },
  "checksum": "sha256:abc123"
}
```

### Notes

Use `metadata` for flexible document attributes:

```text
version
department
tags
effective_date
owner
source_category
```

Do not over-normalise this too early.

---

## 5.2 `rag.document_chunks`

Stores chunked document text and embeddings.

### Purpose

Chunks are the retrieval unit.

Each chunk belongs to one document and may contain metadata such as section, heading, page number, or token count.

### Fields

```text
id
document_id
chunk_index
text
token_count
metadata
embedding
created_at
```

### SQL

```sql
CREATE TABLE rag.document_chunks (
  id UUID PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES rag.documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  text TEXT NOT NULL,
  token_count INTEGER,
  metadata JSONB NOT NULL DEFAULT '{}',
  embedding VECTOR(1536),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(document_id, chunk_index)
);
```

### Example record

```json
{
  "id": "38b071ef-8806-45de-8a3d-e7a6aa49b222",
  "document_id": "7b9f5c5a-8d17-45c0-a9e7-3bb34ad8b111",
  "chunk_index": 3,
  "text": "Remote work longer than two consecutive weeks requires manager approval...",
  "token_count": 184,
  "metadata": {
    "section": "Approval process",
    "heading_path": ["Remote Work", "Approval process"]
  }
}
```

### Important design note

Embedding dimension depends on the model.

For OpenAI `text-embedding-3-small`, 1536 is a reasonable MVP default. If you plan to support multiple embedding models with different dimensions, you have three options:

```text
Option A:
  Standardise on one embedding dimension for MVP.

Option B:
  Store separate vector columns per embedding model.
  Example: embedding_1536, embedding_3072.

Option C:
  Store embeddings in separate model-specific tables.
```

For MVP, use **Option A**.

---

## 5.3 `rag.prompt_versions`

Stores prompt version metadata.

### Purpose

Prompt versions are part of system behaviour and must be recorded in traces and eval runs.

### Fields

```text
id
name
version
description
template_ref
metadata
created_at
```

### SQL

```sql
CREATE TABLE rag.prompt_versions (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  description TEXT,
  template_ref TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(name, version)
);
```

### Example record

```json
{
  "name": "answer",
  "version": "v1",
  "description": "Initial source-grounded answer prompt",
  "template_ref": "apps/rag-api/src/modules/prompts/templates/answer-v1.ts"
}
```

### MVP approach

Prompt text can live in code. The DB stores the version metadata and reference.

Later, if you build a prompt editor, store prompt body in the database.

---

## 5.4 `rag.rag_configs`

Stores RAG behaviour configuration.

### Purpose

RAG configs make answers reproducible and comparable.

Each query trace and eval run should reference a RAG config.

### Fields

```text
id
name
provider
model
embedding_provider
embedding_model
retrieval_mode
top_k
chunk_size
chunk_overlap
prompt_version
temperature
max_output_tokens
metadata
created_at
```

### SQL

```sql
CREATE TABLE rag.rag_configs (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  embedding_provider TEXT NOT NULL,
  embedding_model TEXT NOT NULL,
  retrieval_mode TEXT NOT NULL,
  top_k INTEGER NOT NULL,
  chunk_size INTEGER NOT NULL,
  chunk_overlap INTEGER NOT NULL,
  prompt_version TEXT NOT NULL,
  temperature NUMERIC(4, 3) NOT NULL DEFAULT 0,
  max_output_tokens INTEGER,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Retrieval modes

```text
vector
keyword
hybrid
hybrid_reranked
```

MVP uses:

```text
vector
```

### Example record

```json
{
  "name": "vector-default",
  "provider": "openai",
  "model": "gpt-4.1-mini",
  "embedding_provider": "openai",
  "embedding_model": "text-embedding-3-small",
  "retrieval_mode": "vector",
  "top_k": 8,
  "chunk_size": 800,
  "chunk_overlap": 100,
  "prompt_version": "answer-v1",
  "temperature": 0
}
```

---

## 5.5 `rag.query_traces`

Stores the top-level trace of each RAG query.

### Purpose

This is one of the most important tables in the system.

It records what was asked, what was answered, which model/config was used, and operational metadata.

### Fields

```text
id
question
answer
provider
model
prompt_version
rag_config_id
latency_ms
input_tokens
output_tokens
estimated_cost
status
error_code
error_message
created_at
```

### SQL

```sql
CREATE TABLE rag.query_traces (
  id UUID PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  rag_config_id UUID REFERENCES rag.rag_configs(id),
  latency_ms INTEGER,
  input_tokens INTEGER,
  output_tokens INTEGER,
  estimated_cost NUMERIC(12, 6),
  status TEXT NOT NULL,
  error_code TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Status values

```text
completed
completed_no_context
failed
```

### Example record

```json
{
  "id": "9a98bb24-60e7-4f01-a1fa-d8c8d8b6c333",
  "question": "What is the remote work approval process?",
  "answer": "Remote work longer than two consecutive weeks requires manager approval.",
  "provider": "openai",
  "model": "gpt-4.1-mini",
  "prompt_version": "answer-v1",
  "latency_ms": 1840,
  "input_tokens": 3200,
  "output_tokens": 180,
  "estimated_cost": 0.008,
  "status": "completed"
}
```

---

## 5.6 `rag.query_trace_chunks`

Stores retrieved chunks for a query.

### Purpose

This links a query trace to the chunks retrieved during retrieval.

It enables:

```text
- trace inspection
- retrieval scoring
- hit@k
- recall@k
- expected source rank
- debugging retrieval failures
```

### Fields

```text
id
trace_id
chunk_id
document_id
rank
score
rerank_score
was_used_in_context
created_at
```

### SQL

```sql
CREATE TABLE rag.query_trace_chunks (
  id UUID PRIMARY KEY,
  trace_id UUID NOT NULL REFERENCES rag.query_traces(id) ON DELETE CASCADE,
  chunk_id UUID NOT NULL REFERENCES rag.document_chunks(id),
  document_id UUID NOT NULL REFERENCES rag.documents(id),
  rank INTEGER NOT NULL,
  score DOUBLE PRECISION,
  rerank_score DOUBLE PRECISION,
  was_used_in_context BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(trace_id, chunk_id)
);
```

### Example record

```json
{
  "trace_id": "9a98bb24-60e7-4f01-a1fa-d8c8d8b6c333",
  "chunk_id": "38b071ef-8806-45de-8a3d-e7a6aa49b222",
  "document_id": "7b9f5c5a-8d17-45c0-a9e7-3bb34ad8b111",
  "rank": 1,
  "score": 0.91,
  "was_used_in_context": true
}
```

---

## 5.7 `rag.query_trace_citations`

Stores structured citations returned in the answer.

### Purpose

Citations must be structured and validated.

This table supports:

```text
- citation display
- citation validity scoring
- citation traceability scoring
- source preview in dashboard
```

### Fields

```text
id
trace_id
citation_index
document_id
chunk_id
title
section
metadata
created_at
```

### SQL

```sql
CREATE TABLE rag.query_trace_citations (
  id UUID PRIMARY KEY,
  trace_id UUID NOT NULL REFERENCES rag.query_traces(id) ON DELETE CASCADE,
  citation_index INTEGER NOT NULL,
  document_id UUID REFERENCES rag.documents(id),
  chunk_id UUID REFERENCES rag.document_chunks(id),
  title TEXT,
  section TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(trace_id, citation_index)
);
```

### Example record

```json
{
  "trace_id": "9a98bb24-60e7-4f01-a1fa-d8c8d8b6c333",
  "citation_index": 1,
  "document_id": "7b9f5c5a-8d17-45c0-a9e7-3bb34ad8b111",
  "chunk_id": "38b071ef-8806-45de-8a3d-e7a6aa49b222",
  "title": "Remote Work Policy v2",
  "section": "Approval process"
}
```

---

## 5.8 `rag.provider_calls`

Stores provider call telemetry.

### Purpose

Track model calls, latency, token usage, cost, and errors.

This is useful for:

```text
- cost tracking
- latency analysis
- provider debugging
- auditability
```

### Fields

```text
id
trace_id
provider
model
operation
latency_ms
input_tokens
output_tokens
estimated_cost
status
error_code
error_message
created_at
```

### SQL

```sql
CREATE TABLE rag.provider_calls (
  id UUID PRIMARY KEY,
  trace_id UUID REFERENCES rag.query_traces(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  operation TEXT NOT NULL,
  latency_ms INTEGER,
  input_tokens INTEGER,
  output_tokens INTEGER,
  estimated_cost NUMERIC(12, 6),
  status TEXT NOT NULL,
  error_code TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Operation values

```text
embedding
answer_generation
query_rewrite
reranking
```

For MVP:

```text
embedding
answer_generation
```

---

# 6. `eval` schema design

## 6.1 `eval.datasets`

Stores evaluation datasets.

### Purpose

A dataset is a versioned collection of test cases.

### Fields

```text
id
name
version
description
metadata
created_at
updated_at
```

### SQL

```sql
CREATE TABLE eval.datasets (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  description TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(name, version)
);
```

### Example record

```json
{
  "id": "3f8147de-cf06-46b4-a64d-16d9d78e9444",
  "name": "Company Knowledge Base Eval",
  "version": "v1",
  "description": "Golden questions for policy, engineering, and support documents."
}
```

---

## 6.2 `eval.test_cases`

Stores golden questions and expected behaviour.

### Purpose

Test cases define what good behaviour looks like.

Each test case may include:

```text
- question
- expected answer
- expected sources
- test type
- difficulty
- tags
- no-answer expectation
```

### Fields

```text
id
dataset_id
question
expected_answer
expected_sources
tags
type
difficulty
no_answer_expected
metadata
created_at
updated_at
```

### SQL

```sql
CREATE TABLE eval.test_cases (
  id UUID PRIMARY KEY,
  dataset_id UUID NOT NULL REFERENCES eval.datasets(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  expected_answer TEXT,
  expected_sources JSONB NOT NULL DEFAULT '[]',
  tags TEXT[] NOT NULL DEFAULT '{}',
  type TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  no_answer_expected BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Test case types

```text
factual
comparison
temporal
multi_hop
summarisation
no_answer
citation_sensitive
```

### Difficulty values

```text
easy
medium
hard
```

### Expected sources shape

```json
[
  {
    "documentId": "7b9f5c5a-8d17-45c0-a9e7-3bb34ad8b111",
    "title": "Remote Work Policy v2",
    "section": "Approval process",
    "required": true
  }
]
```

### Example record

```json
{
  "question": "What is the remote work approval process?",
  "expected_answer": "Remote work longer than two consecutive weeks requires manager approval.",
  "expected_sources": [
    {
      "documentId": "7b9f5c5a-8d17-45c0-a9e7-3bb34ad8b111",
      "title": "Remote Work Policy v2",
      "section": "Approval process",
      "required": true
    }
  ],
  "tags": ["policy", "remote-work"],
  "type": "factual",
  "difficulty": "easy",
  "no_answer_expected": false
}
```

---

## 6.3 `eval.quality_thresholds`

Stores reusable threshold presets.

### Purpose

Thresholds define pass/fail quality gates.

### Fields

```text
id
name
description
thresholds
created_at
updated_at
```

### SQL

```sql
CREATE TABLE eval.quality_thresholds (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  thresholds JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Example thresholds

```json
{
  "minHitAt5": 0.8,
  "minRecallAt10": 0.75,
  "minCitationValidity": 0.95,
  "minGroundedness": 0.85,
  "minCorrectness": 0.8,
  "maxAverageLatencyMs": 5000,
  "maxEstimatedCost": 1.0
}
```

### Suggested presets

```text
exploratory
balanced
strict
```

---

## 6.4 `eval.evaluator_prompts`

Stores evaluator prompt versions.

### Purpose

LLM judge behaviour must be versioned.

### Fields

```text
id
name
version
prompt
metadata
created_at
```

### SQL

```sql
CREATE TABLE eval.evaluator_prompts (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  prompt TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(name, version)
);
```

### Example record

```json
{
  "name": "rag-answer-judge",
  "version": "v1",
  "prompt": "You are evaluating a RAG answer..."
}
```

---

## 6.5 `eval.eval_runs`

Stores top-level evaluation runs.

### Purpose

An eval run represents executing a dataset against a specific RAG configuration.

### Fields

```text
id
dataset_id
rag_config_id
status
thresholds
summary_scores
started_at
completed_at
created_at
```

### SQL

```sql
CREATE TABLE eval.eval_runs (
  id UUID PRIMARY KEY,
  dataset_id UUID NOT NULL REFERENCES eval.datasets(id),
  rag_config_id UUID,
  status TEXT NOT NULL,
  thresholds JSONB NOT NULL DEFAULT '{}',
  summary_scores JSONB NOT NULL DEFAULT '{}',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Status values

```text
queued
running
completed
partially_failed
failed
cancelled
```

### Summary scores shape

```json
{
  "caseCount": 25,
  "passed": 21,
  "failed": 4,
  "passRate": 0.84,
  "hitAt5": 0.88,
  "recallAt10": 0.81,
  "citationValidity": 0.96,
  "citationTraceability": 0.92,
  "groundedness": 0.87,
  "correctness": 0.84,
  "completeness": 0.79,
  "citationSupport": 0.82,
  "averageLatencyMs": 2100,
  "estimatedCost": 0.18
}
```

### Example record

```json
{
  "dataset_id": "3f8147de-cf06-46b4-a64d-16d9d78e9444",
  "rag_config_id": "5e6794f4-f2cd-4471-a00f-697efb029555",
  "status": "completed",
  "thresholds": {
    "minHitAt5": 0.8,
    "minGroundedness": 0.85
  },
  "summary_scores": {
    "passRate": 0.84,
    "hitAt5": 0.88,
    "groundedness": 0.87
  }
}
```

### Important note

`rag_config_id` references `rag.rag_configs(id)`, but since the table is in another schema and owned by another service, treat it as a logical reference. You can enforce the FK in the DB for MVP, or leave it as UUID only to preserve service boundaries.

For MVP, I would use UUID only, no cross-schema FK:

```sql
rag_config_id UUID
```

This avoids coupling eval migrations to rag migrations.

---

## 6.6 `eval.eval_case_results`

Stores one result per test case per eval run.

### Purpose

This is the detailed evaluation result.

Each case result links:

```text
test case -> RAG trace -> scores -> verdict
```

### Fields

```text
id
eval_run_id
test_case_id
trace_id
answer
retrieval_scores
citation_scores
judge_scores
verdict
failure_type
evaluator_notes
latency_ms
estimated_cost
error_code
error_message
created_at
```

### SQL

```sql
CREATE TABLE eval.eval_case_results (
  id UUID PRIMARY KEY,
  eval_run_id UUID NOT NULL REFERENCES eval.eval_runs(id) ON DELETE CASCADE,
  test_case_id UUID NOT NULL REFERENCES eval.test_cases(id),
  trace_id UUID,
  answer TEXT,
  retrieval_scores JSONB NOT NULL DEFAULT '{}',
  citation_scores JSONB NOT NULL DEFAULT '{}',
  judge_scores JSONB NOT NULL DEFAULT '{}',
  verdict TEXT NOT NULL,
  failure_type TEXT,
  evaluator_notes TEXT,
  latency_ms INTEGER,
  estimated_cost NUMERIC(12, 6),
  error_code TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(eval_run_id, test_case_id)
);
```

### Verdict values

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
unsupported_claim
incomplete_answer
incorrect_answer
bad_refusal
provider_error
timeout
judge_error
```

### Retrieval scores shape

```json
{
  "hitAt5": true,
  "recallAt10": 1.0,
  "expectedSourceRank": 1,
  "retrievedExpectedSources": [
    {
      "documentId": "7b9f5c5a-8d17-45c0-a9e7-3bb34ad8b111",
      "rank": 1
    }
  ],
  "missingExpectedSources": []
}
```

### Citation scores shape

```json
{
  "citationPresent": true,
  "citationCount": 2,
  "citationValidity": 1.0,
  "citationTraceability": 1.0,
  "invalidCitations": [],
  "untracedCitations": []
}
```

### Judge scores shape

```json
{
  "enabled": true,
  "promptVersion": "judge-v1",
  "groundedness": 0.87,
  "correctness": 0.82,
  "completeness": 0.78,
  "citationSupport": 0.91,
  "unsupportedClaims": [],
  "missingImportantPoints": [
    "Did not mention manager approval threshold."
  ],
  "rawVerdict": "pass"
}
```

### Example record

```json
{
  "eval_run_id": "run_123",
  "test_case_id": "case_123",
  "trace_id": "9a98bb24-60e7-4f01-a1fa-d8c8d8b6c333",
  "answer": "Remote work longer than two consecutive weeks requires manager approval.",
  "retrieval_scores": {
    "hitAt5": true,
    "recallAt10": 1.0,
    "expectedSourceRank": 1
  },
  "citation_scores": {
    "citationPresent": true,
    "citationValidity": 1.0,
    "citationTraceability": 1.0
  },
  "judge_scores": {
    "groundedness": 0.91,
    "correctness": 0.88,
    "completeness": 0.84,
    "citationSupport": 0.9
  },
  "verdict": "pass"
}
```

---

## 6.7 `eval.run_comparisons`

Stores comparison results between two eval runs.

### Purpose

This allows dashboard and CI to show whether a change improved or regressed quality.

### Fields

```text
id
baseline_run_id
candidate_run_id
summary
improved_cases
regressed_cases
created_at
```

### SQL

```sql
CREATE TABLE eval.run_comparisons (
  id UUID PRIMARY KEY,
  baseline_run_id UUID NOT NULL REFERENCES eval.eval_runs(id),
  candidate_run_id UUID NOT NULL REFERENCES eval.eval_runs(id),
  summary JSONB NOT NULL DEFAULT '{}',
  improved_cases JSONB NOT NULL DEFAULT '[]',
  regressed_cases JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Summary shape

```json
{
  "passRateDelta": 0.08,
  "hitAt5Delta": 0.11,
  "groundednessDelta": 0.07,
  "citationSupportDelta": 0.08,
  "averageLatencyMsDelta": 800,
  "estimatedCostDelta": 0.06,
  "baseline": {
    "passRate": 0.78,
    "estimatedCost": 0.12
  },
  "candidate": {
    "passRate": 0.86,
    "estimatedCost": 0.18
  }
}
```

### Improved case shape

```json
[
  {
    "testCaseId": "case_123",
    "question": "What is the remote work approval process?",
    "baselineVerdict": "fail",
    "candidateVerdict": "pass",
    "reason": "Expected source was retrieved in candidate run."
  }
]
```

### Regressed case shape

```json
[
  {
    "testCaseId": "case_456",
    "question": "Does the company allow unlimited overseas remote work?",
    "baselineVerdict": "pass",
    "candidateVerdict": "fail",
    "reason": "Candidate answer made unsupported claim."
  }
]
```

---

## 6.8 `eval.ci_gate_results`

Stores CI quality gate outcomes.

### Purpose

Persist CI quality decisions for auditability.

### Fields

```text
id
eval_run_id
status
thresholds
threshold_failures
summary
commit_sha
branch
created_at
```

### SQL

```sql
CREATE TABLE eval.ci_gate_results (
  id UUID PRIMARY KEY,
  eval_run_id UUID NOT NULL REFERENCES eval.eval_runs(id),
  status TEXT NOT NULL,
  thresholds JSONB NOT NULL DEFAULT '{}',
  threshold_failures JSONB NOT NULL DEFAULT '[]',
  summary JSONB NOT NULL DEFAULT '{}',
  commit_sha TEXT,
  branch TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Status values

```text
pass
fail
error
```

### Threshold failure shape

```json
[
  {
    "metric": "groundedness",
    "expected": ">= 0.85",
    "actual": 0.78
  }
]
```

This table is post-MVP but worth designing early.

---

# 7. Data relationships

## 7.1 Document to chunk

```text
rag.documents.id
  -> rag.document_chunks.document_id
```

One document has many chunks.

---

## 7.2 Query trace to retrieved chunks

```text
rag.query_traces.id
  -> rag.query_trace_chunks.trace_id

rag.document_chunks.id
  -> rag.query_trace_chunks.chunk_id
```

One query trace has many retrieved chunks.

---

## 7.3 Query trace to citations

```text
rag.query_traces.id
  -> rag.query_trace_citations.trace_id
```

One query trace has many citations.

---

## 7.4 Dataset to test cases

```text
eval.datasets.id
  -> eval.test_cases.dataset_id
```

One dataset has many test cases.

---

## 7.5 Eval run to case results

```text
eval.eval_runs.id
  -> eval.eval_case_results.eval_run_id
```

One eval run has many case results.

---

## 7.6 Test case to case result

```text
eval.test_cases.id
  -> eval.eval_case_results.test_case_id
```

One test case can appear in many eval results across runs.

---

## 7.7 Eval case result to query trace

```text
eval.eval_case_results.trace_id
  -> rag.query_traces.id
```

This can be logical rather than DB-enforced.

Recommendation:

```text
Store trace_id as UUID without FK in eval schema for MVP.
```

Reason:

```text
It keeps eval schema less tightly coupled to rag schema.
```

---

# 8. Indexing strategy

## 8.1 Basic indexes

```sql
CREATE INDEX documents_status_idx
ON rag.documents(status);

CREATE INDEX documents_created_at_idx
ON rag.documents(created_at DESC);

CREATE INDEX document_chunks_document_id_idx
ON rag.document_chunks(document_id);

CREATE INDEX query_traces_created_at_idx
ON rag.query_traces(created_at DESC);

CREATE INDEX query_trace_chunks_trace_id_idx
ON rag.query_trace_chunks(trace_id);

CREATE INDEX query_trace_citations_trace_id_idx
ON rag.query_trace_citations(trace_id);

CREATE INDEX eval_runs_created_at_idx
ON eval.eval_runs(created_at DESC);

CREATE INDEX eval_runs_dataset_id_idx
ON eval.eval_runs(dataset_id);

CREATE INDEX eval_case_results_run_id_idx
ON eval.eval_case_results(eval_run_id);

CREATE INDEX eval_case_results_test_case_id_idx
ON eval.eval_case_results(test_case_id);
```

## 8.2 JSONB indexes

If metadata filtering becomes important:

```sql
CREATE INDEX documents_metadata_gin_idx
ON rag.documents
USING GIN (metadata);

CREATE INDEX document_chunks_metadata_gin_idx
ON rag.document_chunks
USING GIN (metadata);

CREATE INDEX test_cases_metadata_gin_idx
ON eval.test_cases
USING GIN (metadata);
```

Do not add these until needed.

## 8.3 Vector index

For pgvector:

```sql
CREATE INDEX document_chunks_embedding_idx
ON rag.document_chunks
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

For MVP with small data, you can skip the vector index initially. Add it once data volume grows.

---

# 9. ID strategy

Use UUIDs for all primary keys.

Reasons:

```text
- works across services
- avoids sequence coupling
- easy to generate client-side if needed
- safer for distributed workflows later
```

Use generated UUIDs from the application or DB.

Recommended PostgreSQL extension:

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

Then:

```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
```

You can either generate IDs in app code or DB. Pick one and stay consistent.

Recommendation:

```text
Generate IDs in the application layer for easier traceability in service logs.
```

---

# 10. Naming conventions

## Tables

Use plural snake_case:

```text
documents
document_chunks
query_traces
eval_runs
eval_case_results
```

## Columns

Use snake_case:

```text
created_at
updated_at
trace_id
document_id
expected_sources
```

## JSON keys

Use camelCase inside API responses:

```json
{
  "traceId": "...",
  "expectedSources": [],
  "createdAt": "..."
}
```

## Service mapping

Database:

```text
snake_case
```

API:

```text
camelCase
```

This is normal for TypeScript/JavaScript APIs and PostgreSQL.

---

# 11. Data lifecycle

## 11.1 Document lifecycle

```text
pending
  -> indexing
  -> indexed
  -> failed
```

For MVP, ingestion may be synchronous, but still store status to support later async ingestion.

## 11.2 Query trace lifecycle

```text
started
  -> completed
  -> completed_no_context
  -> failed
```

For MVP, you may only persist after completion. Better design is to create the trace early with `started`, then update it.

## 11.3 Eval run lifecycle

```text
queued
  -> running
  -> completed

running
  -> partially_failed

running
  -> failed

running
  -> cancelled, post-MVP
```

## 11.4 Eval case result lifecycle

Case results can be inserted as each case completes.

This allows partial progress to survive failures.

---

# 12. Data retention

## MVP

No automatic deletion.

## Post-MVP

Define retention policies for:

```text
query traces
provider calls
eval case results
raw prompts
raw provider responses
```

Potential policy:

```text
Keep eval data indefinitely.
Keep query traces for 90 days by default.
Keep provider raw responses only when debugging is enabled.
```

For portfolio MVP, keep everything.

---

# 13. Seed data design

## 13.1 Sample documents

Create:

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

Each document should have metadata:

```json
{
  "department": "People",
  "version": "v2",
  "tags": ["policy", "remote-work"],
  "effectiveDate": "2025-01-01"
}
```

## 13.2 Sample eval dataset

Create:

```text
infra/seed/datasets/company-kb-eval-v1.json
```

Shape:

```json
{
  "name": "Company Knowledge Base Eval",
  "version": "v1",
  "description": "Golden questions for policy, engineering, and support documents.",
  "testCases": [
    {
      "question": "What is the remote work approval process?",
      "expectedAnswer": "Remote work longer than two consecutive weeks requires manager approval.",
      "expectedSources": [
        {
          "title": "Remote Work Policy v2",
          "section": "Approval process",
          "required": true
        }
      ],
      "tags": ["policy", "remote-work"],
      "type": "factual",
      "difficulty": "easy"
    }
  ]
}
```

During seeding, resolve `title` to `documentId`.

---

# 14. Expected source matching design

This is important.

Test cases need expected sources, but document IDs may differ between environments.

## Problem

If seed data is reinserted, UUIDs may change.

## Options

### Option A: Expected sources by document ID

Pros:

```text
- precise
- easy scoring
```

Cons:

```text
- brittle across environments
```

### Option B: Expected sources by stable source URI/title/section

Pros:

```text
- easier seed portability
```

Cons:

```text
- matching can be ambiguous
```

### Option C: Store both stable source reference and resolved document ID

Best option.

Expected source shape:

```json
{
  "sourceRef": "policies/remote-work-policy-v2.md",
  "documentId": "resolved uuid",
  "title": "Remote Work Policy v2",
  "section": "Approval process",
  "required": true
}
```

Recommendation:

```text
Use sourceRef in seed files.
Resolve to documentId during dataset seeding.
Store both sourceRef and documentId in expected_sources.
```

---

# 15. Score storage design

Use JSONB for score groups.

Reason:

```text
- evaluation metrics will evolve
- avoids migration for every new metric
- dashboard can render flexible score payloads
```

Store major groups:

```text
retrieval_scores
citation_scores
judge_scores
summary_scores
```

For frequently queried metrics, you can later add generated columns or explicit columns.

MVP JSONB is fine.

## Example retrieval scores

```json
{
  "hitAt5": true,
  "hitAt10": true,
  "recallAt10": 1.0,
  "expectedSourceRank": 1
}
```

## Example citation scores

```json
{
  "citationPresent": true,
  "citationCount": 2,
  "citationValidity": 1.0,
  "citationTraceability": 1.0
}
```

## Example judge scores

```json
{
  "groundedness": 0.87,
  "correctness": 0.82,
  "completeness": 0.78,
  "citationSupport": 0.91,
  "unsupportedClaims": [],
  "missingImportantPoints": []
}
```

---

# 16. API response shapes

## 16.1 Document response

```json
{
  "id": "doc_123",
  "title": "Remote Work Policy v2",
  "documentType": "markdown",
  "status": "indexed",
  "chunkCount": 12,
  "metadata": {
    "version": "v2",
    "department": "People",
    "tags": ["policy", "remote-work"]
  },
  "createdAt": "2026-05-17T00:00:00Z",
  "updatedAt": "2026-05-17T00:00:00Z"
}
```

## 16.2 Query response

```json
{
  "answer": "Remote work longer than two consecutive weeks requires manager approval.",
  "citations": [
    {
      "documentId": "doc_123",
      "chunkId": "chunk_123",
      "title": "Remote Work Policy v2",
      "section": "Approval process"
    }
  ],
  "traceId": "trace_123",
  "usage": {
    "inputTokens": 3200,
    "outputTokens": 180,
    "estimatedCost": 0.008
  },
  "latencyMs": 1840
}
```

## 16.3 Trace response

```json
{
  "traceId": "trace_123",
  "question": "What is the remote work approval process?",
  "answer": "Remote work longer than two consecutive weeks requires manager approval.",
  "provider": "openai",
  "model": "gpt-4.1-mini",
  "promptVersion": "answer-v1",
  "ragConfig": {
    "id": "config_123",
    "name": "vector-default",
    "retrievalMode": "vector",
    "topK": 8
  },
  "retrievedChunks": [
    {
      "rank": 1,
      "score": 0.91,
      "documentId": "doc_123",
      "chunkId": "chunk_123",
      "title": "Remote Work Policy v2",
      "text": "Remote work longer than two consecutive weeks requires manager approval.",
      "wasUsedInContext": true
    }
  ],
  "citations": [
    {
      "citationIndex": 1,
      "documentId": "doc_123",
      "chunkId": "chunk_123",
      "title": "Remote Work Policy v2",
      "section": "Approval process"
    }
  ],
  "usage": {
    "inputTokens": 3200,
    "outputTokens": 180,
    "estimatedCost": 0.008
  },
  "latencyMs": 1840,
  "createdAt": "2026-05-17T00:00:00Z"
}
```

## 16.4 Eval run response

```json
{
  "id": "run_123",
  "datasetId": "dataset_123",
  "ragConfigId": "config_123",
  "status": "completed",
  "summary": {
    "caseCount": 25,
    "passed": 21,
    "failed": 4,
    "passRate": 0.84,
    "hitAt5": 0.88,
    "groundedness": 0.87,
    "citationSupport": 0.82,
    "averageLatencyMs": 2100,
    "estimatedCost": 0.18
  },
  "startedAt": "2026-05-17T00:00:00Z",
  "completedAt": "2026-05-17T00:08:00Z"
}
```

## 16.5 Eval case result response

```json
{
  "id": "result_123",
  "testCaseId": "case_123",
  "traceId": "trace_123",
  "question": "What is the remote work approval process?",
  "expectedAnswer": "Remote work longer than two consecutive weeks requires manager approval.",
  "generatedAnswer": "Remote work longer than two consecutive weeks requires manager approval.",
  "expectedSources": [
    {
      "documentId": "doc_123",
      "title": "Remote Work Policy v2",
      "section": "Approval process"
    }
  ],
  "retrievalScores": {
    "hitAt5": true,
    "recallAt10": 1.0,
    "expectedSourceRank": 1
  },
  "citationScores": {
    "citationPresent": true,
    "citationValidity": 1.0,
    "citationTraceability": 1.0
  },
  "judgeScores": {
    "groundedness": 0.91,
    "correctness": 0.88,
    "completeness": 0.84,
    "citationSupport": 0.9,
    "unsupportedClaims": [],
    "missingImportantPoints": []
  },
  "verdict": "pass",
  "failureType": null
}
```

---

# 17. Data validation rules

## Documents

```text
title:
  required, non-empty

document_type:
  required, one of markdown/text for MVP

content:
  required on ingest, non-empty

metadata:
  JSON object

status:
  enum
```

## Chunks

```text
text:
  required, non-empty

chunk_index:
  unique per document

embedding:
  required for indexed chunks
```

## Test cases

```text
question:
  required, non-empty

expected_answer:
  optional only if no_answer_expected = true

expected_sources:
  required unless no_answer_expected = true

type:
  enum

difficulty:
  enum
```

## Eval runs

```text
dataset_id:
  required

rag_config_id:
  required

thresholds:
  JSON object

status:
  enum
```

---

# 18. Data consistency rules

## Rule 1: Indexed documents must have chunks

If:

```text
rag.documents.status = indexed
```

Then:

```text
count(rag.document_chunks where document_id = id) > 0
```

## Rule 2: Query traces must include retrieved chunks when completed

If:

```text
rag.query_traces.status = completed
```

Then:

```text
query_trace_chunks should contain at least one row
```

Unless the status is:

```text
completed_no_context
```

## Rule 3: Citations must reference valid chunks where possible

A citation should include:

```text
document_id
chunk_id
```

If the model produces an invalid citation, store it but mark validation failure in eval scoring.

## Rule 4: Eval case result should store trace ID when RAG call succeeds

If RAG query succeeds:

```text
eval.eval_case_results.trace_id is not null
```

If provider or RAG API fails:

```text
trace_id may be null
verdict = error
failure_type = provider_error | timeout | rag_api_error
```

## Rule 5: Eval run summary must be derived from case results

Do not hand-edit `summary_scores`.

It should be calculated from:

```text
eval.eval_case_results
```

---

# 19. Denormalisation decisions

## Store answer in both trace and eval case result

`rag.query_traces.answer` stores the answer.

`eval.eval_case_results.answer` also stores a copy.

Reason:

```text
- eval result remains readable even if trace retrieval changes later
- dashboard can load eval result without extra RAG API call
- useful for historical comparisons
```

## Store summary scores on eval run

`eval.eval_runs.summary_scores` duplicates aggregate data.

Reason:

```text
- faster list pages
- simpler dashboard
- avoids recalculating aggregates repeatedly
```

Source of truth remains case results. Summaries should be recalculated when run completes.

## Store title/section in citations

Even though document title exists in `rag.documents`, store citation display metadata.

Reason:

```text
- citations remain understandable if document metadata changes
- easier dashboard rendering
```

---

# 20. Migration plan

## Migration 001: extensions and schemas

```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS rag;
CREATE SCHEMA IF NOT EXISTS eval;
```

## Migration 002: rag tables

Create:

```text
rag.documents
rag.document_chunks
rag.prompt_versions
rag.rag_configs
rag.query_traces
rag.query_trace_chunks
rag.query_trace_citations
rag.provider_calls
```

## Migration 003: eval tables

Create:

```text
eval.datasets
eval.test_cases
eval.quality_thresholds
eval.evaluator_prompts
eval.eval_runs
eval.eval_case_results
eval.run_comparisons
eval.ci_gate_results
```

## Migration 004: indexes

Create:

```text
basic relational indexes
optional JSONB indexes
optional vector index
```

---

# 21. MVP vs later data model

## MVP

Required:

```text
rag.documents
rag.document_chunks
rag.rag_configs
rag.query_traces
rag.query_trace_chunks
rag.query_trace_citations

eval.datasets
eval.test_cases
eval.eval_runs
eval.eval_case_results
eval.evaluator_prompts
eval.run_comparisons
```

Optional for MVP:

```text
rag.provider_calls
eval.quality_thresholds
eval.ci_gate_results
```

I would still create `rag.provider_calls` early because cost/latency tracking is central.

## Later

Add:

```text
rag.document_versions
rag.ingestion_jobs
rag.chunk_embeddings
eval.manual_reviews
eval.score_overrides
eval.eval_run_artifacts
auth.users
auth.workspaces
```

---

# 22. Future extension: document versioning

For MVP, document version can live in metadata.

Later, add first-class versioning:

```text
rag.document_families
rag.document_versions
```

Example:

```text
document_family:
  Remote Work Policy

versions:
  v1
  v2
```

This would improve temporal/versioned evals.

Do not add this until you need it.

---

# 23. Future extension: manual review

Later, add:

```sql
CREATE TABLE eval.manual_reviews (
  id UUID PRIMARY KEY,
  eval_case_result_id UUID NOT NULL REFERENCES eval.eval_case_results(id),
  reviewer TEXT,
  corrected_verdict TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Useful for:

```text
- human-in-the-loop review
- judge calibration
- correcting noisy LLM judge scores
```

---

# 24. Future extension: multi-provider eval

Later, if comparing models heavily, add:

```text
rag.provider_configs
rag.model_pricing
eval.model_comparison_runs
```

For MVP, store provider/model names directly in configs and traces.

---

# 25. Data design summary

The data model should support the core product promise:

```text
Every answer is traceable.
Every trace is evaluable.
Every eval result is reproducible.
Every change is comparable.
```

The critical tables are:

```text
rag.documents
rag.document_chunks
rag.query_traces
rag.query_trace_chunks
rag.query_trace_citations

eval.datasets
eval.test_cases
eval.eval_runs
eval.eval_case_results
eval.run_comparisons
```

The most important relationships are:

```text
document -> chunks
query trace -> retrieved chunks
query trace -> citations
dataset -> test cases
eval run -> case results
case result -> query trace
comparison -> eval runs
```

The data model should start simple, but preserve the ability to add:

```text
- hybrid retrieval
- reranking
- document versioning
- human review
- CI gates
- multi-provider comparisons
- richer observability
```

This gives RAGLens the right foundation for a production-style RAG evaluation platform.
