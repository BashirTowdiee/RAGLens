# Roadmap Coordination

This file tracks the active roadmap position for automation cycles.

## Active stage

Stage 2 - Corpus, ingestion, and metadata baseline.

## Source roadmap documents

- `docs/roadmap.md`
- `docs/research-informed-implementation-roadmap.md`

## Completed stages

- Stage 1 - Local platform foundation: PR #1 merged.
- Stage 2 seed corpus and eval fixture: PR #2 merged.

## Current active PR

- PR pending: Stage 2 Markdown ingestion and document chunk endpoints
- Branch: `stage-2-ingestion`

## Stage 2 acceptance criteria advanced by current slice

- `rag.documents` and `rag.document_chunks` migrations exist.
- Markdown documents can be ingested through `rag-api`.
- Markdown is chunked with stable chunk order and heading paths.
- Document list, document detail, and chunk list endpoints exist.
- Tests cover chunking, ingestion, empty content rejection, and missing document handling.

## Next remaining Stage 2 work after ingestion slice

- Add database-backed document repository implementation.
- Add seed ingestion command or endpoint for `infra/seed/documents`.
- Add dashboard document list/detail screens.
