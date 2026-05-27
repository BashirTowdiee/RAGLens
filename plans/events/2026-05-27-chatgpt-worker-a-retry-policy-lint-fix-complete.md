# Complete: retry policy lint fix

Timestamp: 2026-05-27T04:00:00+10:00
Worker-id: chatgpt-worker-a
Selected action: fix failing CI blocker on existing roadmap PR
Active stage: Phase 14 - Production hardening
Acceptance criterion: Eval provider retry policy keeps typed retry responses and passes eval-api lint/tests.
PR/branch:
- PR: #62
- Branch: agent/chatgpt-worker-a/retry-policy

Files touched:
- apps/eval-api/tests/test_eval_runner_provider_timeout.py
- plans/events/2026-05-27-chatgpt-worker-a-retry-policy-lint-fix-claim.md
- plans/events/2026-05-27-chatgpt-worker-a-retry-policy-lint-fix-complete.md

Commit/head SHA:
- Source fix commit: daa32ff1a394cc71dcc392570112b9a479cc45bd

Tests/checks run:
- Inspected CI run #265: Eval API failed at lint step.
- Local checks not run because this connector environment cannot clone or execute the repository test suite.
- CI run #267 is in progress for head SHA daa32ff1a394cc71dcc392570112b9a479cc45bd.

CI status: in progress.
Merge status: not merged.
Blockers: waiting for CI.
Conflicting claims considered:
- PR #62 is owned by chatgpt-worker-a.
- Fresh claim was written before source changes and PR state was re-checked.
Stale claims ignored: none.
Next recommended action:
- Re-check PR #62 CI. If green and repo policy allows, merge. If failing, fix only the reported blocker.
