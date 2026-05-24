# Automation Event

Timestamp: 2026-05-25T04:55:00+10:00

Selected action: Implement Phase 6 provider call telemetry for query traces.

Active stage: Phase 6 - Query trace persistence and review.

Acceptance criteria advanced:
- Query traces now include provider call telemetry.
- Successful query traces store provider, model, status, latency, token placeholders, cost placeholder, and null error code.
- Failed query traces store provider, model, status, latency, token placeholders, cost placeholder, and provider error code.
- Postgres persistence supports provider call telemetry through a jsonb column.
- Tests cover provider call telemetry on successful and failed traces.

Files touched:
- apps/rag-api/src/query/queryTraceRepository.ts
- apps/rag-api/src/query/postgresQueryTraceRepository.ts
- apps/rag-api/src/query/queryService.ts
- apps/rag-api/src/query/routes.test.ts
- apps/rag-api/src/query/providerErrors.test.ts
- infra/migrations/006_query_trace_provider_call.sql
- plans/events/2026-05-25-0455-phase-6-provider-call-telemetry.md

PR/branch: phase-6-provider-call-telemetry.

Tests/checks: local checks not run from connector environment.

CI status: PR not opened yet.

Merge status: not merged.

Blockers: none.

Next action: open PR and wait for CI.
