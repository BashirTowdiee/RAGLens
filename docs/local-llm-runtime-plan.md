---
title: "Local LLM Runtime Plan"
description: "Implementation plan for adding local LLM, embedding, reranker, and model profile support to RAGLens."
order: 14
section: "Architecture"
status: "draft"
---

# Local LLM Runtime Plan

## Purpose

RAGLens should support local model testing without making the core RAG pipeline depend on one provider such as OpenAI.

The goal is to let the same document corpus, query set, trace model, and evaluation flow run against different runtime profiles:

```text
local-fast
local-balanced
local-quality
cloud-baseline
```

This enables practical comparison of:

```text
answer quality
retrieval quality
citation quality
latency
cost
privacy trade-offs
hardware limits
```

## Where this sits in the roadmap

This work sits across existing roadmap phases rather than replacing them.

Primary placement:

```text
Phase 4: Embeddings and vector retrieval
Phase 5: RAG query and cited answer generation
Phase 6: Query trace persistence
Phase 8: Eval runner MVP
Phase 10: LLM-as-judge scoring
Phase 12: Run comparison
Phase 15: Advanced retrieval
Phase 16: Provider expansion
```

Do not implement the full local model matrix immediately.

For MVP, local model support should enter as a small provider abstraction extension during Phase 4 and Phase 5, then become more valuable during evaluation and comparison phases.

## Current position

RAGLens currently has the correct high-level shape for this work:

```text
rag-api answers questions.
eval-api decides whether those answers are good.
dashboard explains what happened.
```

The current bootstrap already includes service boundaries, document ingestion, chunk inspection, PostgreSQL/pgvector infrastructure, seed corpus, dashboard document screens, docs, and CI.

That means the project is ready to plan local model support, but not ready to prioritise every local model feature before the core RAG loop is complete.

## Design principles

### 1. Provider-neutral core

The RAG pipeline must not hardcode OpenAI, Ollama, Anthropic, OpenRouter, Qwen, Llama, Mistral, or any specific model.

Use provider interfaces:

```ts
export interface ChatModelProvider {
  generate(input: ChatGenerationInput): Promise<ChatGenerationResult>;
}

export interface EmbeddingProvider {
  embedText(input: string): Promise<number[]>;
  embedBatch(input: string[]): Promise<number[][]>;
}

export interface RerankerProvider {
  rerank(input: RerankInput): Promise<RerankResult[]>;
}
```

Provider implementations should live in infrastructure/provider modules. Use cases should depend on interfaces only.

### 2. Model profiles over raw settings

Users should not have to manually configure every low-level option for normal testing.

Define named profiles:

```text
local-fast
local-balanced
local-quality
cloud-baseline
```

Each profile should define:

```text
chat provider
chat model
embedding provider
embedding model
embedding dimensions
reranker provider
retrieval mode
default topK
context budget
expected runtime notes
```

### 3. Embedding indexes are versioned data

Changing embedding models changes vector dimensions and retrieval behaviour.

Do not mix embeddings from different models in the same vector index.

Track index compatibility explicitly:

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

Each document chunk embedding should be associated with an index/config identity.

### 4. Eval model is separate from answer model

The model that generates answers should not automatically be the model that judges those answers.

RAGLens should support separate config for:

```text
answer generation model
evaluation judge model
embedding model
reranker model
```

This avoids circular evaluation, where a weak local model grades its own output.

### 5. Local-first does not mean local-only

Local runtime support should exist beside cloud baselines.

The main product value is comparison:

```text
local qwen3:8b + local embeddings
vs
OpenAI answer model + OpenAI embeddings
vs
local embedding + cloud answer model
vs
local answer model + cloud judge model
```

## Recommended initial local profiles

### local-fast

Purpose:

```text
Smoke tests, UI development, fast feedback loops.
```

Suggested defaults:

```text
chat provider: ollama
chat model: qwen3:4b or llama3.2:3b
embedding provider: ollama
embedding model: nomic-embed-text
reranker provider: none
```

### local-balanced

Purpose:

```text
Default local development profile for RAGLens.
```

Suggested defaults:

```text
chat provider: ollama
chat model: qwen3:8b
embedding provider: ollama
embedding model: nomic-embed-text
reranker provider: none
```

### local-quality

Purpose:

```text
Higher quality local experiments and comparison runs.
```

Suggested defaults:

```text
chat provider: ollama
chat model: qwen3:14b
embedding provider: local
embedding model: bge-m3 or mxbai-embed-large
reranker provider: bge-reranker-v2-m3
```

### cloud-baseline

Purpose:

```text
Quality, latency, and cost baseline against a managed model provider.
```

Suggested defaults:

```text
chat provider: openai
embedding provider: openai
reranker provider: none initially
```

## Implementation plan

## Stage L0: Document runtime decision

Goal:

```text
Make local model support an intentional architecture decision.
```

Scope:

```text
- Add this plan.
- Add ADR for provider-neutral model runtime.
- Define initial model profile names.
- Record non-goals.
```

Acceptance criteria:

```text
- Local LLM support is documented.
- Roadmap placement is clear.
- MVP does not expand into premature model comparison work.
```

## Stage L1: Provider interfaces

Goal:

```text
Add stable provider contracts before adding concrete providers.
```

Scope:

```text
apps/rag-api/src/domain/providers/
  ChatModelProvider.ts
  EmbeddingProvider.ts
  RerankerProvider.ts

apps/rag-api/src/domain/model-profiles/
  ModelProfile.ts
```

