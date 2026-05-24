# Roadmap Coordination

This file tracks the active roadmap position for automation cycles.

## Active stage

Phase 4 - Embeddings and vector retrieval.

## Source roadmap documents

- `docs/roadmap.md`
- `docs/research-informed-implementation-roadmap.md`

## Completed stages

- Phase 1 - Local platform foundation: PR #1 merged.
- Phase 2 - Sample corpus and seed data: PR #2 merged.
- Phase 3 - RAG API document ingestion: PRs #3, #4, #5, #7, and #8 merged.
- Local Docker Compose build blocker: PR #6 merged.

## Current active PR

- PR pending: roadmap re-anchor after ingestion-stage completion
- Branch: `reanchor-stage-4`

## Completed ingestion-stage acceptance criteria

- Controlled seed corpus and golden eval fixture exist.
- `rag.documents` and `rag.document_chunks` migrations exist.
- Markdown documents can be ingested through `rag-api`.
- Markdown is chunked with stable chunk order and heading paths.
- Document list, document detail, and chunk list endpoints exist.
- Postgres-backed document repository exists and is covered by integration tests.
- Dashboard exposes document list/detail screens with generated chunk previews.
- Seed ingestion workflow is documented.

## Next stage acceptance criteria

Begin Phase 4 with a narrow embeddings and vector retrieval slice:

- Add embedding provider interface with deterministic local/test implementation.
- Store embedding vectors for document chunks in Postgres with pgvector.
- Add a retrieval endpoint that returns ranked chunks for a query.
- Add tests for deterministic retrieval, empty query rejection, and stable source metadata.

## Explicit non-goals for the next slice

- Do not add answer generation yet.
- Do not add PDF parsing, OCR, or async ingestion.
- Do not add evaluation scoring yet.
- Do not add dashboard retrieval visualisation until the API retrieval path exists.
