# Automation Event

Timestamp: 2026-05-25T07:40:00+10:00

Selected action: Implement Phase 9 deterministic score attachment to eval case results.

Active stage: Phase 9 - Deterministic scoring.

Acceptance criteria advanced:
- Eval case results include deterministic retrievalScores.
- Eval case results include deterministic citationScores.
- Eval case results expose calculated verdict and failureType.
- Deterministic scoring runs without an LLM judge when case results are created.
- Eval schema migration adds score, verdict, and failure-type persistence fields.

Files touched:
- apps/eval-api/app/eval_runs.py
- apps/eval-api/tests/test_eval_runs.py
- infra/migrations/012_eval_case_result_scores.sql
- plans/events/2026-05-25-0740-phase-9-score-results.md

PR/branch: phase-9-score-results.

Commit/head SHA: d733a29cb87f890ef6e60a74b575c6a00e0d9095 before this event.

Tests/checks: local checks not run from connector environment.

CI status: PR not opened yet.

Merge status: not merged.

Blockers: none.

Next action: open PR and wait for CI.
