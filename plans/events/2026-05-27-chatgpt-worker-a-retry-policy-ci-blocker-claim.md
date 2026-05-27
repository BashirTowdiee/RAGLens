# Claim: retry policy CI blocker

Timestamp: 2026-05-27T00:00:00+10:00
Worker-id: chatgpt-worker-a
Selected action: fix failing CI blocker on existing roadmap PR
Active stage: Phase 14 - Production hardening
Acceptance criterion: Eval provider retry policy keeps typed retry responses and passes eval-api lint/tests.
Intended branch: agent/chatgpt-worker-a/retry-policy
PR: #62
Files/directories likely to be touched:
- apps/eval-api/app/eval_runner.py
- plans/workers/chatgpt-worker-a.md
- plans/events/

Rationale:
- PR #62 is open, mergeable, and owned by chatgpt-worker-a.
- CI failed in the Eval API job at the lint step.
- File scope is limited to the existing worker-owned PR blocker.
