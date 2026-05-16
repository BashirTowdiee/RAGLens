# RAGLens Docs Site

This directory contains the Astro-based static documentation site for RAGLens.

## Run locally

```bash
npm --prefix docs-site run dev
```

## Check and build

```bash
npm --prefix docs-site run check
npm --prefix docs-site run build
```

## Preview production build

```bash
npm --prefix docs-site run preview
```

## Markdown source of truth

Markdown source files live in the repository root `docs/` directory.

This Astro site loads docs directly from `../docs` via Astro Content Collections (`glob` loader in `src/content.config.ts`), so no duplicated copy is required.

## Add a new docs page

1. Create a new markdown file under `docs/`.
2. Add required frontmatter fields.
3. Give it an `order` value for navigation placement.
4. Restart `astro dev` if needed.

## Required frontmatter

Each docs markdown file must include:

- `title: string`
- `description: string`
- `order: number`
- `section: string`
- `status: draft | review | stable`
