# Claim: provider retry policy hardening

Timestamp: 2026-05-27T00:45:00+10:00
Worker-id: chatgpt-worker-a

Selected action: implement next meaningful Phase 14 vertical slice.

Active stage: Phase 14 - Production hardening.

Acceptance criterion:
- provider retry policy
- eval run reports provider errors clearly

Intended branch: agent/chatgpt-worker-a/retry-policy

PR number: pending

Files/directories likely to be touched:
- apps/eval-api/app/rag_client.py
- apps/eval-api/app/eval_runner.py
- apps/eval-api/tests/test_eval_runner_provider_retry.py
- plans/events/2026-05-27-chatgpt-worker-a-retry-policy-claim.md
- plans/events/2026-05-27-chatgpt-worker-a-retry-policy-complete.md
- plans/workers/chatgpt-worker-a.md
- plans/coordination.md

Timestamp: 2026-05-27T00:45:00+10:00

Collision notes:
- PR #60 provider timeout work is already merged.
- PR #61 eval API request ID middleware work is already merged.
- No open PRs were visible before this claim.
