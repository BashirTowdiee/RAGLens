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

## Current active PR

- PR pending: Stage 2 database-backed document ingestion and seed command
- Branch: `stage-2-db-seed`

## Stage 2 acceptance criteria advanced by current slice

- Database-backed document repository implementation exists.
- `rag-api` can use either Postgres or in-memory document storage through configuration.
- Seed documents can be loaded from `infra/seed/documents` and ingested through the repository contract.
- Tests cover seed document loading without requiring a live database.

## Next remaining Stage 2 work after database ingestion slice

- Add integration test path for Postgres-backed repository when CI database service is available.
- Add dashboard document list/detail screens.
- Add seed ingestion documentation to README or developer docs.
