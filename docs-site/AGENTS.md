# AGENTS.md

## Scope

These instructions apply to `docs-site/`, the Astro static documentation site.

The documentation source of truth is `../docs/`. Do not hardcode documentation content into Astro pages unless the task explicitly requires site chrome, navigation, or landing-page copy.

## Site purpose

`docs-site/` renders RAGLens product documentation from Markdown files in `../docs/`.

The site should make the documentation easier to navigate, not create a second source of truth.

## Astro content rules

The docs collection is loaded from `../docs/*.md`. Preserve this direction unless the task explicitly changes the documentation architecture.

Required frontmatter schema:

```ts
{
  title: string;
  description: string;
  order: number;
  section: string;
  status: 'draft' | 'review' | 'stable';
}
```

When adding docs pages, add Markdown files to `../docs/`, not to `src/pages/docs/`.

## Development rules

- Keep Astro pages thin.
- Keep layouts focused on navigation, document rendering, headings, and responsive presentation.
- Do not duplicate business/product content from `../docs/` into components.
- Do not commit generated `dist/` output unless explicitly requested.
- Avoid adding client-side JavaScript unless it materially improves navigation or readability.
- Keep dependencies minimal.

## Styling rules

- Use existing global styles where possible.
- Preserve readable long-form documentation layout.
- Prioritise code blocks, tables, headings, and navigation usability.
- Avoid decorative UI that makes technical docs harder to scan.

## Validation commands

From the repository root:

```bash
npm run docs:check
npm run docs:build
```

From inside `docs-site/`:

```bash
npm run check
npm run build
```

A successful build must pass `astro check` before `astro build`.
