# Automation event

Timestamp: 2026-05-26T02:25:00+10:00

Selected action: implement Phase 10 runner judge input propagation

Active stage: Phase 10 - LLM-as-judge scoring

Acceptance criteria advanced:
- RAG query results can carry retrieved sources, context, and citations.
- Eval runner passes dataset question, expected answer, and reference citations into case result creation.
- Eval runner passes RAG evidence fields into case result creation.
- Judge scoring can run from executed dataset test cases instead of only manual case-result posts.
- Added runner-level test coverage for judge input propagation.

Files touched:
- apps/eval-api/app/rag_client.py
- apps/eval-api/app/eval_runner.py
- apps/eval-api/tests/test_eval_runner_judge_inputs.py
- plans/events/2026-05-26-0225-phase-10-runner-inputs.md

PR/branch: phase-10-runner-inputs

Commit/head SHA: 82de2328bf5e39f67cf26b90dad980e72e0e89d9

Tests/checks: local checks not run from connector environment

CI status: PR not opened yet

Merge status: not merged

Blockers: none

Next action: open PR and wait for CI
