# Completion: eval run max cases

Timestamp: 2026-05-27T04:45:00+10:00
Worker-id: chatgpt-worker-a
Selected action: implement next meaningful Phase 14 vertical slice
Active stage: Phase 14 - Production hardening
Acceptance criteria advanced:
- Eval-run execution accepts an optional `maxCases` query parameter.
- Sequential eval execution is bounded to the first N test cases when `maxCases` is supplied.
- Invalid `maxCases` values are rejected before any case results are created.

Files touched:
- apps/eval-api/app/eval_runner.py
- apps/eval-api/tests/test_eval_runs.py
- plans/events/2026-05-27-chatgpt-worker-a-eval-run-max-cases-claim.md
- plans/events/2026-05-27-chatgpt-worker-a-eval-run-max-cases-complete.md

PR/branch:
- PR: #64
- Branch: agent/chatgpt-worker-a/eval-run-max-cases

Commit/head SHA:
- Head SHA before planning updates: 712d17ee9b6f69cfc2e54e66987cf7dcdebe197d

Tests/checks run:
- Local checks not run because this connector environment cannot clone or execute the repository test suite.
- CI run #277 is in progress.

CI status: in progress.
Merge status: not merged.
Blockers: waiting for CI.
Conflicting claims considered:
- No open PRs were present before claiming.
- Recent Phase 14 structured logs, retry policy, timeout, and request ID work was merged or non-overlapping.
- This branch is one commit behind main but PR #64 is mergeable and touched files do not overlap with the latest main structured logging changes.
Stale claims ignored: none.
Next recommended action:
- Re-check PR #64 CI status and merge if green and mergeable.
