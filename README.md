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
- `rag-api` Markdown document ingestion and chunk inspection endpoints
- Postgres-backed document storage with `rag.documents` and `rag.document_chunks`
- seed corpus and golden eval fixture under `infra/seed`
- dashboard document list/detail screens for corpus inspection
- PostgreSQL + pgvector via Docker Compose
- CI checks for Node, Python, docs, Docker Compose config, and Docker Compose image builds

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
