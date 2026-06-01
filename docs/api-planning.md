---
title: "API Planning"
description: "API design and endpoint planning for RAGLens services."
order: 9
section: "Architecture"
status: "stable"
---
# API Planning: RAGLens

## 1. API design objective

RAGLens has two backend APIs:

```text
rag-api
  TypeScript + Fastify
  Owns documents, chunks, retrieval, answers, citations, traces, RAG configs.

eval-api
  Python + FastAPI
  Owns datasets, test cases, eval runs, scoring, comparisons, CI gates.
```

The APIs should make this separation clear:

```text
rag-api answers questions.
eval-api measures whether those answers are good.
```

The dashboard consumes both APIs.

The eval-api also consumes rag-api as a black-box client.

---

# 2. API principles

## 2.1 Stable contracts over clever abstractions

Use clear JSON request/response contracts.

Avoid leaking internal implementation details like provider SDK response objects.

## 2.2 Trace-first design

Every successful RAG query should return a `traceId`.

That trace becomes the core link between:

```text
- query response
- dashboard inspection
- eval case result
- citation validation
- run comparison
```

## 2.3 Eval API does not import RAG internals

The eval-api calls rag-api over HTTP:

```text
eval-api -> POST /query
eval-api -> GET /queries/:traceId
```

## 2.4 Structured errors

Every API error should return a predictable shape:

```json
{
  "error": {
    "code": "validation_error",
    "message": "Question is required.",
    "requestId": "req_123",
    "details": {}
  }
}
```

## 2.5 Pagination from day one

List endpoints should support pagination even if MVP data is small.

## 2.6 Version APIs early

Use a version prefix:

```text
/api/v1
```

Example:

```text
GET /api/v1/documents
POST /api/v1/eval-runs
```

---

# 3. Service API boundaries

## rag-api owns

```text
Documents
Document chunks
RAG configs
Prompt versions
Query execution
Query traces
Citations
Provider call telemetry
```

## eval-api owns

```text
Evaluation datasets
Test cases
Eval runs
Eval case results
Scoring
LLM judge execution
Run comparisons
CI quality gates
Threshold presets
```

## dashboard calls

```text
dashboard -> rag-api:
  documents
  queries
  traces
  configs

dashboard -> eval-api:
  datasets
  test cases
  eval runs
  results
  comparisons
  quality gates
```

## eval-api calls rag-api

```text
eval-api -> rag-api:
  POST /api/v1/query
  GET  /api/v1/queries/:traceId
```

---

# 4. Shared API conventions

## 4.1 Naming

Use camelCase in JSON:

```json
{
  "traceId": "trace_123",
  "createdAt": "2026-05-17T00:00:00Z",
  "estimatedCost": 0.008
}
```

Use kebab-case or resource nouns in paths:

```text
/eval-runs
/test-cases
/rag-configs
```

## 4.2 IDs

Use UUIDs.

Example:

```json
{
  "id": "9a98bb24-60e7-4f01-a1fa-d8c8d8b6c333"
}
```

For UI display, the frontend can shorten them.

## 4.3 Dates

Use ISO 8601 strings:

```json
{
  "createdAt": "2026-05-17T10:30:00.000Z"
}
```

## 4.4 Pagination

Request:

```text
?page=1&pageSize=25
```

Response:

```json
{
  "items": [],
  "pagination": {
    "page": 1,
    "pageSize": 25,
    "totalItems": 120,
    "totalPages": 5
  }
}
```

MVP can use page-based pagination.

Cursor pagination can come later.

## 4.5 Sorting

Use:

```text
?sort=createdAt:desc
```

## 4.6 Filtering

Use query params:

```text
GET /api/v1/eval-runs?status=completed&datasetId=...
GET /api/v1/documents?status=indexed&type=markdown
```

## 4.7 Error response

Standard error shape:

```json
{
  "error": {
    "code": "validation_error",
    "message": "Invalid request body.",
    "requestId": "req_123",
    "details": {
      "fieldErrors": {
        "question": ["Required"]
      }
    }
  }
}
```

## 4.8 Common status codes

```text
200 OK
201 Created
202 Accepted
204 No Content
400 Bad Request
404 Not Found
409 Conflict
422 Unprocessable Entity
429 Too Many Requests
500 Internal Server Error
502 Provider Error
503 Service Unavailable
```

---

# 5. rag-api endpoint overview

Base path:

```text
/api/v1
```

## Health

```text
GET /health
```

## Documents

```text
POST /documents/ingest
GET  /documents
GET  /documents/:documentId
GET  /documents/:documentId/chunks
GET  /documents/:documentId/chunks/:chunkId
```

## Query / traces

```text
POST /query
GET  /queries
GET  /queries/:traceId
GET  /queries/:traceId/chunks
GET  /queries/:traceId/citations
```

## RAG configs

```text
GET  /rag-configs
GET  /rag-configs/:configId
POST /rag-configs
```

MVP can make configs read-only/seeded and skip `POST`.

## Prompt versions

```text
GET /prompt-versions
GET /prompt-versions/:promptVersionId
```

## Provider telemetry

```text
GET /provider-calls
GET /provider-calls/:providerCallId
```

Post-MVP or internal dashboard only.

---

# 6. eval-api endpoint overview

Base path:

```text
/api/v1
```

## Health

```text
GET /health
```

