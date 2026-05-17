# AGENTS.md

## Project purpose

RAGLens is a production-style RAG evaluation and observability platform. Keep the core product framing intact:

- `rag-api` answers questions.
- `eval-api` measures whether those answers are good.
- `dashboard` explains what happened.
- `docs/` is the source of truth for product, architecture, API, data, evaluation, testing, CI/CD, release, and delivery planning.
- `docs-site/` renders the documentation using Astro.

Do not reintroduce the old CIA Reading Room concept. Treat the current RAGLens direction as authoritative.

## Current repository shape

The repository is currently documentation-first:

```text
docs/       Markdown source-of-truth documentation
docs-site/  Astro static documentation site
```

The planned implementation architecture is:

```text
apps/rag-api/       TypeScript + Fastify RAG service
apps/eval-api/      Python + FastAPI evaluation service
apps/dashboard/     TypeScript + Next.js dashboard
packages/           Shared contracts, providers, RAG core, observability
infra/              Docker, migrations, seed data
```

Only create planned app/package directories when the work explicitly starts implementation. Until then, keep changes scoped to docs and docs-site.

## Architectural rules

Preserve these boundaries:

- `rag-api` owns document ingestion, chunking, embeddings, retrieval, generation, citations, provider telemetry, and query traces.
- `eval-api` owns datasets, test cases, eval runs, scoring, comparisons, CI quality gates, and evaluator prompts.
- `eval-api` must treat `rag-api` as a black-box HTTP service.
- Do not import RAG internals into eval code.
- Do not duplicate retrieval or generation logic in eval code.
- Dashboard consumes both APIs but does not own backend business logic.
- PostgreSQL uses separate schemas: `rag.*` and `eval.*`.
- Every answer should be traceable, every trace evaluable, every eval result reproducible, and every behavioural change comparable.

## Product quality principles

Prioritise production AI engineering signals:

- Trace-first RAG behaviour.
- Deterministic metrics before LLM-as-judge metrics.
- Version prompts, RAG configs, model/provider settings, chunking settings, retrieval settings, judge prompts, and evaluation datasets.
- Prefer stable JSON contracts over clever abstractions.
- Include cost, latency, retrieved chunks, citations, provider calls, and errors in trace-oriented designs.
- Treat quality regressions as first-class release blockers.

## Documentation standards

When editing documentation:

- Update `docs/` first. The docs site should render from those Markdown files.
- Preserve frontmatter on each doc:

```yaml
title: "..."
description: "..."
order: 1
section: "..."
status: "draft" | "review" | "stable"
```

- Use clear, company-style product and engineering language.
- Keep sections consistent across product, architecture, data, API, evaluation, testing, CI/CD, release, and production-readiness docs.
- When changing a product decision, update related docs rather than leaving contradictions.
- Prefer Australian English spelling.
- Avoid hype, filler, and unsupported claims.

## Implementation standards for future services

When implementation begins:

### TypeScript services

- Use TypeScript with strict types.
- Use Fastify for `rag-api`.
- Use Zod or equivalent runtime validation at API boundaries.
- Keep modules isolated by domain: documents, chunks, embeddings, retrieval, generation, citations, traces, configs, prompts.
- Do not leak provider SDK response objects through API responses.
- Keep API responses camelCase and paths resource-oriented.

### Python services

- Use FastAPI for `eval-api`.
- Use Pydantic for request/response validation.
- Use `httpx` for calling `rag-api`.
- Keep scoring logic deterministic where possible.
- Isolate optional RAGAS, DeepEval, pandas, polars, sentence-transformers, or judge-model integrations behind explicit modules.
- Do not let eval workloads affect user-facing query paths.

### Dashboard

- Use Next.js and TypeScript when the dashboard is created.
- Dashboard views should explain traces, citations, failed cases, eval run summaries, and run comparisons.
- Avoid putting scoring or retrieval business logic in the UI.

## API contract rules

Use `/api/v1` for service APIs. Use predictable error responses:

```json
{
  "error": {
    "code": "validation_error",
    "message": "Question is required.",
    "requestId": "req_123",
    "details": {}
  }
}
```

Use:

- camelCase JSON fields.
- UUID identifiers.
- ISO 8601 timestamps.
- Paginated list endpoints from day one.
- Stable trace IDs for connecting query responses, dashboard inspection, eval results, citation validation, and run comparisons.

## Evaluation rules

Evaluation should be layered:

1. Retrieval quality.
2. Citation quality.
3. Answer quality.
4. Operational quality.

MVP deterministic checks should include hit@k, recall@k, expected source rank, citation existence, cited chunk existence, and cited chunk presence in retrieved context.

Use LLM-as-judge for groundedness, correctness, completeness, citation support, unsupported claims, and missing important points only after deterministic checks are in place.

## Validation commands

Use the root scripts for docs work:

```bash
npm run docs:check
npm run docs:build
```

Use the docs-site scripts only when working inside `docs-site/` directly:

```bash
npm --prefix docs-site run check
npm --prefix docs-site run build
```

Do not commit generated `docs-site/dist/` output unless a task explicitly asks for built static output.

## Safe change policy

Before modifying existing behaviour or documentation structure:

- Check for related docs under `docs/`.
- Keep the two-service architecture consistent.
- Preserve the source-of-truth role of `docs/`.
- Avoid adding new tools, frameworks, or services without a documented reason.
- Prefer small, reviewable changes with clear acceptance criteria.
