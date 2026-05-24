# Automation Event

Timestamp: 2026-05-25T04:15:00+10:00

Selected action: Implement Phase 6 query trace chunk and citation inspection endpoints.

Active stage: Phase 6 - Query trace persistence and review.

Acceptance criteria advanced:
- Added query trace chunk records derived from persisted trace citations.
- Added query trace citation records with stable citation indexes.
- Added GET /api/v1/queries/:traceId/chunks.
- Added GET /api/v1/queries/:traceId/citations.
- Tests cover trace chunks, trace citations, rank ordering, citation indexes, and missing-trace handling.

Files touched:
- apps/rag-api/src/query/queryTraceRepository.ts
- apps/rag-api/src/query/postgresQueryTraceRepository.ts
- apps/rag-api/src/query/routes.ts
- apps/rag-api/src/query/routes.test.ts
- plans/events/2026-05-25-0415-phase-6-trace-chunk-citation-endpoints.md

PR/branch: phase-6-trace-chunk-citation-endpoints.

Tests/checks: local checks not run from connector environment.

CI status: PR not opened yet.

Merge status: not merged.

Blockers: none.

Next action: open PR and wait for CI.