## Datasets

```text
POST /datasets
GET  /datasets
GET  /datasets/:datasetId
PATCH /datasets/:datasetId
DELETE /datasets/:datasetId
```

MVP can skip update/delete.

## Test cases

```text
POST /datasets/:datasetId/test-cases
GET  /datasets/:datasetId/test-cases
GET  /test-cases/:testCaseId
PATCH /test-cases/:testCaseId
DELETE /test-cases/:testCaseId
```

MVP can skip update/delete.

## Eval runs

```text
POST /eval-runs
GET  /eval-runs
GET  /eval-runs/:evalRunId
GET  /eval-runs/:evalRunId/results
GET  /eval-runs/:evalRunId/results/:caseResultId
POST /eval-runs/:evalRunId/cancel
```

MVP can skip cancel.

## Comparisons

```text
POST /comparisons
GET  /comparisons
GET  /comparisons/:comparisonId
```

## Thresholds

```text
GET  /threshold-presets
POST /threshold-presets
```

MVP can seed presets and make read-only.

## CI

```text
POST /ci/evaluate
GET  /ci/results/:ciGateResultId
```

Post-MVP.

---

# 7. rag-api detailed contracts

## 7.1 `GET /api/v1/health`

### Purpose

Check service status.

### Response

```json
{
  "status": "ok",
  "service": "rag-api",
  "version": "0.1.0",
  "time": "2026-05-17T10:30:00.000Z"
}
```

---

## 7.2 `POST /api/v1/documents/ingest`

### Purpose

Ingest a markdown/text document into the RAG index.

### Request

```json
{
  "title": "Remote Work Policy v2",
  "documentType": "markdown",
  "content": "# Remote Work Policy\n\nRemote work longer than two consecutive weeks requires manager approval...",
  "sourceUri": "seed://policies/remote-work-policy-v2.md",
  "metadata": {
    "version": "v2",
    "department": "People",
    "tags": ["policy", "remote-work"],
    "effectiveDate": "2025-01-01"
  }
}
```

### Response

```json
{
  "document": {
    "id": "7b9f5c5a-8d17-45c0-a9e7-3bb34ad8b111",
    "title": "Remote Work Policy v2",
    "documentType": "markdown",
    "sourceUri": "seed://policies/remote-work-policy-v2.md",
    "status": "indexed",
    "metadata": {
      "version": "v2",
      "department": "People",
      "tags": ["policy", "remote-work"],
      "effectiveDate": "2025-01-01"
    },
    "createdAt": "2026-05-17T10:30:00.000Z",
    "updatedAt": "2026-05-17T10:30:00.000Z"
  },
  "indexing": {
    "chunkCount": 12,
    "embeddingModel": "text-embedding-3-small"
  }
}
```

### Status codes

```text
201 Created
400 Bad Request
422 Unprocessable Entity
502 Provider Error
```

### Notes

MVP ingestion can be synchronous.

Post-MVP, this should return `202 Accepted` with an ingestion job ID.

---

## 7.3 `GET /api/v1/documents`

### Purpose

List indexed documents.

### Query params

```text
page
pageSize
status
documentType
search
tag
sort
```

Example:

```text
GET /api/v1/documents?page=1&pageSize=25&status=indexed&sort=createdAt:desc
```

### Response

```json
{
  "items": [
    {
      "id": "7b9f5c5a-8d17-45c0-a9e7-3bb34ad8b111",
      "title": "Remote Work Policy v2",
      "documentType": "markdown",
      "sourceUri": "seed://policies/remote-work-policy-v2.md",
      "status": "indexed",
      "chunkCount": 12,
      "metadata": {
        "version": "v2",
        "department": "People",
        "tags": ["policy", "remote-work"]
      },
      "createdAt": "2026-05-17T10:30:00.000Z",
      "updatedAt": "2026-05-17T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 25,
    "totalItems": 10,
    "totalPages": 1
  }
}
```

---

## 7.4 `GET /api/v1/documents/:documentId`

### Purpose

Get document detail.

### Response

```json
{
  "id": "7b9f5c5a-8d17-45c0-a9e7-3bb34ad8b111",
  "title": "Remote Work Policy v2",
  "documentType": "markdown",
  "sourceUri": "seed://policies/remote-work-policy-v2.md",
  "status": "indexed",
  "chunkCount": 12,
  "metadata": {
    "version": "v2",
    "department": "People",
    "tags": ["policy", "remote-work"]
  },
  "createdAt": "2026-05-17T10:30:00.000Z",
  "updatedAt": "2026-05-17T10:30:00.000Z"
}
```

---

## 7.5 `GET /api/v1/documents/:documentId/chunks`

### Purpose

List chunks for a document.

### Response

```json
{
  "items": [
    {
      "id": "38b071ef-8806-45de-8a3d-e7a6aa49b222",
      "documentId": "7b9f5c5a-8d17-45c0-a9e7-3bb34ad8b111",
      "chunkIndex": 0,
      "textPreview": "Remote work longer than two consecutive weeks requires manager approval...",
      "tokenCount": 184,
      "metadata": {
        "section": "Approval process"
      },
      "createdAt": "2026-05-17T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 25,
    "totalItems": 12,
    "totalPages": 1
  }
}
```

---

## 7.6 `GET /api/v1/documents/:documentId/chunks/:chunkId`

### Purpose

