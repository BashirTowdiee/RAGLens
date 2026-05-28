# AGENTS.md

## Project overview

RAGLens is a RAG evaluation and observability platform with three core runtime surfaces:

- `apps/rag-api`: answers questions, manages ingestion/chunking/retrieval/traces.
- `apps/eval-api`: evaluates quality and runs deterministic + judge-based checks.
- `apps/dashboard`: explains traces, retrieval behaviour, and eval outcomes.

Keep this framing intact:

- `rag-api` answers questions.
- `eval-api` measures whether answers are good.
- `dashboard` explains what happened.

## Tech stack

- TypeScript + Fastify (`apps/rag-api`)
- Python 3.12 + FastAPI (`apps/eval-api`)
- Next.js + TypeScript (`apps/dashboard`)
- Astro docs site (`docs-site`)
- PostgreSQL + pgvector (`docker-compose.yml`, `infra/migrations`)
- npm workspaces at repo root

## Source of truth files

Read these before changing behaviour:

- Product and architecture intent: `docs/`
- Root commands and workspace wiring: `package.json`
- Service-level commands/deps: `apps/*/package.json`, `apps/eval-api/pyproject.toml`
- Runtime topology: `docker-compose.yml`
- Schema/data shape: `infra/migrations/*.sql`, `infra/seed/`
- CI quality gates: `.github/workflows/ci.yml`
- Agent map of modules and entry points: `CODEMAP.yml`

## First steps for agents

1. Read `README.md`, root `package.json`, and `CODEMAP.yml` first.
2. If `CODEMAP.yml` is missing or stale, create/update it before or alongside structural changes.
3. Use targeted inspection (`rg`, focused file reads), not full-repo scans.
4. Confirm commands from repo scripts before running anything not documented.

## Repository structure

- `apps/rag-api`: Fastify API, query and document pipelines, Vitest tests.
- `apps/eval-api`: FastAPI app, scoring/eval runners/CI gate logic, pytest tests.
- `apps/dashboard`: Next.js UI for documents, retrieval, and eval runs.
- `docs`: primary product and engineering documentation.
- `docs-site`: Astro renderer for `docs/`.
- `infra/migrations`: ordered SQL migrations for `rag.*` and `eval.*`.
- `infra/seed`: controlled seed corpus and datasets.
- `packages/shared`: shared package space (currently minimal; grow intentionally).

## Architecture rules

- `eval-api` must treat `rag-api` as a black-box HTTP service.
- Do not import `rag-api` internals into `eval-api`.
- Keep retrieval/generation logic in `rag-api`; keep scoring/judging logic in `eval-api`.
- Dashboard consumes APIs only; do not move backend business logic into UI code.
- Preserve schema separation (`rag.*` and `eval.*`).
- Keep `/api/v1` versioned routes and predictable error envelopes.
- Maintain traceability: query trace -> citations -> eval case results -> run comparisons.

## Naming conventions

- TypeScript files: use existing local conventions (`camelCase` modules, framework defaults for route files).
- Python modules/tests: `snake_case.py`.
- Tests: co-locate TS tests as `*.test.ts`; Python tests under `apps/eval-api/tests/test_*.py`.
- SQL migrations: zero-padded numeric prefix + concise snake_case name (`NNN_name.sql`).
- JSON API fields: `camelCase`.

## File size and complexity guidance

- Prefer small modules with single responsibility.
- Use ~300 lines as a soft ceiling per source file; split before ~500 unless justified.
- Keep endpoint handlers thin; move logic to domain services/modules.
- Avoid hidden coupling across apps; cross-service behaviour should be explicit via HTTP contracts.

## Public API and module boundary rules

- Treat `apps/*/src` (or `app/` in eval-api) internals as private unless exported through HTTP or documented interfaces.
- Do not expose provider SDK raw payloads directly through public APIs.
- Validate API boundaries (`zod` in TypeScript, Pydantic/FastAPI models in Python).
- Update docs in `docs/` when changing external behaviour, contracts, or architecture decisions.
- Reflect entry-point or boundary changes in `CODEMAP.yml`.

