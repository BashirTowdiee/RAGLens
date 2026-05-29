---
title: "Local Runtime Roadmap Placement"
description: "Clarifies where local LLM, embedding, reranker, and model profile work sits in the current RAGLens roadmap."
order: 15
section: "Delivery"
status: "draft"
---

# Local Runtime Roadmap Placement

## Current project position

RAGLens is currently in the foundation and corpus inspection part of the roadmap.

Implemented or bootstrapped scope:

```text
Phase 1: Monorepo and local infrastructure
Phase 2: Sample corpus and seed data
Phase 3: RAG API document ingestion
Phase 4-13: Retrieval/query traces, eval runs/scoring/comparison, and CI quality gate
Phase 14: Reliability hardening (request IDs, retries/timeouts, partial failure persistence)
```

The project already has:

```text
- rag-api health endpoint
- eval-api health endpoint
- dashboard shell and document inspection screens
- Markdown document ingestion
- chunk inspection endpoints
- PostgreSQL + pgvector via Docker Compose
- rag.documents and rag.document_chunks storage
- seed corpus and golden eval fixture
- docs and docs-site
- CI checks for Node, Python, docs, Docker Compose config, and Docker Compose image builds
```

The next critical path remains:

```text
chunks
  -> embeddings
  -> retrieval
  -> answer generation
  -> structured citations
  -> query traces
  -> eval runner
  -> deterministic scoring
  -> dashboard failure inspection
```

Local model support should strengthen this path. It should not distract from it.

---

## Why this needs explicit roadmap placement

The original roadmap placed most provider expansion under Phase 16.

That is correct for broad provider comparison, but it is too late for the underlying abstractions.

Local LLM support requires early architectural seams:

```text
- provider-neutral embedding interface
- provider-neutral chat interface
- model profile identity
- embedding index compatibility
- trace metadata for provider/model/profile
- eval run metadata for selected runtime profile
```

These seams need to be introduced during Phase 4 and Phase 5 so the project does not hardcode one provider and then require a rewrite later.

---

## Correct placement by roadmap phase

## Phase 4: Embeddings and vector retrieval

Local runtime work in this phase:

```text
- define EmbeddingProvider interface
- add provider-neutral embedding service boundary
- add embedding index config
- track embedding provider, model, dimensions, and distance metric
- add OpenAI embedding provider if using cloud baseline
- add Ollama embedding provider for local-balanced profile
```

Do not build in this phase:

```text
- reranking
- hybrid retrieval
- local model comparison dashboard
- multiple vector indexes in the UI
```

Exit criteria addition:

```text
Chunks can be embedded by a configured provider, and the embedding index records enough metadata to prevent incompatible vector dimensions being mixed.
```

---

## Phase 5: RAG query and cited answer generation

Local runtime work in this phase:

```text
- define ChatModelProvider interface
- add provider-neutral answer generation service boundary
- add OllamaChatProvider
- keep OpenAIChatProvider as cloud-baseline option if implemented
- select model profile per query or default to configured profile
- return answer, citations, traceId, usage, and latency consistently across providers
```

Do not build in this phase:

```text
- streaming responses
- provider marketplace UI
- model download manager
- prompt playground
```

Exit criteria addition:

```text
The same /query flow can run through local-balanced or cloud-baseline without changing retrieval, citation, or trace code.
```

---

## Phase 6: Query trace persistence

Local runtime work in this phase:

```text
- persist modelProfileId on every trace
- persist chat provider and model
- persist embedding provider, model, dimensions, and index id
- persist provider latency, token usage when available, and estimated cost when available
- normalise provider errors
```

Trace metadata must answer these questions:

```text
Which model answered?
Which embedding model retrieved the chunks?
Which runtime profile was selected?
Which prompt version was used?
Which retrieval mode and topK were used?
Did provider failure occur, and where?
```

---

## Phase 8: Eval runner MVP

Local runtime work in this phase:

```text
- allow eval runs to specify ragConfigId or modelProfileId
- pass the selected profile to rag-api /query
- persist profile metadata on eval runs and case results
```

Exit criteria addition:

```text
The same dataset can be run against at least one local profile and one baseline profile, even if the first comparison is manually inspected.
```

---

## Phase 10: LLM-as-judge scoring

Local runtime work in this phase:

```text
- keep judge provider separate from answer provider
- support judgeEnabled per eval run
- allow a cloud judge over local answers
- allow a local judge only after deterministic metrics work
```

Rule:

```text
The model that generated the answer must not automatically be the model that judges the answer.
```

This avoids circular evaluation and makes local model testing more credible.

---

## Phase 12: Run comparison

Local runtime work in this phase:

```text
- compare local-balanced vs cloud-baseline
- compare local-fast vs local-balanced
- show quality, latency, and cost deltas
- classify improvements and regressions by selected profile
```

Comparison metadata should include:

```text
- model profile
- chat provider/model
- embedding provider/model
- reranker provider/model, if enabled
- retrieval mode
- prompt version
```

---

## Phase 15: Advanced retrieval

Local runtime work in this phase:

```text
- add optional RerankerProvider interface implementation
- add NoopRerankerProvider default
- add rerank scores to trace chunks
- add local-quality profile only after vector retrieval and traces are stable
```

Do not let reranking block MVP.

---

## Phase 16: Provider expansion

Local runtime work in this phase:

```text
- add broader provider matrix
- add Anthropic
- add OpenRouter
- expand Ollama model profiles
- add model pricing configuration
- improve provider-specific error mapping
- add dashboard comparison filters
```

By this phase, provider expansion should be incremental rather than a rewrite.

---

## Revised build order for local runtime support

Use this sequence:

```text
L1. Provider interfaces
L2. Embedding index config
L3. OllamaEmbeddingProvider
L4. ChatModelProvider interface
L5. OllamaChatProvider
L6. Model profiles endpoint/config
L7. Trace runtime metadata
L8. Eval run profile support
L9. Local vs cloud comparison
L10. Optional reranker provider
```

This maps onto the main roadmap as:

```text
Phase 4: L1, L2, L3
Phase 5: L4, L5, L6
Phase 6: L7
Phase 8: L8
Phase 12: L9
Phase 15: L10
Phase 16: broader provider expansion
```

---

## MVP policy

For MVP, support exactly one local profile:

```text
local-balanced
```

Recommended default:

```text
chat provider: ollama
chat model: qwen3:8b
embedding provider: ollama
embedding model: nomic-embed-text
reranker provider: none
retrieval mode: vector
```

Keep these as post-MVP:

```text
local-fast
local-quality
reranking
multiple local embedding families
local judge model
provider comparison dashboard polish
```

---

## Documentation ownership

The local runtime plan is split across these docs:

```text
docs/local-llm-runtime-plan.md
  Detailed implementation plan and staged checklist.

docs/local-runtime-roadmap-placement.md
  Roadmap placement and sequencing.

docs/provider-neutral-runtime-adr.md
  Architecture decision record.

docs/api-planning.md
  Should include model profile API contracts when implemented.

docs/data-design.md
  Should include embedding index and trace metadata when implemented.

docs/evaluation-methodology.md
  Should include local vs cloud comparison methodology when eval profiles exist.
```

Until the implementation lands, the standalone plan and ADR are the source of truth for this cross-cutting runtime work.