Get full chunk detail.

### Response

```json
{
  "id": "38b071ef-8806-45de-8a3d-e7a6aa49b222",
  "documentId": "7b9f5c5a-8d17-45c0-a9e7-3bb34ad8b111",
  "chunkIndex": 0,
  "text": "Remote work longer than two consecutive weeks requires manager approval...",
  "tokenCount": 184,
  "metadata": {
    "section": "Approval process",
    "headingPath": ["Remote Work", "Approval process"]
  },
  "createdAt": "2026-05-17T10:30:00.000Z"
}
```

---

## 7.7 `POST /api/v1/query`

### Purpose

Run a RAG query over indexed documents.

### Request

```json
{
  "question": "What is the remote work approval process?",
  "ragConfigId": "5e6794f4-f2cd-4471-a00f-697efb029555",
  "retrievalMode": "hybrid",
  "rewriteQuery": true,
  "metadataFilters": {
    "department": "People"
  }
}
```

### MVP request minimum

```json
{
  "question": "What is the remote work approval process?"
}
```

If no `ragConfigId` is provided, use default config.

`rewriteQuery` is optional:

```text
- default false for retrievalMode=vector
- default true for retrievalMode=keyword|hybrid|hybrid_reranked
- can be explicitly set true/false per request
```

Prompt context packing is applied before generation:

```text
- retrieved chunks are packed by rank into a token budget
- citations only refer to chunks included in packed context
- trace config records contextTokenBudget/packedChunkCount/droppedChunkCount
```

Reranking adapter behaviour:

```text
- hybrid_reranked uses a configured reranker adapter
- default adapter: deterministic heuristic reranker
- optional adapter mode: none (keeps rerank score equal to original hybrid score)
```

Provider runtime selection:

```text
- provider/model may be selected per request via ragConfigId
- if ragConfigId is omitted, service default provider config is used
- supported providers: deterministic, openai, anthropic, openrouter, ollama
- optional pricing config (ANSWER_INPUT_COST_PER_1M_TOKENS / ANSWER_OUTPUT_COST_PER_1M_TOKENS)
  enables estimatedCostUsd telemetry from provider token usage
- provider failures are normalized into stable error codes:
  provider_unavailable | provider_timeout | provider_invalid_response
```

### Response

```json
{
  "answer": "Remote work longer than two consecutive weeks requires manager approval.",
  "citations": [
    {
      "citationIndex": 1,
      "documentId": "7b9f5c5a-8d17-45c0-a9e7-3bb34ad8b111",
      "chunkId": "38b071ef-8806-45de-8a3d-e7a6aa49b222",
      "title": "Remote Work Policy v2",
      "section": "Approval process"
    }
  ],
  "traceId": "9a98bb24-60e7-4f01-a1fa-d8c8d8b6c333",
  "retrievalQuery": "remote work approval process",
  "queryRewriteEnabled": false,
  "usage": {
    "inputTokens": 3200,
    "outputTokens": 180,
    "estimatedCost": 0.008
  },
  "latencyMs": 1840
}
```

### No context response

If insufficient evidence exists:

```json
{
  "answer": "I could not find enough evidence in the indexed documents to answer this question.",
  "citations": [],
  "traceId": "9a98bb24-60e7-4f01-a1fa-d8c8d8b6c333",
  "usage": {
    "inputTokens": 620,
    "outputTokens": 32,
    "estimatedCost": 0.001
  },
  "latencyMs": 900
}
```

### Status codes

```text
200 OK
400 Bad Request
404 Not Found, if ragConfigId does not exist
502 Provider Error
500 Internal Server Error
```

---

## 7.8 `GET /api/v1/queries`

### Purpose

List query traces.

### Query params

```text
page
pageSize
provider
model
ragConfigId
status
search
sort
```

### Response

```json
{
  "items": [
    {
      "traceId": "9a98bb24-60e7-4f01-a1fa-d8c8d8b6c333",
      "question": "What is the remote work approval process?",
      "answerPreview": "Remote work longer than two consecutive weeks requires...",
      "provider": "openai",
      "model": "gpt-4.1-mini",
      "ragConfigId": "5e6794f4-f2cd-4471-a00f-697efb029555",
      "citationCount": 1,
      "latencyMs": 1840,
      "estimatedCost": 0.008,
      "status": "completed",
      "createdAt": "2026-05-17T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 25,
    "totalItems": 1,
    "totalPages": 1
  }
}
```

---

## 7.9 `GET /api/v1/queries/:traceId`

### Purpose

Get full query trace detail.

### Response

```json
{
  "traceId": "9a98bb24-60e7-4f01-a1fa-d8c8d8b6c333",
  "question": "What is the remote work approval process?",
  "answer": "Remote work longer than two consecutive weeks requires manager approval.",
  "status": "completed",
  "provider": "openai",
  "model": "gpt-4.1-mini",
  "promptVersion": "answer-v1",
  "ragConfig": {
    "id": "5e6794f4-f2cd-4471-a00f-697efb029555",
    "name": "vector-default",
    "retrievalMode": "vector",
    "topK": 8,
    "embeddingModel": "text-embedding-3-small"
  },
  "retrievedChunks": [
    {
      "rank": 1,
      "score": 0.91,
      "rerankScore": null,
      "wasUsedInContext": true,
      "documentId": "7b9f5c5a-8d17-45c0-a9e7-3bb34ad8b111",
      "chunkId": "38b071ef-8806-45de-8a3d-e7a6aa49b222",
      "title": "Remote Work Policy v2",
      "text": "Remote work longer than two consecutive weeks requires manager approval.",
      "metadata": {
        "section": "Approval process"
      }
    }
  ],
  "citations": [
    {
      "citationIndex": 1,
      "documentId": "7b9f5c5a-8d17-45c0-a9e7-3bb34ad8b111",
      "chunkId": "38b071ef-8806-45de-8a3d-e7a6aa49b222",
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
  "createdAt": "2026-05-17T10:30:00.000Z"
}
```

