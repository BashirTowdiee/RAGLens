# Automation Event

Timestamp: 2026-05-24T23:50:00+10:00

Selected action: Fix local Docker Compose build blocker.

Active stage: Stage 2 - Corpus, ingestion, and metadata baseline.

Acceptance criteria advanced:
- Local Docker Compose build path is restored for rag-api.
- CI now builds Compose images instead of only validating Compose config.

Files touched:
- apps/rag-api/Dockerfile
- .github/workflows/ci.yml
- plans/events/2026-05-24-2350-fix-rag-api-docker-build.md

PR/branch: fix-rag-api-docker-build.

Tests/checks run:
- Local checks not run from connector environment.
- Fix is based on user-provided Docker output: `tsc: not found` during rag-api image build.

CI status: PR not opened yet.

Merge status: not merged.

Blockers: none.

Next action: open PR and wait for CI.
