---
title: "ADR: Provider-Neutral Runtime"
description: "Architecture decision record for provider-neutral chat, embedding, reranker, and model profile support."
order: 16
section: "Architecture"
status: "draft"
---

# ADR: Provider-Neutral Runtime

## Status

Accepted for implementation planning.

## Context

RAGLens needs to support local model testing without locking the RAG pipeline to a single model vendor.

The platform should be able to compare:

```text
- local chat models
- cloud chat models
- local embedding models
- cloud embedding models
- vector retrieval with and without reranking
- answer models judged by separate evaluator models
```

The current roadmap already includes provider expansion later, but provider seams are required earlier during embeddings, retrieval, answer generation, tracing, and eval execution.

If the first implementation hardcodes one provider, later local LLM support will require invasive changes to ingestion, retrieval, tracing, evaluation, and dashboard code.

---

## Decision

RAGLens will use provider-neutral runtime interfaces for:

```text
- chat generation
- embeddings
- reranking
- judge scoring
```

RAGLens will also use named model profiles to bundle provider choices into reproducible runtime configurations.

The primary runtime concepts are:

```text
ChatModelProvider
EmbeddingProvider
RerankerProvider
JudgeProvider
ModelProfile
EmbeddingIndexConfig
```

The RAG pipeline depends on these interfaces, not on SDK-specific implementation details.

---

## Runtime interfaces

## ChatModelProvider

Purpose:

```text
Generate source-grounded answers from packed context and a prompt version.
```

Contract shape:

```ts
export interface ChatModelProvider {
  generate(input: ChatGenerationInput): Promise<ChatGenerationResult>;
}
```

Responsibilities:

```text
- send prompt/messages to provider
- apply timeout policy
- return generated text
- return token usage when available
- return provider latency
- map provider errors into RAGLens error codes
```

Non-responsibilities:

```text
- retrieval
- citation validation
- trace persistence
- eval scoring
```

---

## EmbeddingProvider

Purpose:

```text
Create vectors for chunks and queries.
```

Contract shape:

```ts
export interface EmbeddingProvider {
  embedText(input: string): Promise<number[]>;
  embedBatch(input: string[]): Promise<number[][]>;
}
```

Responsibilities:

```text
- generate embeddings
- expose expected dimensions through config
- support mocked tests
- map provider errors into RAGLens error codes
```

Non-responsibilities:

```text
- choosing chunk boundaries
- storing vectors
- selecting the vector index
- calculating retrieval scores
```

---

## RerankerProvider

Purpose:

```text
Reorder retrieved chunks using a query-document scoring model.
```

Contract shape:

```ts
export interface RerankerProvider {
  rerank(input: RerankInput): Promise<RerankResult[]>;
}
```

MVP default:

```text
NoopRerankerProvider
```

Reranking is post-MVP and must not block basic vector retrieval.

---

## JudgeProvider

Purpose:

```text
Score generated answers against expected answer, expected sources, retrieved context, and citations.
```

Important rule:

```text
Judge provider configuration is separate from answer provider configuration.
```

The answer model should not automatically judge its own output.

---

## Model profiles

A model profile is a named runtime bundle.

Example profile names:

```text
local-fast
local-balanced
local-quality
cloud-baseline
```

Each profile defines:

```text
id
name
description
chat provider
chat model
embedding provider
embedding model
embedding dimensions
embedding index id
reranker provider
reranker model
retrieval mode
topK
context budget
prompt version
timeout settings
expected runtime notes
```

Model profiles make eval runs and query traces reproducible.

---

## Initial profiles

## local-balanced

Purpose:

```text
Default local development profile for RAGLens.
```

Configuration:

```text
chat provider: ollama
chat model: qwen3:8b
embedding provider: ollama
embedding model: nomic-embed-text
reranker provider: none
retrieval mode: vector
```

## cloud-baseline

Purpose:

```text
Quality, latency, and cost baseline against a managed provider.
```