---

## 7.10 `GET /api/v1/rag-configs`

### Purpose

List RAG configs.

### Response

```json
{
  "ragConfigs": [
    {
      "id": "local-balanced",
      "name": "Local Balanced (Ollama qwen3:8b)",
      "answerProvider": "ollama",
      "answerModel": "qwen3:8b",
      "embeddingProvider": "ollama",
      "embeddingModel": "nomic-embed-text",
      "retrievalMode": "vector",
      "topK": 5,
      "rerankerProvider": "none",
      "promptContextTokenBudget": 1200,
      "active": true,
      "metadata": {
        "preset": "local-balanced"
      },
      "createdAt": "2026-05-17T10:30:00.000Z"
    }
  ]
}
```

---

## 7.11 `POST /api/v1/rag-configs`

### Purpose

Create a RAG config.

MVP can defer this and use seed configs.

### Request

```json
{
  "name": "vector-topk-12",
  "provider": "openai",
  "model": "gpt-4.1-mini",
  "embeddingProvider": "openai",
  "embeddingModel": "text-embedding-3-small",
  "retrievalMode": "vector",
  "topK": 12,
  "chunkSize": 800,
  "chunkOverlap": 100,
  "promptVersion": "answer-v1",
  "temperature": 0
}
```

### Response

```json
{
  "id": "0de27ae8-8d41-4a74-ae10-426e1a837777",
  "name": "vector-topk-12"
}
```

---

# 8. eval-api detailed contracts

## 8.1 `GET /api/v1/health`

### Response

```json
{
  "status": "ok",
  "service": "eval-api",
  "version": "0.1.0",
  "time": "2026-05-17T10:30:00.000Z"
}
```

---

## 8.2 `POST /api/v1/datasets`

### Purpose

Create an evaluation dataset.

### Request

```json
{
  "name": "Company Knowledge Base Eval",
  "version": "v1",
  "description": "Golden questions for policy, engineering, and support documents.",
  "metadata": {
    "domain": "sample-company"
  }
}
```

### Response

```json
{
  "id": "3f8147de-cf06-46b4-a64d-16d9d78e9444",
  "name": "Company Knowledge Base Eval",
  "version": "v1",
  "description": "Golden questions for policy, engineering, and support documents.",
  "metadata": {
    "domain": "sample-company"
  },
  "createdAt": "2026-05-17T10:30:00.000Z"
}
```

### Status codes

```text
201 Created
400 Bad Request
409 Conflict, if name/version already exists
```

---

## 8.3 `GET /api/v1/datasets`

### Purpose

List datasets.

### Response

```json
{
  "items": [
    {
      "id": "3f8147de-cf06-46b4-a64d-16d9d78e9444",
      "name": "Company Knowledge Base Eval",
      "version": "v1",
      "description": "Golden questions for policy, engineering, and support documents.",
      "testCaseCount": 25,
      "lastRunAt": "2026-05-17T11:00:00.000Z",
      "createdAt": "2026-05-17T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 25,
    "totalItems": 1,
    "totalPages": 1
  }
}
```

---

## 8.4 `GET /api/v1/datasets/:datasetId`

### Purpose

Get dataset detail.

### Response

```json
{
  "id": "3f8147de-cf06-46b4-a64d-16d9d78e9444",
  "name": "Company Knowledge Base Eval",
  "version": "v1",
  "description": "Golden questions for policy, engineering, and support documents.",
  "metadata": {
    "domain": "sample-company"
  },
  "testCaseCount": 25,
  "createdAt": "2026-05-17T10:30:00.000Z",
  "updatedAt": "2026-05-17T10:30:00.000Z"
}
```

---

## 8.5 `POST /api/v1/datasets/:datasetId/test-cases`

### Purpose

Create a test case.

### Request

```json
{
  "question": "What is the remote work approval process?",
  "expectedAnswer": "Remote work longer than two consecutive weeks requires manager approval.",
  "expectedSources": [
    {
      "sourceRef": "policies/remote-work-policy-v2.md",
      "documentId": "7b9f5c5a-8d17-45c0-a9e7-3bb34ad8b111",
      "title": "Remote Work Policy v2",
      "section": "Approval process",
      "required": true
    }
  ],
  "tags": ["policy", "remote-work"],
  "type": "factual",
  "difficulty": "easy",
  "noAnswerExpected": false,
  "metadata": {}
}
```

### Response

```json
{
  "id": "c2d43612-2950-4a95-a805-4c6d7c465555",
  "datasetId": "3f8147de-cf06-46b4-a64d-16d9d78e9444",
  "question": "What is the remote work approval process?",
  "type": "factual",
  "difficulty": "easy",
  "createdAt": "2026-05-17T10:30:00.000Z"
}
```

