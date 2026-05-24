# Automation Event

Timestamp: 2026-05-25T04:35:00+10:00

Selected action: Implement Phase 6 failed provider query trace persistence.

Active stage: Phase 6 - Query trace persistence and review.

Acceptance criteria advanced:
- Query traces now include status metadata.
- Query traces can persist failed provider call errors.
- Provider failure responses now include a traceId.
- Failed query traces store provider error code, message, provider, and retryable flag.
- Tests cover provider failure response and failed trace lookup.

Files touched:
- apps/rag-api/src/query/queryTraceRepository.ts
- apps/rag-api/src/query/postgresQueryTraceRepository.ts
- apps/rag-api/src/query/queryService.ts
- apps/rag-api/src/query/routes.ts
- apps/rag-api/src/query/providerErrors.test.ts
- infra/migrations/005_query_trace_failure_status.sql
- plans/events/2026-05-25-0435-phase-6-provider-failure-traces.md

PR/branch: phase-6-provider-failure-traces.

Tests/checks: local checks not run from connector environment.

CI status: PR not opened yet.

Merge status: not merged.

Blockers: none.

Next action: open PR and wait for CI.
