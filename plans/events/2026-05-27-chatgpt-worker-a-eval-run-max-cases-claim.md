# Claim: eval run max cases

Timestamp: 2026-05-27T04:45:00+10:00
Worker-id: chatgpt-worker-a
Selected action: implement next meaningful Phase 14 vertical slice
Active stage: Phase 14 - Production hardening
Acceptance criterion:
- Add maxCases execution guard for eval runs so production-hardening runs can be bounded.
Intended branch: agent/chatgpt-worker-a/eval-run-max-cases
PR number: pending
Files/directories likely to be touched:
- apps/eval-api/app/eval_runner.py
- apps/eval-api/tests/test_eval_runs.py
- plans/events/2026-05-27-chatgpt-worker-a-eval-run-max-cases-claim.md
- plans/events/2026-05-27-chatgpt-worker-a-eval-run-max-cases-complete.md
- plans/workers/chatgpt-worker-a.md

Collision notes:
- No open PRs were present before claiming.
- Recent Phase 14 request ID, timeout, retry policy, and structured logging work appears merged.
- This slice avoids app/main.py, rag_client.py, scoring, CI gate, and dashboard files.