### No-answer test case request

```json
{
  "question": "Does the company allow unlimited overseas remote work?",
  "expectedAnswer": null,
  "expectedSources": [],
  "tags": ["policy", "remote-work", "negative"],
  "type": "no_answer",
  "difficulty": "medium",
  "noAnswerExpected": true
}
```

---

## 8.6 `GET /api/v1/datasets/:datasetId/test-cases`

### Purpose

List test cases for a dataset.

### Query params

```text
page
pageSize
type
difficulty
tag
search
```

### Response

```json
{
  "items": [
    {
      "id": "c2d43612-2950-4a95-a805-4c6d7c465555",
      "datasetId": "3f8147de-cf06-46b4-a64d-16d9d78e9444",
      "question": "What is the remote work approval process?",
      "expectedSources": [
        {
          "title": "Remote Work Policy v2",
          "section": "Approval process",
          "required": true
        }
      ],
      "tags": ["policy", "remote-work"],
      "type": "factual",
      "difficulty": "easy",
      "noAnswerExpected": false,
      "createdAt": "2026-05-17T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 25,
    "totalItems": 25,
    "totalPages": 1
  }
}
```

---

## 8.7 `GET /api/v1/test-cases/:testCaseId`

### Purpose

Get test case detail.

### Response

```json
{
  "id": "c2d43612-2950-4a95-a805-4c6d7c465555",
  "datasetId": "3f8147de-cf06-46b4-a64d-16d9d78e9444",
  "question": "What is the remote work approval process?",
  "expectedAnswer": "Remote work longer than two consecutive weeks requires manager approval.",
  "expectedSources": [
    {
      "sourceRef": "policies/remote-work-policy-v2.md",
      "documentId": "7b9f5c5a-8d17-45c0-a9e7-3bb34ad8b111",
      "title": "Remote Work Policy v2",
      "section": "Approval process",
      "required": true
    }
  ],
  "tags": ["policy", "remote-work"],
  "type": "factual",
  "difficulty": "easy",
  "noAnswerExpected": false,
  "metadata": {},
  "createdAt": "2026-05-17T10:30:00.000Z"
}
```

---

## 8.8 `POST /api/v1/eval-runs`

### Purpose

Start an evaluation run.

### Request

```json
{
  "datasetId": "3f8147de-cf06-46b4-a64d-16d9d78e9444",
  "ragConfigId": "5e6794f4-f2cd-4471-a00f-697efb029555",
  "judgeEnabled": true,
  "thresholds": {
    "minHitAt5": 0.8,
    "minCitationValidity": 0.95,
    "minGroundedness": 0.85,
    "minCorrectness": 0.8,
    "maxAverageLatencyMs": 5000
  },
  "maxCases": null,
  "notes": "Baseline vector eval"
}
```

### Response

Use `202 Accepted` because eval runs may be long-running.

```json
{
  "id": "cbac07fc-2f19-43db-a03c-2c22f3f46666",
  "datasetId": "3f8147de-cf06-46b4-a64d-16d9d78e9444",
  "ragConfigId": "5e6794f4-f2cd-4471-a00f-697efb029555",
  "status": "queued",
  "createdAt": "2026-05-17T10:30:00.000Z"
}
```

### MVP note

Even if implementation runs synchronously in-process, keep API semantics as asynchronous:

```text
POST creates run and returns run ID.
Client polls GET /eval-runs/:id.
```

---

## 8.9 `GET /api/v1/eval-runs`

### Purpose

List eval runs.

### Query params

```text
page
pageSize
datasetId
ragConfigId
status
sort
```

### Response

```json
{
  "items": [
    {
      "id": "cbac07fc-2f19-43db-a03c-2c22f3f46666",
      "datasetId": "3f8147de-cf06-46b4-a64d-16d9d78e9444",
      "datasetName": "Company Knowledge Base Eval",
      "ragConfigId": "5e6794f4-f2cd-4471-a00f-697efb029555",
      "ragConfigName": "vector-default",
      "status": "completed",
      "summary": {
        "passRate": 0.84,
        "hitAt5": 0.88,
        "groundedness": 0.87,
        "citationSupport": 0.82,
        "averageLatencyMs": 2100,
        "estimatedCost": 0.18
      },
      "createdAt": "2026-05-17T10:30:00.000Z",
      "completedAt": "2026-05-17T10:38:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 25,
    "totalItems": 5,
    "totalPages": 1
  }
}
```

---

## 8.10 `GET /api/v1/eval-runs/:evalRunId`

### Purpose

Get eval run summary.

### Response

```json
{
  "id": "cbac07fc-2f19-43db-a03c-2c22f3f46666",
  "datasetId": "3f8147de-cf06-46b4-a64d-16d9d78e9444",
  "datasetName": "Company Knowledge Base Eval",
  "ragConfigId": "5e6794f4-f2cd-4471-a00f-697efb029555",
  "ragConfigName": "vector-default",
  "status": "completed",
  "progress": {
    "totalCases": 25,
    "completedCases": 25,
    "failedCases": 4,
    "errorCases": 0
  },
  "thresholds": {
    "minHitAt5": 0.8,
    "minCitationValidity": 0.95,
    "minGroundedness": 0.85
  },
  "summary": {
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
  },
  "startedAt": "2026-05-17T10:30:00.000Z",
  "completedAt": "2026-05-17T10:38:00.000Z",
  "createdAt": "2026-05-17T10:30:00.000Z"
}
```

