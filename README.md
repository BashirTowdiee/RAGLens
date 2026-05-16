# RAGLens

RAGLens is a production-style Retrieval-Augmented Generation (RAG) evaluation and engineering platform.

It brings product, architecture, API, data, evaluation, testing, CI/CD, release, and development planning into a single project workspace.

## Repository structure

- `docs/` - source-of-truth project documentation in Markdown
- `docs-site/` - Astro static documentation site that renders docs from `docs/`

## Project documentation

- Docs source lives in `docs/`.
- Astro site lives in `docs-site/`.

### Run docs locally

```bash
npm run docs:dev
```

### Type-check docs site

```bash
npm run docs:check
```

### Build docs site

```bash
npm run docs:build
```

### Preview built docs site

```bash
npm run docs:preview
```

## Documentation authoring

1. Add or update Markdown files in `docs/`.
2. Ensure each file has frontmatter fields: `title`, `description`, `order`, `section`, `status`.
3. Re-run `npm run docs:build` to validate and generate static output.

## Output

Astro build output is generated at `docs-site/dist/`.
