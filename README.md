# RAGLens

RAGLens is a full-stack Retrieval-Augmented Generation (RAG) evaluation and observability platform.

It is designed around three service responsibilities:

```text
rag-api answers questions.
eval-api decides whether those answers are good.
dashboard explains what happened.
```

## Repository structure

```text
apps/
  rag-api/       Fastify + TypeScript service for ingestion, retrieval, answers, and traces
  eval-api/      FastAPI + Python service for datasets, scoring, comparisons, and CI gates
  dashboard/     Next.js dashboard for document, trace, and eval inspection

infra/
  migrations/    PostgreSQL and pgvector schema bootstrap
  seed/          Controlled seed documents and eval datasets

packages/
  shared/        Shared contracts that are safe to reuse across TypeScript workspaces

docs/            Source-of-truth project documentation in Markdown
docs-site/       Astro static documentation site that renders docs from docs/
```

## Current bootstrap scope

The current implementation provides:

- `rag-api` health endpoint at `GET /api/v1/health`
- `eval-api` health endpoint at `GET /api/v1/health`
- `rag-api` Markdown document ingestion, retrieval, query, and trace endpoints
- `rag-api` advanced retrieval modes (`vector`, `keyword`, `hybrid`, `hybrid_reranked`) with query rewriting, context packing, and configurable reranker adapter controls
- `rag-api` provider runtime adapters for deterministic/OpenAI/OpenRouter/Anthropic/Ollama query answering
- `rag-api` provider token usage + optional pricing configuration for estimated cost telemetry
- `rag-api` request correlation and structured provider-failure envelopes with `x-request-id`
- Postgres-backed document storage with `rag.documents` and `rag.document_chunks`
- Postgres-backed eval persistence for datasets, eval runs, case results, comparisons, and CI gate runs
- `eval-api` request correlation and structured error envelopes with `x-request-id`
- eval runner retries, timeout mapping, cost/max-case guardrails, and partial failure persistence
- seed corpus and golden eval fixture under `infra/seed`
- dashboard document list/detail screens for corpus inspection
- dashboard devtools page at `/devtools` for manual `rag-api` and `eval-api` request inspection
- PostgreSQL + pgvector via Docker Compose
- CI checks for Node, Python, docs, Docker Compose config, and Docker Compose image builds

## Runtime planning

RAGLens is planned to support both cloud and local model runtimes through provider-neutral interfaces and named model profiles.

The current implementation is not yet at local LLM execution. Local runtime support is planned to enter during the embeddings, retrieval, answer generation, trace, and eval phases rather than as a late rewrite.

Key docs:

- [`docs/local-llm-runtime-plan.md`](docs/local-llm-runtime-plan.md): detailed local LLM, embedding, reranker, and model profile implementation plan
- [`docs/local-runtime-roadmap-placement.md`](docs/local-runtime-roadmap-placement.md): where local runtime work sits in the roadmap
- [`docs/provider-neutral-runtime-adr.md`](docs/provider-neutral-runtime-adr.md): ADR for provider-neutral chat, embedding, reranker, judge, and model profile support
- [`docs/roadmap.md`](docs/roadmap.md): full phased delivery roadmap

Initial planned local profile:

```text
local-balanced
  chat provider: ollama
  chat model: qwen3:8b
  embedding provider: ollama
  embedding model: nomic-embed-text
  reranker provider: none
  retrieval mode: vector
```

## Local setup

Copy the example environment file:

```bash
cp .env.example .env
```

Install Node dependencies:

```bash
npm install
```

Install the Python eval API locally when working outside Docker:

```bash
cd apps/eval-api
python -m venv .venv
source .venv/bin/activate
pip install -e '.[dev]'
```

Start the local infrastructure and services:

```bash
docker compose up --build
```

Service URLs:

```text
Dashboard: http://localhost:3000
rag-api:   http://localhost:8000/api/v1/health
eval-api:  http://localhost:8001/api/v1/health
Postgres:  localhost:5432
```

## Seed ingestion

Load the controlled seed corpus into `rag-api`:

```bash
npm --workspace apps/rag-api run seed:documents
```

Then inspect indexed documents in the dashboard:

```text
http://localhost:3000/documents
```

See `docs/seed-ingestion.md` for the full workflow and troubleshooting notes.

## Local eval workflow

1. `docker compose up --build`
2. `npm --workspace apps/rag-api run seed:documents`
3. Open [http://localhost:3000/datasets](http://localhost:3000/datasets)
4. Create a dataset
5. Add test cases
6. Open [http://localhost:3000/eval-runs/new](http://localhost:3000/eval-runs/new)
7. Create an eval run
8. Open eval run detail
9. Execute run
10. Inspect case results

`/devtools` remains available for low-level API inspection, but normal eval execution should now run through dashboard datasets and eval run pages.



## Development commands

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

Docs commands:

```bash
npm run docs:dev
npm run docs:check
npm run docs:build
npm run docs:preview
```

## Documentation authoring

1. Add or update Markdown files in `docs/`.
2. Ensure each file has frontmatter fields: `title`, `description`, `order`, `section`, `status`.
3. Re-run `npm run docs:build` to validate and generate static output.

Astro build output is generated at `docs-site/dist/`.
