# Worker: chatgpt-worker-a

## 2026-05-27T00:00:00+10:00

Selected action: Implement next meaningful Phase 11 vertical slice.

Active stage: Phase 11 - Dashboard MVP.

Acceptance criteria advanced:
- User can open an eval case detail page from an eval run.
- Failed case detail explains expected versus generated answer.
- Failed case detail shows expected, retrieved expected, missing, and invalid source/citation data.

Files touched:
- apps/dashboard/app/eval-runs/[evalRunId]/page.tsx
- apps/dashboard/app/eval-runs/[evalRunId]/results/[caseResultId]/page.tsx
- apps/dashboard/app/globals.css
- apps/dashboard/app/lib/evalApi.ts
- plans/workers/chatgpt-worker-a.md

PR/branch:
- Branch: agent/chatgpt-worker-a/failed-case-detail
- PR: pending creation

Commit/head SHA:
- 27a8b568a19a169fb14ce5b6b6d7ebb70210cd31 before this planning update

Tests/checks run:
- Local checks not run because the execution environment cannot clone GitHub.
- Existing eval-api route was inspected and already supports case result detail fetching.

CI status: pending PR creation.

Merge status: not merged.

Blockers:
- plans/events claim file creation was blocked twice by connector safety checks.
- Branch is one commit behind main due package-lock.json on main, with no overlapping files.

Conflicting claims considered:
- No open PRs found before source changes.
- No active agent branches found except this worker branch after creation.

Stale claims ignored: none.

Next recommended action:
- Open PR and wait for CI.
