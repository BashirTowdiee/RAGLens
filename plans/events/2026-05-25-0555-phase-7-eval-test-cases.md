# Automation Event

Timestamp: 2026-05-25T05:55:00+10:00

Selected action: Implement Phase 7 eval dataset test case CRUD slice.

Active stage: Phase 7 - Eval API datasets and test cases.

Acceptance criteria advanced:
- Dataset test cases can be created through eval-api.
- Dataset test cases can be listed under a dataset through eval-api.
- Dataset test cases can be fetched by id through eval-api.
- Test cases capture question, expected answer, and reference citation fields.
- Missing datasets and missing test cases return structured not found responses.
- Eval schema migration adds eval.test_cases with dataset foreign key and reference citation fields.

Files touched:
- apps/eval-api/app/datasets.py
- apps/eval-api/tests/test_datasets.py
- infra/migrations/009_eval_test_cases.sql
- plans/events/2026-05-25-0555-phase-7-eval-test-cases.md

PR/branch: phase-7-eval-test-cases.

Tests/checks: local checks not run from connector environment.

CI status: PR not opened yet.

Merge status: not merged.

Blockers: none.

Next action: open PR and wait for CI.
