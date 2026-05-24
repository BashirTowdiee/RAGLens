# Roadmap Coordination

This file tracks the active roadmap position for automation cycles.

## Active stage

Stage 2 - Corpus, ingestion, and metadata baseline.

## Source roadmap documents

- `docs/roadmap.md`
- `docs/research-informed-implementation-roadmap.md`

## Completed stages

- Stage 1 - Local platform foundation: PR #1 merged.

## Current active PR

- PR pending: Stage 2 seed corpus and eval fixture
- Branch: `stage-2/seed-corpus-and-eval-fixture`

## Stage 2 acceptance criteria

- Seed documents are realistic enough for demos.
- Dataset has expected answers and expected sources.
- Source references are stable across environments.
- No-answer test cases are included.

## Next remaining Stage 2 work after seed fixture

- Implement `rag.documents` and `rag.document_chunks` migrations.
- Implement Markdown ingestion and chunking.
- Add document and chunk list/detail endpoints.
