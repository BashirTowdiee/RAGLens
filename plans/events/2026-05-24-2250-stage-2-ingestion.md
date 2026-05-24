# Automation Event

Timestamp: 2026-05-24T22:50:00+10:00

Selected action: Implement next meaningful Stage 2 vertical slice.

Active stage: Stage 2 - Corpus, ingestion, and metadata baseline.

Acceptance criteria advanced:
- `rag.documents` and `rag.document_chunks` migrations exist.
- Markdown documents can be ingested through `rag-api`.
- Markdown is chunked with stable chunk order and heading paths.
- Document list, document detail, and chunk list endpoints exist.
- Tests cover chunking, ingestion, empty content rejection, and missing document handling.

Files touched:
- infra/migrations/002_documents.sql
- apps/rag-api/src/app.ts
- apps/rag-api/src/documents/**
- plans/roadmap.md
- plans/events/2026-05-24-2250-stage-2-ingestion.md

PR/branch: stage-2-ingestion.

Commit/head SHA: 62ff53cfdb26eb557db240f7373bbbe94a0d654b at time of event creation.

Tests/checks run:
- Added Vitest coverage for Markdown chunking and document routes.
- Local checks not run from connector environment.

CI status: PR not opened yet at event creation.

Merge status: not merged.

Blockers: none.

Next recommended action: open PR and wait for CI.