Acceptance criteria:

```text
- Use cases depend on provider interfaces.
- No direct provider SDK calls from routes.
- Reranker can be disabled with a NoopRerankerProvider.
- Unit tests cover provider contract expectations.
```

## Stage L2: Ollama embedding provider

Goal:

```text
Allow local embeddings through Ollama for development.
```

Scope:

```text
- Add OllamaEmbeddingProvider.
- Add environment config for OLLAMA_BASE_URL and EMBEDDING_MODEL.
- Add mocked tests.
- Add manual integration notes.
```

Acceptance criteria:

```text
- Ingested chunks can receive embeddings from a local provider.
- Provider calls are mockable in tests.
- Embedding dimensions are stored with the embedding index config.
- Provider failure returns structured errors.
```

## Stage L3: Embedding index config

Goal:

```text
Prevent vector incompatibility when switching embedding models.
```

Scope:

```text
- Add embedding index metadata.
- Associate chunk embeddings with an index/config.
- Validate query embedding dimensions against index dimensions.
```

Acceptance criteria:

```text
- Different embedding dimensions cannot be mixed accidentally.
- Retrieval fails safely on incompatible config.
- Trace records include embedding provider, model, dimensions, and index id.
```

## Stage L4: Ollama chat provider

Goal:

```text
Allow local answer generation through Ollama.
```

Scope:

```text
- Add OllamaChatProvider.
- Add timeout handling.
- Add structured response mapping.
- Add local-balanced profile.
```

Acceptance criteria:

```text
- /query can generate an answer using Ollama.
- Citations are still validated against retrieved chunks.
- Provider name, model, latency, and errors are persisted in query traces.
- Tests use mocked provider responses, not real Ollama.
```

## Stage L5: Model profiles

Goal:

```text
Allow RAGLens to run named runtime configurations.
```

Scope:

```text
- Add model profile config schema.
- Seed local-fast, local-balanced, and cloud-baseline profiles.
- Expose profiles via rag-api endpoint.
- Store selected profile on query traces and eval runs.
```

Endpoint:

```text
GET /api/v1/model-profiles
```

Acceptance criteria:

```text
- User can list available model profiles.
- Query accepts or resolves a profile id.
- Trace records profile id and resolved provider/model config.
- Eval run records profile id.
```

## Stage L6: Eval profile support

Goal:

```text
Run the same eval dataset against different model profiles.
```

Scope:

```text
- eval-api accepts ragProfileId for eval runs.
- eval-api passes profile id to rag-api query calls.
- Results persist profile metadata.
```

Acceptance criteria:

```text
- Same dataset can run against local-balanced and cloud-baseline.
- Results are comparable by profile.
- Dashboard can show which model profile produced each result.
```

## Stage L7: Optional reranker provider

Goal:

```text
Support reranking without forcing it into MVP retrieval.
```

Scope:

```text
- Add RerankerProvider contract implementation.
- Add NoopRerankerProvider default.
- Add rerank score to retrieved chunk trace records.
- Add local-quality profile after core retrieval works.
```

Acceptance criteria:

```text
- Reranking can be enabled per model profile or RAG config.
- Original retrieval score is preserved.
- Rerank score is stored separately.
- Comparison can show vector vs reranked retrieval changes.
```

## Stage L8: Dashboard runtime visibility

Goal:

```text
Make local model runs inspectable.
```

Scope:

```text
- Show model profile on query trace detail.
- Show provider/model/embedding config on eval run detail.
- Add comparison filters by profile.
```

Acceptance criteria:

```text
- User can tell which model generated an answer.
- User can tell which embedding model retrieved chunks.
- User can compare local vs cloud runs clearly.
```

## Recommended MVP sequence

Do this first:

```text
1. Provider interfaces
2. OllamaEmbeddingProvider
3. Embedding index config
4. OllamaChatProvider
5. local-balanced model profile
```

Defer this until the core trace/eval loop works:

```text
- rerankers
- multiple local embedding families
- local-quality profile
- dashboard comparison polish
- local judge model
```

## Non-goals for the first local model pass

```text
- No GPU orchestration.
- No model download manager.
- No automatic Ollama installation.
- No PDF/OCR dependency on local models.
- No production guarantee for local model latency.
- No forced local-only architecture.
- No broad rewrite of existing RAG phases.
```

## Example environment configuration

```env
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
LLM_MODEL=qwen3:8b
EMBEDDING_PROVIDER=ollama
EMBEDDING_MODEL=nomic-embed-text
MODEL_PROFILE=local-balanced
```

## Example manual setup

```bash
ollama pull qwen3:8b
ollama pull nomic-embed-text
```

Then start RAGLens normally and select the `local-balanced` profile.

## Documentation updates still required

After implementation starts, update:

```text
docs/technical-design-decisions.md
docs/api-planning.md
docs/data-design.md
docs/evaluation-methodology.md
docs/roadmap.md
README.md
```

Recommended additions:

```text
- ADR: provider-neutral model runtime
- API contract: GET /api/v1/model-profiles
- Data model: embedding index config and trace profile metadata
- Eval method: local vs cloud comparison runs
- README: local Ollama setup
```

## Success criteria

Local LLM support is successful when:

```text
- RAGLens can ingest docs using a local embedding provider.
- RAGLens can answer questions using a local chat model.
- Query traces show provider, model, embedding config, and selected profile.
- Eval runs can compare local and cloud profiles.
- Provider failures are structured and visible.
- Tests do not require running real local models.
```