Configuration:

```text
chat provider: openai
embedding provider: openai
reranker provider: none
retrieval mode: vector
```

## local-fast

Purpose:

```text
Smoke tests and UI development after local-balanced works.
```

Configuration:

```text
chat provider: ollama
chat model: small local model
embedding provider: ollama
embedding model: nomic-embed-text
reranker provider: none
retrieval mode: vector
```

## local-quality

Purpose:

```text
Higher quality local comparison runs after traces and eval comparison are stable.
```

Configuration:

```text
chat provider: ollama
chat model: larger local model
embedding provider: local or ollama
embedding model: bge-m3 or mxbai-embed-large
reranker provider: optional bge reranker
retrieval mode: vector or hybrid_reranked
```

---

## Embedding index compatibility

Embedding vectors are not interchangeable across models with different dimensions or behaviours.

RAGLens must not mix embeddings from incompatible models in the same index.

Use an explicit index config:

```ts
export type EmbeddingIndexConfig = {
  indexId: string;
  provider: string;
  model: string;
  dimensions: number;
  distanceMetric: 'cosine' | 'dot' | 'l2';
  createdAt: string;
};
```

Every chunk embedding and query trace should be tied to an embedding index config.

Dimension validation rule:

```text
Query embedding dimensions must match the selected embedding index dimensions before vector search runs.
```

Failure mode:

```text
Return a structured configuration error. Do not run retrieval against an incompatible index.
```

---

## Trace requirements

Every query trace must record enough runtime information to reproduce and compare the answer.

Required runtime metadata:

```text
modelProfileId
chatProvider
chatModel
embeddingProvider
embeddingModel
embeddingDimensions
embeddingIndexId
retrievalMode
topK
rerankerProvider
rerankerModel
promptVersion
latencyMs
usage
estimatedCost
providerErrorCode
```

This metadata lets the dashboard answer:

```text
What model answered?
What embedding model retrieved the chunks?
Was a reranker used?
What did the run cost?
Was the local model slower or less accurate than the cloud baseline?
```

---

## Eval requirements

Eval runs must store the selected RAG runtime profile.

Required eval metadata:

```text
ragConfigId
modelProfileId
judgeProvider
judgeModel
judgeEnabled
```

The eval runner must pass the selected `modelProfileId` or resolved `ragConfigId` to rag-api when executing each test case.

---

## Consequences

## Positive

```text
- Local LLM support can be added without rewriting the RAG pipeline.
- Cloud and local models can be compared consistently.
- Query traces remain reproducible.
- Eval runs can measure quality, cost, and latency trade-offs.
- Tests can mock providers instead of requiring real model runtimes.
```

## Negative

```text
- More upfront modelling in Phase 4 and Phase 5.
- Provider config must be carefully validated.
- Embedding dimension/index compatibility adds migration complexity.
- Dashboard must display runtime metadata clearly.
```

---

## Implementation policy

Do first:

```text
- provider interfaces
- local-balanced profile
- embedding index metadata
- trace runtime metadata
- mocked provider tests
```

Defer:

```text
- model download manager
- GPU orchestration
- provider marketplace UI
- local judge model
- reranker implementation
- local-quality profile
```

---

## Testing policy

Unit and CI tests must not require a running local model runtime.

Use:

```text
- mocked ChatModelProvider
- mocked EmbeddingProvider
- mocked RerankerProvider
- mocked JudgeProvider
```

Manual integration tests can use:

```text
OLLAMA_BASE_URL=http://localhost:11434
LLM_MODEL=qwen3:8b
EMBEDDING_MODEL=nomic-embed-text
```

---

## Related docs

```text
docs/local-llm-runtime-plan.md
docs/local-runtime-roadmap-placement.md
docs/roadmap.md
docs/technical-design-decisions.md
docs/data-design.md
docs/api-planning.md
docs/evaluation-methodology.md
```
