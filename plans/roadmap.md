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
- Stage 2 Markdown ingestion and document chunk endpoints: PR #3 merged.
- Stage 2 database-backed document ingestion and seed command: PR #4 merged.

## Current active PR

- PR pending: Stage 2 Postgres repository integration test path
- Branch: `stage-2-postgres-integration-tests`

## Stage 2 acceptance criteria advanced by current slice

- CI starts a Postgres + pgvector service for rag-api tests.
- Postgres-backed document repository is tested against real `rag.documents` and `rag.document_chunks` tables.
- Integration tests verify insert, list, chunk ordering, and re-ingestion replacement behaviour.
- Local test execution can skip Postgres integration tests unless `TEST_DATABASE_URL` is set.

## Next remaining Stage 2 work after integration test slice

- Add dashboard document list/detail screens.
- Add seed ingestion documentation to README or developer docs.
