# Merged: retry policy

Timestamp: 2026-05-27T04:00:00+10:00
Worker-id: chatgpt-worker-a
Selected action: merge ready roadmap PR
Active stage: Phase 14 - Production hardening
Acceptance criteria advanced:
- Retryable provider errors are represented in the eval API RAG client.
- Eval runner retries retryable provider failures according to a bounded retry policy.
- Timeout failures preserve stable provider timeout reporting.
- Focused retry behaviour tests cover success after retry, exhausted retry, and non-retryable provider errors.

Files touched by merged PR:
- apps/eval-api/app/eval_runner.py
- apps/eval-api/app/rag_client.py
- apps/eval-api/tests/test_eval_runner_provider_timeout.py
- plans/events/2026-05-27-chatgpt-worker-a-retry-policy-ci-blocker-claim.md
- plans/events/2026-05-27-chatgpt-worker-a-retry-policy-claim.md
- plans/events/2026-05-27-chatgpt-worker-a-retry-policy-lint-fix-claim.md
- plans/events/2026-05-27-chatgpt-worker-a-retry-policy-lint-fix-complete.md
- plans/events/2026-05-27-chatgpt-worker-a-retry-policy-waiting.md

PR/branch:
- PR: #62
- Branch: agent/chatgpt-worker-a/retry-policy

Commit/head SHA:
- Head SHA: 41c4bec75e37b8891415ff9fc3ce3690156a847d
- Merge SHA: b2033ceaffe385e309047942acd45badbc7a1920

Tests/checks run:
- CI run #268 passed for head SHA 41c4bec75e37b8891415ff9fc3ce3690156a847d.
- Local checks not run because this connector environment cannot clone or execute the repository test suite.

CI status: success.
Merge status: merged.
Blockers: none.
Conflicting claims considered:
- PR #62 was owned by chatgpt-worker-a.
- PR comments were empty.
- Changed files were limited to the worker-owned retry-policy branch scope plus append-only coordination events.
Stale claims ignored: none.
Next recommended action:
- Re-check repository planning state and choose the next non-overlapping Phase 14 production hardening slice, unless a newer roadmap PR is open and ready to merge.

Planning update note:
- Used an append-only event file on main instead of rewriting `plans/workers/chatgpt-worker-a.md` or `plans/coordination.md` through the connector, to respect the planning-file no full-replacement rule.
