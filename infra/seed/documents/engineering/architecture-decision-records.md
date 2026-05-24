# Architecture Decision Records

## ADR-001: Service boundaries

RAGLens Corp separates user-facing query execution from evaluation workloads. Query execution runs in the RAG service. Evaluation runs in the evaluation service and calls the RAG service over HTTP.

## ADR-002: Primary database

PostgreSQL is the primary operational database. Vector search uses pgvector in the same database for the initial implementation to keep local development simple.

## ADR-003: Trace persistence

Every generated answer must create a query trace. A trace records the question, answer, retrieved chunks, citations, model, prompt version, latency, token usage, and provider errors when available.

## ADR-004: Evaluation strategy

Deterministic retrieval and citation metrics must run before any LLM-as-judge scoring. LLM judges may be added as a second layer for answer quality but must not replace deterministic checks.

## ADR-005: Dashboard scope

The dashboard prioritises debugging depth over visual polish. Query trace detail, eval run detail, failed case detail, and run comparison are the most important screens.
