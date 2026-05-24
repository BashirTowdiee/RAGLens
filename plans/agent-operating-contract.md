# Agent Operating Contract

## Scope

Use this workspace to coordinate repository automation cycles for the approved RAGLens roadmap.

## Operating rules

- Treat the repository and pull request state as the source of truth.
- Prefer merging ready roadmap PRs over starting new work.
- If an active roadmap PR has failing CI, fix only the blocker.
- If CI, review, or mergeability is pending, do not start a new implementation slice.
- Keep file scope narrow.
- Preserve service-first architecture.
- Implement tests with code where applicable.
- Record each cycle in `plans/coordination.md` and the active worker file.

## Active roadmap source

The active delivery roadmap is documented in:

- `docs/roadmap.md`
- `docs/research-informed-implementation-roadmap.md`
