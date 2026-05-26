# Worker claim

Timestamp: 2026-05-27T00:00:00+10:00
Worker-id: chatgpt-worker-a
Selected action: fix CI blocker on owned PR.
Active stage: Phase 13 - CI quality gate.
Acceptance criterion: eval dataset is seeded and eval run executes repeatably in CI.
Intended branch: agent/chatgpt-worker-a/ci-smoke-unique-dataset
PR number: #58
Files/directories likely to be touched:
- apps/eval-api/app/ci_smoke_runner.py
- apps/eval-api/tests/test_ci_smoke_runner.py
- plans/events/2026-05-27-chatgpt-worker-a-pr58-ci-fix-claim.md
- plans/events/2026-05-27-chatgpt-worker-a-pr58-ci-fix-complete.md
- plans/workers/chatgpt-worker-a.md

Reason:
- CI run #238 failed in the deterministic CI smoke gate step.
- The generated `ci-smoke-v1-<uuid>` version is 44 characters, exceeding the dataset version API max length of 40 characters.
- This patch will shorten the unique suffix while preserving repeatability safety.

Collision check before claim:
- PR #58 is owned by chatgpt-worker-a.
- No other open PRs were found.
