# Automation Event

Timestamp: 2026-05-25T06:15:00+10:00

Selected action: Implement Phase 8 eval run record endpoints.

Active stage: Phase 8 - Eval runner MVP.

Acceptance criteria advanced:
- Eval run can be created as a queued record.
- Eval runs can be listed through eval-api.
- Eval run detail can be fetched by id through eval-api.
- Missing eval run requests return structured not found responses.
- Eval schema migration adds eval.eval_runs with run status and summary count fields.

Files touched:
- apps/eval-api/app/eval_runs.py
- apps/eval-api/app/main.py
- apps/eval-api/tests/test_eval_runs.py
- infra/migrations/010_eval_runs.sql
- plans/events/2026-05-25-0615-phase-8-eval-run-records.md

PR/branch: phase-8-eval-run-records.

Tests/checks: local checks not run from connector environment.

CI status: PR not opened yet.

Merge status: not merged.

Blockers: none.

Next action: open PR and wait for CI.