## Required CODEMAP.yml usage

- `CODEMAP.yml` is required for agent navigation and must stay aligned with reality.
- Update it when adding/removing/renaming modules, entry points, major commands, tests, or package/app roots.
- Include only useful, stable paths and commands; avoid noise.
- If work changes structure and `CODEMAP.yml` is untouched, the task is incomplete.

## Setup and command discovery

Primary root commands (from `package.json`):

- `npm run dev`
- `npm run build`
- `npm run typecheck`
- `npm run lint`
- `npm run test`
- `npm run docs:dev`
- `npm run docs:check`
- `npm run docs:build`

Service-specific commands:

- `npm --workspace apps/rag-api run dev|build|typecheck|lint|test|seed:documents`
- `cd apps/eval-api && python -m pytest`
- `cd apps/eval-api && python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8001`
- `npm --workspace apps/dashboard run dev|build|typecheck|lint`

If a command is unclear, inspect scripts/config first (`package.json`, `pyproject.toml`, CI workflow).

## Testing expectations

- Run the narrowest relevant tests during iteration.
- Before handoff, run all affected checks where feasible:
  - Type checks/lint/tests for touched services.
  - `npm run docs:check` for docs or docs-site changes.
- If you cannot run a required check, state what was skipped and why.
- Keep CI parity with `.github/workflows/ci.yml` expectations.

## Security and secrets

- Never commit secrets; use `.env` locally and keep `.env.example` authoritative.
- Do not hardcode credentials, tokens, or internal URLs in source.
- Treat logs and traces as potentially sensitive; avoid leaking full secrets in outputs.
- Use least-privilege defaults for new config.

## Dependency rules

- Prefer existing dependencies and built-in platform tools.
- Add dependencies only with a clear need and scoped impact.
- When adding deps, update lockfiles and relevant docs.
- Do not swap frameworks or introduce new infrastructure patterns without documented approval in `docs/`.

## Data and migration rules

- Schema changes must be additive-first and reviewable.
- Add new migrations under `infra/migrations/` with the next ordered prefix.
- Keep migration intent clear (one concern per migration where practical).
- Update seeds/docs/tests when schema changes affect behaviour.

## Git safety rules

- Keep changes scoped to the request.
- Avoid destructive git operations (`reset --hard`, force checkout) unless explicitly asked.
- Do not revert unrelated local changes.
- Separate refactors from behavioural changes when possible.

## Editing rules

- Read `CODEMAP.yml` before editing; update it when structure or ownership changes.
- Prefer minimal diffs over broad rewrites.
- Preserve established conventions per app/service.
- Do not commit generated artefacts unless explicitly requested (`docs-site/dist`, `.next`, `dist`).
- Keep docs (`docs/`) and implementation in sync; resolve contradictions in the same change.

## Discovery rules for token-efficient work

- Start with `CODEMAP.yml`, then confirm with targeted reads.
- Use `rg`/`rg --files` for focused discovery.
- Read entry points, contracts, and tests before deep implementation.
- Avoid scanning unrelated directories or generated output.

## Review rules

- Review for regressions first: behaviour, contracts, data migrations, and security.
- Verify module boundaries (especially rag-api vs eval-api separation).
- Confirm tests and CI-facing commands still align.
- Check `CODEMAP.yml` was updated when structure/entry points/commands changed.
- If no findings, state residual risk and any untested paths.

## Final response format

Final agent handoff should include:

1. What changed (concise, by file/path).
2. Commands run and outcomes.
3. `CODEMAP.yml` status:
   - updated, unchanged (with reason), or newly created.
4. Validation/test status, including anything skipped.
5. Gaps, assumptions, or follow-up actions.

## Non-goals

- Do not redesign architecture without matching documentation updates.
- Do not introduce unrelated refactors while handling scoped tasks.
- Do not duplicate source-of-truth content across `docs/` and `docs-site/`.
- Do not optimise for agent convenience over safe, verifiable software delivery.
