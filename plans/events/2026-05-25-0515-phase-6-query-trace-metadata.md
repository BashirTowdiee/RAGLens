# Automation Event

Timestamp: 2026-05-25T05:15:00+10:00

Selected action: Implement Phase 6 query trace prompt/config metadata.

Active stage: Phase 6 - Query trace persistence and review.

Acceptance criteria advanced:
- Query traces now store prompt version metadata.
- Query traces now store query config metadata.
- Successful query traces persist promptVersion and config.
- Failed provider query traces persist promptVersion and config.
- Postgres persistence supports prompt_version and config fields.
- Tests cover prompt/config metadata on successful and failed traces.

Files touched:
- apps/rag-api/src/query/queryTraceRepository.ts
- apps/rag-api/src/query/postgresQueryTraceRepository.ts
- apps/rag-api/src/query/queryService.ts
- apps/rag-api/src/query/routes.test.ts
- apps/rag-api/src/query/providerErrors.test.ts
- infra/migrations/007_query_trace_prompt_config.sql
- plans/events/2026-05-25-0515-phase-6-query-trace-metadata.md

PR/branch: phase-6-query-trace-metadata.

Tests/checks: local checks not run from connector environment.

CI status: PR not opened yet.

Merge status: not merged.

Blockers: none.

Next action: open PR and wait for CI.
