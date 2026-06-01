---
title: "Dashboard Devtools"
description: "How to use the dashboard devtools page to interact with rag-api and eval-api."
order: 17
section: "Development"
status: "stable"
---
# Dashboard Devtools

## Purpose

The dashboard now includes a developer tools page at:

```text
http://localhost:3000/devtools
```

This page lets you send manual API requests to both backend services from the browser without CORS issues.

Architecture boundary remains unchanged:

```text
dashboard -> HTTP -> rag-api / eval-api
```

No backend internals are imported into the dashboard.

The dashboard also includes a runtime settings surface at:

```text
http://localhost:3000/settings
```

This settings page updates rag-api/eval-api runtime defaults and service wiring through backend-owned runtime config APIs.

## How it works

The page sends request payloads to a same-origin Next.js route:

```text
POST /api/devtools
```

That route validates the payload, selects the target service base URL, forwards the request, and returns a normalized response envelope.

Current guardrails:

```text
- service must be "rag" or "eval"
- method must be GET/POST/PUT/PATCH/DELETE
- path must start with /api/v1/
- response includes status, duration, selected headers, and parsed body
```

Preset coverage now includes:

```text
- GET  rag  /api/v1/rag-configs
- GET  eval /api/v1/eval-runs/rag-config-presets
- POST eval /api/v1/eval-runs with named rag_config_id presets
```

## Config

The proxy uses existing dashboard service URL config:

```text
RAG_API_BASE_URL or NEXT_PUBLIC_RAG_API_BASE_URL
EVAL_API_BASE_URL or NEXT_PUBLIC_EVAL_API_BASE_URL
```

Defaults:

```text
rag-api:  http://localhost:8000
eval-api: http://localhost:8001
```

Runtime settings writes use:

```text
GET /api/settings/runtime
PUT /api/settings/runtime
```

The dashboard route aggregates backend config APIs:

```text
GET/PUT rag-api  /api/v1/runtime-config
GET/PUT eval-api /api/v1/runtime-config
```

Current runtime-config persistence is in-memory for both services, so changes apply immediately to running services but are not durable across restarts.

## Typical workflow

1. Start the stack with `docker compose up --build`.
2. Open `http://localhost:3000/devtools`.
3. Choose a preset, then replace placeholder IDs where needed.
4. Send the request and inspect status, headers (`x-request-id`), and body.

For end-to-end provider comparison runs from the UI, use:

```text
http://localhost:3000/comparisons/new
```

This wizard:

```text
1. selects a dataset
2. selects baseline/candidate rag configs
3. creates both eval runs
4. executes both runs
5. creates and opens the comparison
```

## Example requests

```text
GET  rag  /api/v1/health
GET  rag  /api/v1/documents
POST rag  /api/v1/query
GET  eval /api/v1/eval-runs
POST eval /api/v1/eval-runs/:id/execute?maxCases=5
POST eval /api/v1/ci/evaluate
```

## Notes

- This is a debugging and contract-inspection surface for local development.
- It does not replace typed dashboard pages for primary product workflows.
- It intentionally keeps calls inside `/api/v1` to match versioned API contracts.
- Runtime config changes made through `/settings` are live in the running services and are reset on service restart.