---

## 8.11 `GET /api/v1/eval-runs/:evalRunId/results`

### Purpose

List case results for an eval run.

### Query params

```text
page
pageSize
verdict
failureType
type
tag
difficulty
```

### Response

```json
{
  "items": [
    {
      "id": "a7ef52ed-5f2b-4b89-b179-5da355847777",
      "evalRunId": "cbac07fc-2f19-43db-a03c-2c22f3f46666",
      "testCaseId": "c2d43612-2950-4a95-a805-4c6d7c465555",
      "traceId": "9a98bb24-60e7-4f01-a1fa-d8c8d8b6c333",
      "question": "What is the remote work approval process?",
      "type": "factual",
      "difficulty": "easy",
      "verdict": "pass",
      "failureType": null,
      "scores": {
        "hitAt5": true,
        "groundedness": 0.91,
        "citationSupport": 0.9
      },
      "latencyMs": 1840,
      "estimatedCost": 0.008,
      "createdAt": "2026-05-17T10:31:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 25,
    "totalItems": 25,
    "totalPages": 1
  }
}
```

---

## 8.12 `GET /api/v1/eval-runs/:evalRunId/results/:caseResultId`

### Purpose

Get detailed case result for failed-case analysis.

### Response

```json
{
  "id": "a7ef52ed-5f2b-4b89-b179-5da355847777",
  "evalRunId": "cbac07fc-2f19-43db-a03c-2c22f3f46666",
  "testCase": {
    "id": "c2d43612-2950-4a95-a805-4c6d7c465555",
    "question": "What is the remote work approval process?",
    "expectedAnswer": "Remote work longer than two consecutive weeks requires manager approval.",
    "expectedSources": [
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
    "noAnswerExpected": false
  },
  "result": {
    "traceId": "9a98bb24-60e7-4f01-a1fa-d8c8d8b6c333",
    "generatedAnswer": "Remote work longer than two consecutive weeks requires manager approval.",
    "retrievalScores": {
      "hitAt5": true,
      "recallAt10": 1,
      "expectedSourceRank": 1,
      "retrievedExpectedSources": [
        {
          "documentId": "7b9f5c5a-8d17-45c0-a9e7-3bb34ad8b111",
          "rank": 1
        }
      ],
      "missingExpectedSources": []
    },
    "citationScores": {
      "citationPresent": true,
      "citationValidity": 1,
      "citationTraceability": 1,
      "invalidCitations": [],
      "untracedCitations": []
    },
    "judgeScores": {
      "enabled": true,
      "promptVersion": "judge-v1",
      "groundedness": 0.91,
      "correctness": 0.88,
      "completeness": 0.84,
      "citationSupport": 0.9,
      "unsupportedClaims": [],
      "missingImportantPoints": []
    },
    "verdict": "pass",
    "failureType": null,
    "evaluatorNotes": "Answer is grounded and cites the expected source.",
    "latencyMs": 1840,
    "estimatedCost": 0.008
  }
}
```

### Failed example fields

```json
{
  "result": {
    "verdict": "fail",
    "failureType": "retrieval_miss",
    "evaluatorNotes": "Expected source was not retrieved in top 10. Generated answer used stale context.",
    "retrievalScores": {
      "hitAt5": false,
      "recallAt10": 0,
      "expectedSourceRank": null,
      "retrievedExpectedSources": [],
      "missingExpectedSources": [
        {
          "documentId": "7b9f5c5a-8d17-45c0-a9e7-3bb34ad8b111",
          "title": "Remote Work Policy v2"
        }
      ]
    }
  }
}
```

---

## 8.13 `POST /api/v1/comparisons`

### Purpose

Compare two eval runs.

### Request

```json
{
  "baselineRunId": "run_baseline",
  "candidateRunId": "run_candidate"
}
```

### Response

```json
{
  "id": "f313299d-d0a2-4296-a2a4-9747a9388888",
  "baselineRunId": "run_baseline",
  "candidateRunId": "run_candidate",
  "summary": {
    "passRateDelta": 0.08,
    "hitAt5Delta": 0.11,
    "groundednessDelta": 0.07,
    "citationSupportDelta": 0.08,
    "averageLatencyMsDelta": 800,
    "estimatedCostDelta": 0.06
  },
  "createdAt": "2026-05-17T10:40:00.000Z"
}
```

---

## 8.14 `GET /api/v1/comparisons/:comparisonId`

### Purpose

Get detailed comparison.

### Response

