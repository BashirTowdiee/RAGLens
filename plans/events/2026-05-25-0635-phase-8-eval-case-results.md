# Automation Event

Timestamp: 2026-05-25T06:35:00+10:00

Selected action: Implement Phase 8 eval case result endpoints.

Active stage: Phase 8 - Eval runner MVP.

Acceptance criteria advanced:
- Eval case result records can be created under an eval run.
- Eval case results can be listed for an eval run.
- Eval case result detail can be fetched by id.
- Eval case results store traceId, answer, latency, cost, and error details.
- Eval run summary updates after completed and failed case results are recorded.
- Missing eval runs and missing case results return structured not found responses.
- Eval schema migration adds eval.eval_case_results.

Files touched:
- apps/eval-api/app/eval_runs.py
- apps/eval-api/tests/test_eval_runs.py
- infra/migrations/011_eval_case_results.sql
- plans/events/2026-05-25-0635-phase-8-eval-case-results.md

PR/branch: phase-8-eval-case-results.

Tests/checks: local checks not run from connector environment.

CI status: PR not opened yet.

Merge status: not merged.

Blockers: none.

Next action: open PR and wait for CI.
