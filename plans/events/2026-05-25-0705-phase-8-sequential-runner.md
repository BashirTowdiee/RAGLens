# Automation Event

Timestamp: 2026-05-25T07:05:00+10:00

Selected action: Implement Phase 8 sequential eval runner slice.

Active stage: Phase 8 - Eval runner MVP.

Acceptance criteria advanced:
- Eval-api exposes an execute endpoint for an eval run.
- Eval-api calls a mockable rag-api client for each dataset test case.
- Successful rag-api responses are stored as completed case results.
- Rag-api failures are stored as failed case results without aborting the run.
- Missing datasets return structured not found responses during execution.
- Existing eval-run result list/detail endpoints can inspect runner output.

Files touched:
- apps/eval-api/app/rag_client.py
- apps/eval-api/app/eval_runner.py
- apps/eval-api/app/main.py
- apps/eval-api/tests/test_eval_runs.py
- plans/events/2026-05-25-0705-phase-8-sequential-runner.md

PR/branch: phase-8-runner.

Tests/checks: local checks not run from connector environment.

CI status: PR not opened yet.

Merge status: not merged.

Blockers: none.

Next action: open PR and wait for CI.
