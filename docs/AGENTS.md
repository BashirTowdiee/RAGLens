# AGENTS.md

## Scope

These instructions apply to all Markdown files in `docs/`.

`docs/` is the source of truth for RAGLens product and engineering documentation. The Astro site reads from this directory, so documentation changes should start here.

## Product framing

Keep RAGLens positioned as:

```text
A production-style RAG platform with a TypeScript RAG API, a Python evaluation API, and a dashboard for trace inspection, failed-case analysis, run comparison, and CI quality gates.
```

The central framing is:

```text
rag-api answers questions.
eval-api decides whether those answers are good.
dashboard explains what happened.
```

Do not revive CIA-specific project language. The current product is a general RAG evaluation and observability platform.

## Required document frontmatter

Every Markdown document rendered by the docs site must include:

```yaml
---
title: "Document Title"
description: "One sentence description."
order: 1
section: "Overview"
status: "draft"
---
```

Allowed `status` values are:

```text
draft
review
stable
```

Use `order` to control navigation order. Keep ordering intentional and avoid duplicates unless the current docs pattern already requires it.

## Writing style

Use direct, company-style product and engineering language.

Prefer:

- Clear problem statements.
- Explicit decisions and rationale.
- Concrete acceptance criteria.
- Service ownership tables.
- API examples that match the planned contracts.
- Data models that support traceability and reproducibility.

Avoid:

- Hype language.
- Vague claims such as "enterprise-grade" without concrete design support.
- Contradictions between docs.
- Overfitting to a single demo dataset.
- Implementation details that bypass documented architecture boundaries.

Use Australian English spelling.

## Cross-document consistency

When changing one of these areas, check and update related docs:

- Product discovery.
- Product requirements.
- Product design.
- UX/dashboard design.
- Architecture planning.
- Technical design decisions.
- Data design.
- API planning.
- Evaluation methodology.
- Roadmap.
- Development process.
- Testing strategy.
- CI/CD plan.
- Release plan.
- Production review.
- Final delivery statement.

Examples:

- If an API endpoint changes, update API planning, data design, dashboard design, evaluation methodology, and testing strategy if affected.
- If the RAG/eval boundary changes, update architecture planning and technical design decisions.
- If a metric changes, update evaluation methodology, dashboard design, CI/CD plan, and release criteria.

## Architecture constraints to preserve

- `rag-api` is TypeScript + Fastify.
- `eval-api` is Python + FastAPI.
- `dashboard` is Next.js + TypeScript.
- PostgreSQL + pgvector is the primary database.
- Use separate logical schemas: `rag.*` and `eval.*`.
- `eval-api` calls `rag-api` over HTTP and treats it as a black box.
- `eval-api` does not import RAG internals.
- Evaluation workloads must not degrade user-facing RAG query paths.
- Query traces are first-class product data.

## Evaluation methodology constraints

Preserve the four evaluation layers:

1. Retrieval quality.
2. Citation quality.
3. Answer quality.
4. Operational quality.

Keep deterministic metrics first. Add LLM-as-judge metrics only as a second layer.

Required MVP test case types:

- factual
- comparison
- temporal
- multi_hop
- no_answer
- citation_sensitive

## Documentation validation

After editing docs, run from the repository root:

```bash
npm run docs:check
npm run docs:build
```

The docs site uses Astro content collections, so invalid frontmatter should be treated as a blocking error.
