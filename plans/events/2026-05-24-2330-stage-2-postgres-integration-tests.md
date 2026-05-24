# Automation Event

Timestamp: 2026-05-24T23:30:00+10:00

Selected action: Implement Stage 2 Postgres repository integration test path.

Active stage: Stage 2 - Corpus, ingestion, and metadata baseline.

Acceptance criteria advanced:
- CI starts a Postgres + pgvector service for rag-api tests.
- Postgres document repository is tested against real tables.
- Integration tests cover insert, list, chunk ordering, and re-ingestion replacement.
- Local tests can skip Postgres integration unless `TEST_DATABASE_URL` is set.

Files touched:
- .github/workflows/ci.yml
- apps/rag-api/src/test/applyMigrations.ts
- apps/rag-api/src/documents/postgresDocumentRepository.integration.test.ts
- plans/roadmap.md
- plans/events/2026-05-24-2330-stage-2-postgres-integration-tests.md

PR/branch: stage-2-postgres-integration-tests.

Tests/checks: local checks not run from connector environment.

CI status: PR not opened yet.

Merge status: not merged.

Blockers: none.

Next action: open PR and wait for CI.
