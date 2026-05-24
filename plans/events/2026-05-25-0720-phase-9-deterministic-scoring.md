# Automation Event

Timestamp: 2026-05-25T07:20:00+10:00

Selected action: Implement Phase 9 deterministic scoring slice.

Active stage: Phase 9 - Deterministic scoring.

Acceptance criteria advanced:
- Deterministic retrieval scoring calculates hit@5, hit@10, recall@10, retrieved expected sources, and missing expected sources.
- Deterministic citation scoring calculates citation presence, citation count, citation validity, and invalid citations.
- Deterministic verdict calculation returns pass, fail, or error with failure type classification.
- Scoring can run without an LLM judge.
- Eval-api exposes a deterministic scoring endpoint for validating scoring inputs.

Files touched:
- apps/eval-api/app/scoring.py
- apps/eval-api/app/scoring_router.py
- apps/eval-api/app/main.py
- apps/eval-api/tests/test_scoring.py
- plans/events/2026-05-25-0720-phase-9-deterministic-scoring.md

PR/branch: phase-9-deterministic-scoring.

Tests/checks: local checks not run from connector environment.

CI status: PR not opened yet.

Merge status: not merged.

Blockers: none.

Next action: open PR and wait for CI.
