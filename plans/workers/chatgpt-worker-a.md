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

## 2026-05-27T00:00:00+10:00

Selected action: Implement next meaningful Phase 12 vertical slice.

Active stage: Phase 12 - Run comparison.

Acceptance criteria advanced:
- Comparison creation endpoint exists.
- Comparison detail endpoint exists.
- Baseline and candidate cases are matched by testCaseId.
- Metric deltas are calculated for pass rate, retrieval, citation, judge, latency, and cost fields.
- Improved and regressed case groups are classified.
- Dataset mismatches are rejected.

Files touched:
- apps/eval-api/app/comparisons.py
- apps/eval-api/app/main.py
- apps/eval-api/tests/test_comparisons.py
- plans/events/2026-05-27-chatgpt-worker-a-comparison-claim.md
- plans/workers/chatgpt-worker-a.md

PR/branch:
- Branch: agent/chatgpt-worker-a/comparison-endpoint
- PR: pending creation

Commit/head SHA:
- d6ddcc22399c467ecd5440f4e9a58e2d7ab53752 before this planning update

Tests/checks run:
- Local checks not run because the execution environment cannot clone GitHub.
- Added focused FastAPI test coverage for comparison create/detail and validation paths.

CI status: pending PR creation.

Merge status: not merged.

Blockers: none.

Conflicting claims considered:
- No open PRs found before source changes.
- Existing agent/chatgpt-worker-a/failed-case-detail branch is already merged and owned by this worker.

Stale claims ignored: none.

Next recommended action:
- Open PR and wait for CI.

## 2026-05-27T00:00:00+10:00

Selected action: Fix CI blocker on PR #45.

Active stage: Phase 12 - Run comparison.

Acceptance criteria advanced:
- Preserved comparison endpoint functionality while fixing Ruff line-length failures.

Files touched:
- apps/eval-api/app/comparisons.py
- apps/eval-api/tests/test_comparisons.py
- plans/workers/chatgpt-worker-a.md

PR/branch:
- Branch: agent/chatgpt-worker-a/comparison-endpoint
- PR: #45

Commit/head SHA:
- 6851ac90169c6553e6d6e21097ef015362eb789c before this planning update

Tests/checks run:
- Inspected CI run #191 logs.
- Node workspaces and Docker Compose checks passed in CI.
- Eval API CI failed only on Ruff E501 line-length checks before tests ran.

CI status: pending new CI run after formatting fix.

Merge status: not merged.

Blockers:
- Waiting for new CI result.

Conflicting claims considered:
- PR #45 is owned by chatgpt-worker-a.
- No other open PRs found before the fix.

Stale claims ignored: none.

Next recommended action:
- Re-check PR #45 CI and merge if green.

## 2026-05-27T00:00:00+10:00

Selected action: Implement next meaningful Phase 12 vertical slice.

Active stage: Phase 12 - Run comparison.

Acceptance criteria advanced:
- Dashboard can create a comparison from two eval runs.
- Dashboard redirects to comparison detail after creation.
- Comparison detail displays baseline and candidate runs.
- Comparison detail displays metric deltas and before/after values.
- Comparison detail groups improved, regressed, unchanged, missing-baseline, and missing-candidate cases.
- Case groups link to baseline and candidate case detail pages where result IDs exist.

Files touched:
- apps/dashboard/app/lib/evalApi.ts
- apps/dashboard/app/eval-runs/page.tsx
- apps/dashboard/app/comparisons/[comparisonId]/page.tsx
- apps/dashboard/app/globals.css
- plans/events/2026-05-27-chatgpt-worker-a-comparison-dashboard-claim.md
- plans/workers/chatgpt-worker-a.md

PR/branch:
- Branch: agent/chatgpt-worker-a/comparison-dashboard
- PR: pending creation

Commit/head SHA:
- 1c619fcaa8430bbb82bc6ef33a4f369f87bffb1c before this planning update

Tests/checks run:
- Local checks not run because the execution environment cannot clone GitHub.
- Existing comparison API from PR #45 was inspected and used as the dashboard contract.

CI status: pending PR creation.

Merge status: not merged.

Blockers: none.

Conflicting claims considered:
- No open PRs found before source changes.
- Existing agent/chatgpt-worker-a/comparison-endpoint and failed-case-detail branches are already merged and owned by this worker.

Stale claims ignored: none.

Next recommended action:
- Open PR and wait for CI.

## 2026-05-27T00:00:00+10:00

Selected action: Implement next meaningful Phase 13 vertical slice.

Active stage: Phase 13 - CI quality gate.

Acceptance criteria advanced:
- Deterministic CI evaluation endpoint exists at POST /api/v1/ci/evaluate.
- Endpoint evaluates an existing eval run against supplied quality thresholds.
- Gate response includes pass/fail status, metric values, per-threshold results, and Markdown summary text.
- Missing eval runs return a structured 404.
- Focused FastAPI tests cover passing, failing, and missing-run paths.

Files touched:
- apps/eval-api/app/ci_gate.py
- apps/eval-api/app/main.py
- apps/eval-api/tests/test_ci_gate.py
- plans/events/2026-05-27-chatgpt-worker-a-ci-gate-claim.md
- plans/workers/chatgpt-worker-a.md

PR/branch:
- Branch: agent/chatgpt-worker-a/ci-gate-endpoint
- PR: pending creation

Commit/head SHA:
- c8622c1deba824e960dcc2f2b5d66c97fc30bf3d before this planning update

Tests/checks run:
- Local checks not run because the connector environment cannot clone GitHub.
- Added focused FastAPI coverage for CI gate success and failure paths.

CI status: pending PR creation.

Merge status: not merged.

Blockers: none.

Conflicting claims considered:
- No open PRs found before source changes.
- Existing agent branches are previous merged chatgpt-worker-a branches plus this owned branch.

Stale claims ignored: none.

Next recommended action:
- Open PR and wait for CI.