```json
{
  "id": "f313299d-d0a2-4296-a2a4-9747a9388888",
  "baseline": {
    "runId": "run_baseline",
    "ragConfigName": "vector-default",
    "summary": {
      "passRate": 0.78,
      "hitAt5": 0.8,
      "groundedness": 0.82,
      "citationSupport": 0.76,
      "averageLatencyMs": 1900,
      "estimatedCost": 0.12
    }
  },
  "candidate": {
    "runId": "run_candidate",
    "ragConfigName": "hybrid-default",
    "summary": {
      "passRate": 0.86,
      "hitAt5": 0.91,
      "groundedness": 0.89,
      "citationSupport": 0.84,
      "averageLatencyMs": 2700,
      "estimatedCost": 0.18
    }
  },
  "deltas": {
    "passRate": 0.08,
    "hitAt5": 0.11,
    "groundedness": 0.07,
    "citationSupport": 0.08,
    "averageLatencyMs": 800,
    "estimatedCost": 0.06
  },
  "improvedCases": [
    {
      "testCaseId": "case_123",
      "question": "What is the rollback process after a failed mobile release?",
      "baselineVerdict": "fail",
      "candidateVerdict": "pass",
      "reason": "Candidate run retrieved the expected incident runbook."
    }
  ],
  "regressedCases": [
    {
      "testCaseId": "case_456",
      "question": "Does the company allow unlimited overseas remote work?",
      "baselineVerdict": "pass",
      "candidateVerdict": "fail",
      "reason": "Candidate answer made unsupported claim."
    }
  ],
  "createdAt": "2026-05-17T10:40:00.000Z"
}
```

---

## 8.15 `GET /api/v1/threshold-presets`

### Purpose

List quality gate threshold presets.

### Response

```json
{
  "items": [
    {
      "id": "balanced",
      "name": "Balanced",
      "description": "Default quality gate for normal RAG changes.",
      "thresholds": {
        "minHitAt5": 0.8,
        "minCitationValidity": 0.95,
        "minGroundedness": 0.85,
        "minCorrectness": 0.8,
        "maxAverageLatencyMs": 5000
      }
    }
  ]
}
```

---

## 8.16 `POST /api/v1/ci/evaluate`

Post-MVP.

### Purpose

Run an eval suite as a CI quality gate.

### Request

```json
{
  "datasetId": "3f8147de-cf06-46b4-a64d-16d9d78e9444",
  "ragConfigId": "5e6794f4-f2cd-4471-a00f-697efb029555",
  "thresholdPreset": "balanced",
  "commitSha": "abc123",
  "branch": "feature/prompt-v2"
}
```

### Response

```json
{
  "status": "pass",
  "evalRunId": "run_123",
  "ciGateResultId": "gate_123",
  "summary": {
    "passRate": 0.84,
    "hitAt5": 0.88,
    "groundedness": 0.87,
    "citationSupport": 0.82,
    "averageLatencyMs": 2100
  },
  "thresholdFailures": []
}
```

### Failure response

This is still a `200 OK` if the API call succeeded but the quality gate failed.

```json
{
  "status": "fail",
  "evalRunId": "run_123",
  "ciGateResultId": "gate_123",
  "summary": {
    "passRate": 0.68,
    "groundedness": 0.72
  },
  "thresholdFailures": [
    {
      "metric": "groundedness",
      "expected": ">= 0.85",
      "actual": 0.72
    }
  ]
}
```

Use HTTP errors only for API/system failures.

---

# 9. Async behaviour

## Eval run creation

Even if the MVP executes sequentially in-process, the contract should be async:

```text
POST /eval-runs -> 202 Accepted
GET /eval-runs/:id -> poll status
GET /eval-runs/:id/results -> inspect partial results
```

## Status progression

```text
queued
running
completed
partially_failed
failed
cancelled
```

## Running response example

```json
{
  "id": "run_123",
  "status": "running",
  "progress": {
    "totalCases": 25,
    "completedCases": 7,
    "failedCases": 1,
    "errorCases": 0
  },
  "summary": {
    "estimatedCostSoFar": 0.06
  }
}
```

---

# 10. Error model

## Error codes

Common:

```text
validation_error
not_found
conflict
internal_error
service_unavailable
```

rag-api specific:

```text
document_empty
unsupported_document_type
embedding_provider_error
generation_provider_error
retrieval_error
rag_config_not_found
trace_not_found
```

eval-api specific:

```text
dataset_not_found
test_case_not_found
eval_run_not_found
eval_run_not_completed
rag_api_unavailable
judge_provider_error
judge_output_invalid
comparison_dataset_mismatch
quality_gate_failed
```

## Example validation error

```json
{
  "error": {
    "code": "validation_error",
    "message": "Invalid request body.",
    "requestId": "req_123",
    "details": {
      "fieldErrors": {
        "question": ["Question is required."]
      }
    }
  }
}
```

## Example provider error

```json
{
  "error": {
    "code": "generation_provider_error",
    "message": "Answer generation failed.",
    "requestId": "req_456",
    "details": {
      "provider": "openai",
      "operation": "answer_generation"
    }
  }
}
```

---

# 11. Authentication and security

## MVP

Local-only, no auth.

Still follow these rules:

```text
- do not expose API keys through endpoints
- do not log secrets
- use .env for provider keys
- use .env.example for required variables
```

## Post-MVP

Add simple API auth:

```text
Authorization: Bearer <token>
```

Later:

```text
- dashboard login
- workspaces
- user roles
- document-level permissions
```

---

# 12. OpenAPI planning

Create:

```text
packages/contracts/openapi/rag-api.yaml
packages/contracts/openapi/eval-api.yaml
```

## rag-api tags

```text
Health
Documents
Queries
RAG Configs
Prompt Versions
Provider Calls
```

## eval-api tags

```text
Health
Datasets
Test Cases
Eval Runs
Comparisons
Thresholds
CI
```

## Contract generation

MVP:

```text
manual clients are acceptable
```

Post-MVP:

```text
generate TypeScript dashboard client
generate Python rag-api client for eval-api
```

---

# 13. MVP API scope

## rag-api MVP endpoints

Build these first:

```text
GET  /api/v1/health
POST /api/v1/documents/ingest
GET  /api/v1/documents
GET  /api/v1/documents/:documentId
GET  /api/v1/documents/:documentId/chunks
POST /api/v1/query
GET  /api/v1/queries
GET  /api/v1/queries/:traceId
GET  /api/v1/rag-configs
```

## eval-api MVP endpoints

Build these first:

```text
GET  /api/v1/health
POST /api/v1/datasets
GET  /api/v1/datasets
GET  /api/v1/datasets/:datasetId
POST /api/v1/datasets/:datasetId/test-cases
GET  /api/v1/datasets/:datasetId/test-cases
POST /api/v1/eval-runs
GET  /api/v1/eval-runs
GET  /api/v1/eval-runs/:evalRunId
GET  /api/v1/eval-runs/:evalRunId/results
GET  /api/v1/eval-runs/:evalRunId/results/:caseResultId
POST /api/v1/comparisons
GET  /api/v1/comparisons/:comparisonId
```

## Post-MVP endpoints

```text
PATCH /datasets/:datasetId
DELETE /datasets/:datasetId
PATCH /test-cases/:testCaseId
DELETE /test-cases/:testCaseId
POST /eval-runs/:evalRunId/cancel
POST /ci/evaluate
GET  /ci/results/:ciGateResultId
POST /rag-configs
PATCH /rag-configs/:configId
```

---

# 14. Dashboard API usage map

## Documents page

Calls:

```text
GET /api/v1/documents
```

## Document detail

Calls:

```text
GET /api/v1/documents/:documentId
GET /api/v1/documents/:documentId/chunks
```

## Query trace list

Calls:

```text
GET /api/v1/queries
```

## Query trace detail

Calls:

```text
GET /api/v1/queries/:traceId
```

## Dataset list

Calls:

```text
GET /api/v1/datasets
```

## Dataset detail

Calls:

```text
GET /api/v1/datasets/:datasetId
GET /api/v1/datasets/:datasetId/test-cases
```

## Eval run list

Calls:

```text
GET /api/v1/eval-runs
```

## Eval run detail

Calls:

```text
GET /api/v1/eval-runs/:evalRunId
GET /api/v1/eval-runs/:evalRunId/results
```

## Failed case detail

Calls:

```text
GET /api/v1/eval-runs/:evalRunId/results/:caseResultId
GET /api/v1/queries/:traceId
```

The second call goes to rag-api.

## Comparison detail

Calls:

```text
GET /api/v1/comparisons/:comparisonId
```

---

# 15. API implementation order

## Step 1: Health and config

```text
rag-api:
  GET /health

eval-api:
  GET /health
```

## Step 2: Documents

```text
POST /documents/ingest
GET /documents
GET /documents/:id
GET /documents/:id/chunks
```

## Step 3: RAG configs

```text
GET /rag-configs
```

Seed configs in DB.

## Step 4: Query and trace

```text
POST /query
GET /queries
GET /queries/:traceId
```

## Step 5: Datasets and test cases

```text
POST /datasets
GET /datasets
GET /datasets/:id
POST /datasets/:id/test-cases
GET /datasets/:id/test-cases
```

## Step 6: Eval runs

```text
POST /eval-runs
GET /eval-runs
GET /eval-runs/:id
GET /eval-runs/:id/results
GET /eval-runs/:id/results/:caseResultId
```

## Step 7: Comparisons

```text
POST /comparisons
GET /comparisons/:id
```

## Step 8: CI

```text
POST /ci/evaluate
```

---

# 16. API testing plan

## rag-api tests

```text
POST /documents/ingest:
  valid markdown creates document and chunks
  empty content returns 400
  unsupported document type returns 400

POST /query:
  valid question returns answer, citations, traceId
  missing question returns 400
  unknown ragConfigId returns 404
  provider failure returns structured error

GET /queries/:traceId:
  returns trace with retrieved chunks
  unknown trace returns 404
```

## eval-api tests

```text
POST /datasets:
  creates dataset
  duplicate name/version returns 409

POST /datasets/:id/test-cases:
  creates factual test case
  creates no-answer test case
  invalid type returns 400

POST /eval-runs:
  creates run
  calls rag-api client
  stores case results
  handles rag-api failure

GET /eval-runs/:id/results/:caseResultId:
  returns detailed failed case payload

POST /comparisons:
  compares matching datasets
  warns or fails on mismatched datasets
```

---

# 17. Final API planning summary

The API plan should support this product loop:

```text
1. rag-api ingests documents.
2. rag-api answers questions with citations.
3. rag-api stores query traces.
4. eval-api creates golden datasets.
5. eval-api runs test cases against rag-api.
6. eval-api scores traces and answers.
7. eval-api compares runs.
8. dashboard explains what happened.
9. CI can later block regressions.
```

The most important contracts are:

```text
POST /api/v1/query
GET  /api/v1/queries/:traceId
POST /api/v1/eval-runs
GET  /api/v1/eval-runs/:evalRunId/results/:caseResultId
POST /api/v1/comparisons
```

Those endpoints carry the core product value:

```text
Every answer is traceable.
Every trace is evaluable.
Every change is measurable.
```
