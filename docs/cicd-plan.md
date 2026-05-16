---
title: "CI/CD Plan"
description: "Continuous integration and delivery plan for RAGLens."
order: 12
section: "Delivery"
status: "stable"
---
# CI/CD Plan: RAGLens

## 1. CI/CD objective

RAGLens needs CI/CD that proves three things:

```text
1. The software works.
2. The services can run together.
3. RAG quality has not regressed.
```

This project has a normal software delivery pipeline plus an AI quality pipeline.

The important distinction:

```text
Standard CI:
  lint, typecheck, tests, build, migrations.

RAG quality CI:
  seed documents, run eval dataset, check retrieval/citation/answer quality thresholds.
```

Do not run expensive live LLM evaluation on every pull request at the start. Make the first CI deterministic, then add live evals as manual or scheduled workflows.

---

# 2. Pipeline stages

The complete pipeline should have these stages:

```text
1. Validate repo
2. Install dependencies
3. Lint and format check
4. Typecheck
5. Unit tests
6. API integration tests
7. Database migration smoke test
8. Docker build
9. Service smoke test
10. Dashboard build
11. Deterministic RAG quality gate
12. Live RAG quality gate, manual/scheduled
13. Deploy, post-MVP
```

---

# 3. CI workflows

Use separate GitHub Actions workflows.

```text
.github/
  workflows/
    ci.yml
    docker-smoke.yml
    rag-quality-gate.yml
    live-rag-eval.yml
    deploy.yml
```

## Workflow 1: `ci.yml`

Runs on every pull request.

Purpose:

```text
Catch normal software regressions.
```

Runs:

```text
- rag-api lint
- rag-api typecheck
- rag-api unit tests
- rag-api route tests with mocked providers
- eval-api lint/format
- eval-api unit tests
- eval-api API tests with mocked rag-api client
- dashboard lint
- dashboard typecheck
- dashboard component tests
- dashboard build
```

No real OpenAI calls.

---

## Workflow 2: `docker-smoke.yml`

Runs on pull requests to important branches, or after `ci.yml`.

Purpose:

```text
Prove services boot together.
```

Runs:

```text
- docker compose build
- docker compose up postgres rag-api eval-api dashboard
- run migrations
- call rag-api /health
- call eval-api /health
- check dashboard responds
```

No full eval required.

---

## Workflow 3: `rag-quality-gate.yml`

Runs on main branch, manually, or selected PRs.

Purpose:

```text
Run deterministic RAG evaluation with mocked or fixture-based providers.
```

Runs:

```text
- start postgres, rag-api, eval-api
- run migrations
- seed sample company documents
- seed golden eval dataset
- run eval-api deterministic eval
- check retrieval and citation thresholds
- upload eval report
```

Should avoid live provider calls in early versions.

---

## Workflow 4: `live-rag-eval.yml`

Runs manually or on schedule.

Purpose:

```text
Run real provider-backed evaluation.
```

Runs:

```text
- start services
- seed docs
- seed dataset
- run eval with OpenAI provider
- run judge scoring
- generate report
- upload artefact
```

This uses real API keys and costs money, so do not run it on every PR.

---

## Workflow 5: `deploy.yml`

Post-MVP.

Purpose:

```text
Deploy services and dashboard.
```

Could deploy to:

```text
- Azure Container Apps
- AWS ECS
- Fly.io
- Render
- Railway
```

For the first portfolio version, deployment is optional. A reliable local Docker demo is enough.

---

# 4. Branch strategy

Keep the branch strategy simple.

```text
main:
  stable branch

feature/*:
  normal feature branches

release/demo:
  optional branch for portfolio demo snapshots
```

Pull requests into `main` should run:

```text
- standard CI
- migration smoke test
- dashboard build
```

Main branch should also run:

```text
- Docker smoke test
- deterministic RAG quality gate
```

Manual workflow should run:

```text
- live provider eval
```

---

# 5. Standard CI: detailed plan

## rag-api checks

Commands:

```bash
npm run lint --workspace apps/rag-api
npm run typecheck --workspace apps/rag-api
npm run test --workspace apps/rag-api
npm run build --workspace apps/rag-api
```

Tests should use:

```text
- mocked embedding provider
- mocked chat provider
- test database where needed
```

Must not require:

```text
- OpenAI API key
- live network
```

---

## eval-api checks

Recommended commands:

```bash
cd apps/eval-api
python -m ruff check .
python -m pytest
```

Optional later:

```bash
python -m mypy .
# or
python -m pyright
```

Tests should use:

```text
- mocked rag-api client
- mocked judge provider
- test database where needed
```

Must not require:

```text
- rag-api running
- OpenAI API key
- live network
```

---

## dashboard checks

Commands:

```bash
npm run lint --workspace apps/dashboard
npm run typecheck --workspace apps/dashboard
npm run test --workspace apps/dashboard
npm run build --workspace apps/dashboard
```

Dashboard tests should use mocked API responses.

---

# 6. Migration CI

Because the project uses SQL migrations, have a migration smoke test.

## What it checks

```text
- clean Postgres starts
- pgvector extension can be enabled
- all migrations apply successfully
- rag schema exists
- eval schema exists
- required tables exist
```

## Example command

```bash
docker compose up -d postgres
npm run db:migrate
npm run db:check
```

Or:

```bash
psql "$DATABASE_URL" -f infra/migrations/001_enable_extensions.sql
psql "$DATABASE_URL" -f infra/migrations/002_create_rag_schema.sql
psql "$DATABASE_URL" -f infra/migrations/003_create_eval_schema.sql
```

## Acceptance criteria

```text
- migrations run from empty database
- migrations are repeatable in CI from clean state
- migration failure blocks merge
```

---

# 7. Docker smoke test

## Purpose

Prove the local system can boot.

## Steps

```text
1. Build Docker images.
2. Start Postgres.
3. Run migrations.
4. Start rag-api.
5. Start eval-api.
6. Start dashboard.
7. Check health endpoints.
```

## Health checks

```bash
curl -f http://localhost:3001/api/v1/health
curl -f http://localhost:3002/api/v1/health
curl -f http://localhost:3000
```

## Acceptance criteria

```text
- all services start
- APIs are healthy
- dashboard responds
```

---

# 8. Deterministic RAG quality gate

This is the first AI-specific CI gate.

## Goal

Catch obvious RAG regressions without live provider calls.

## Strategy

Use deterministic providers or fixtures:

```text
MockEmbeddingProvider
MockChatProvider
MockJudgeProvider
```

The deterministic eval should verify:

```text
- documents seed correctly
- expected sources can be retrieved
- citations are valid
- trace IDs are created
- eval scoring works
```

## Workflow steps

```text
1. Start postgres, rag-api, eval-api.
2. Run migrations.
3. Set provider mode to mock.
4. Seed sample documents.
5. Seed eval dataset.
6. Run eval.
7. Check thresholds.
8. Upload JSON/Markdown report.
```

## Example environment

```text
AI_PROVIDER_MODE=mock
JUDGE_PROVIDER_MODE=mock
RAG_API_BASE_URL=http://localhost:3001
EVAL_API_BASE_URL=http://localhost:3002
```

## Suggested deterministic thresholds

```json
{
  "minHitAt5": 0.8,
  "minCitationValidity": 0.95,
  "minCitationTraceability": 0.95
}
```

Do not include groundedness/correctness until live or stable mocked judge responses exist.

---

# 9. Live RAG evaluation workflow

This is the real AI quality workflow.

## Trigger

Use:

```text
workflow_dispatch
schedule, optional nightly
```

Avoid running on every PR initially.

## Requirements

GitHub secrets:

```text
OPENAI_API_KEY
```

Optional later:

```text
ANTHROPIC_API_KEY
OPENROUTER_API_KEY
```

## Steps

```text
1. Start services.
2. Run migrations.
3. Seed sample docs.
4. Seed eval dataset.
5. Run eval with real provider.
6. Enable LLM judge.
7. Generate report.
8. Upload report artefact.
```

## Report outputs

```text
eval-report.json
eval-report.md
eval-summary.txt
```

## Example report summary

```text
Dataset: Company Knowledge Base Eval v1
RAG Config: vector-default
Cases: 25
Pass rate: 84%
Hit@5: 88%
Citation validity: 96%
Groundedness: 87%
Estimated cost: $0.18
Average latency: 2100ms

Failures:
- retrieval_miss: 2
- unsupported_claim: 1
- incomplete_answer: 1
```

---

# 10. CI quality gate rules

## Early gate

Block only on deterministic metrics:

```text
- migrations fail
- services fail to start
- seeded docs fail
- eval run fails
- hit@5 below threshold
- citation validity below threshold
- citation traceability below threshold
```

## Later gate

Block on judge metrics once stable:

```text
- groundedness below threshold
- correctness below threshold
- citation support below threshold
- refusal quality below threshold for no-answer cases
```

## Do not block initially on

```text
- real LLM judge score from a single run
- small latency fluctuations
- tiny cost increase
```

Use warnings first.

---

# 11. Example GitHub Actions: standard CI

```yaml
name: CI

on:
  pull_request:
  push:
    branches:
      - main

jobs:
  rag-api:
    name: rag-api
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: apps/rag-api
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - run: npm ci
        working-directory: .

      - run: npm run lint
      - run: npm run typecheck
      - run: npm test
      - run: npm run build

  eval-api:
    name: eval-api
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: apps/eval-api
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"

      - run: python -m pip install --upgrade pip
      - run: pip install -r requirements-dev.txt
      - run: ruff check .
      - run: pytest

  dashboard:
    name: dashboard
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: apps/dashboard
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - run: npm ci
        working-directory: .

      - run: npm run lint
      - run: npm run typecheck
      - run: npm test
      - run: npm run build
```

Note: if you use npm workspaces from repo root, adjust `npm ci` and workspace commands accordingly. In a monorepo, it is usually cleaner to install once at root.

---

# 12. Better monorepo CI shape

If using npm workspaces at the root:

```yaml
name: CI

on:
  pull_request:
  push:
    branches:
      - main

jobs:
  node:
    name: Node apps
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - run: npm ci

      - run: npm run lint --workspaces --if-present
      - run: npm run typecheck --workspaces --if-present
      - run: npm test --workspaces --if-present
      - run: npm run build --workspaces --if-present

  python:
    name: eval-api
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: apps/eval-api
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"

      - run: python -m pip install --upgrade pip
      - run: pip install -r requirements-dev.txt
      - run: ruff check .
      - run: pytest
```

This is better once the repo structure stabilises.

---

# 13. Docker smoke workflow

```yaml
name: Docker Smoke

on:
  pull_request:
    paths:
      - "apps/**"
      - "infra/**"
      - "docker-compose.yml"
      - ".github/workflows/docker-smoke.yml"
  push:
    branches:
      - main

jobs:
  docker-smoke:
    runs-on: ubuntu-latest

    env:
      OPENAI_API_KEY: test-key
      AI_PROVIDER_MODE: mock
      JUDGE_PROVIDER_MODE: mock

    steps:
      - uses: actions/checkout@v4

      - name: Build services
        run: docker compose build

      - name: Start services
        run: docker compose up -d postgres rag-api eval-api dashboard

      - name: Wait for rag-api
        run: |
          for i in {1..30}; do
            curl -f http://localhost:3001/api/v1/health && exit 0
            sleep 2
          done
          exit 1

      - name: Wait for eval-api
        run: |
          for i in {1..30}; do
            curl -f http://localhost:3002/api/v1/health && exit 0
            sleep 2
          done
          exit 1

      - name: Check dashboard
        run: |
          for i in {1..30}; do
            curl -f http://localhost:3000 && exit 0
            sleep 2
          done
          exit 1

      - name: Show logs on failure
        if: failure()
        run: docker compose logs

      - name: Shutdown
        if: always()
        run: docker compose down -v
```

---

# 14. RAG quality gate workflow

```yaml
name: RAG Quality Gate

on:
  workflow_dispatch:
  push:
    branches:
      - main

jobs:
  deterministic-rag-eval:
    runs-on: ubuntu-latest

    env:
      OPENAI_API_KEY: test-key
      AI_PROVIDER_MODE: mock
      JUDGE_PROVIDER_MODE: mock
      RAG_API_BASE_URL: http://localhost:3001
      EVAL_API_BASE_URL: http://localhost:3002

    steps:
      - uses: actions/checkout@v4

      - name: Build services
        run: docker compose build

      - name: Start services
        run: docker compose up -d postgres rag-api eval-api

      - name: Wait for APIs
        run: |
          for i in {1..30}; do
            curl -f http://localhost:3001/api/v1/health && \
            curl -f http://localhost:3002/api/v1/health && exit 0
            sleep 2
          done
          exit 1

      - name: Run migrations
        run: npm run db:migrate

      - name: Seed documents
        run: npm run seed:documents

      - name: Seed eval dataset
        run: npm run seed:eval-dataset

      - name: Run deterministic eval
        run: npm run eval:deterministic -- --threshold balanced --output ./artifacts/eval-report.json

      - name: Upload eval report
        uses: actions/upload-artifact@v4
        with:
          name: deterministic-eval-report
          path: artifacts/eval-report.json

      - name: Show logs on failure
        if: failure()
        run: docker compose logs

      - name: Shutdown
        if: always()
        run: docker compose down -v
```

You can adjust commands once the actual scripts exist.

---

# 15. Live RAG eval workflow

```yaml
name: Live RAG Eval

on:
  workflow_dispatch:
    inputs:
      dataset:
        description: "Dataset ID or seed name"
        required: false
        default: "company-kb-eval-v1"

jobs:
  live-rag-eval:
    runs-on: ubuntu-latest

    env:
      OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
      AI_PROVIDER_MODE: live
      JUDGE_PROVIDER_MODE: live
      RAG_API_BASE_URL: http://localhost:3001
      EVAL_API_BASE_URL: http://localhost:3002

    steps:
      - uses: actions/checkout@v4

      - name: Build services
        run: docker compose build

      - name: Start services
        run: docker compose up -d postgres rag-api eval-api

      - name: Wait for APIs
        run: |
          for i in {1..30}; do
            curl -f http://localhost:3001/api/v1/health && \
            curl -f http://localhost:3002/api/v1/health && exit 0
            sleep 2
          done
          exit 1

      - name: Run migrations
        run: npm run db:migrate

      - name: Seed sample data
        run: |
          npm run seed:documents
          npm run seed:eval-dataset

      - name: Run live eval
        run: npm run eval:live -- --judge --threshold balanced --output ./artifacts/live-eval-report.json

      - name: Upload live eval report
        uses: actions/upload-artifact@v4
        with:
          name: live-eval-report
          path: artifacts/live-eval-report.json

      - name: Shutdown
        if: always()
        run: docker compose down -v
```

---

# 16. Required package scripts

At repo root, define scripts like:

```json
{
  "scripts": {
    "lint": "npm run lint --workspaces --if-present",
    "typecheck": "npm run typecheck --workspaces --if-present",
    "test": "npm test --workspaces --if-present",
    "build": "npm run build --workspaces --if-present",

    "db:migrate": "node infra/scripts/migrate.js",
    "db:check": "node infra/scripts/check-db.js",

    "seed:documents": "node infra/scripts/seed-documents.js",
    "seed:eval-dataset": "node infra/scripts/seed-eval-dataset.js",

    "eval:deterministic": "node infra/scripts/run-eval.js --mode deterministic",
    "eval:live": "node infra/scripts/run-eval.js --mode live"
  }
}
```

For Python-specific commands, either call them inside the eval-api directory or expose root scripts.

Example:

```json
{
  "scripts": {
    "eval-api:test": "cd apps/eval-api && pytest",
    "eval-api:lint": "cd apps/eval-api && ruff check ."
  }
}
```

---

# 17. Environment variables

## CI mock mode

```text
AI_PROVIDER_MODE=mock
JUDGE_PROVIDER_MODE=mock
OPENAI_API_KEY=test-key
DATABASE_URL=postgres://raglens:raglens@localhost:5432/raglens
RAG_API_BASE_URL=http://localhost:3001
EVAL_API_BASE_URL=http://localhost:3002
```

## Live eval mode

```text
AI_PROVIDER_MODE=live
JUDGE_PROVIDER_MODE=live
OPENAI_API_KEY=${{ secrets.OPENAI_API_KEY }}
```

## Dashboard build

```text
NEXT_PUBLIC_RAG_API_URL=http://localhost:3001
NEXT_PUBLIC_EVAL_API_URL=http://localhost:3002
```

---

# 18. Artefacts

Each quality run should upload artefacts.

## Standard CI artefacts

Usually none unless failure.

## RAG eval artefacts

```text
artifacts/
  eval-report.json
  eval-report.md
  eval-summary.txt
```

## Docker smoke artefacts

On failure:

```text
docker logs
```

## Dashboard artefacts, optional

For portfolio release:

```text
screenshots/
  query-trace-detail.png
  eval-run-detail.png
  failed-case-detail.png
  comparison-detail.png
```

---

# 19. Deployment plan, post-MVP

## Deployment environments

Use three conceptual environments:

```text
local:
  Docker Compose

staging:
  hosted services with sample data

production-demo:
  stable portfolio demo
```

For a portfolio project, `staging` and `production-demo` may be the same.

---

## Deployment option A: Render/Fly.io/Railway

Good for:

```text
- fastest hosted demo
- simple deployment
- low infrastructure overhead
```

Services:

```text
rag-api
eval-api
dashboard
managed Postgres
```

---

## Deployment option B: Azure Container Apps

Good for AI Engineer signalling.

Services:

```text
Azure Container Apps:
  rag-api
  eval-api
  dashboard

Azure Database for PostgreSQL:
  postgres + pgvector if supported/configured

GitHub Actions:
  build and deploy
```

This is stronger for enterprise AI roles, but more setup.

---

## Deployment option C: AWS ECS/Fargate

Good if you want to show platform/backend strength.

Services:

```text
ECS services:
  rag-api
  eval-api
  dashboard

RDS PostgreSQL:
  database

CloudWatch:
  logs
```

Probably overkill for first version.

---

# 20. Deployment pipeline stages

Post-MVP deployment workflow:

```text
1. CI passes.
2. Docker images are built.
3. Images are tagged with commit SHA.
4. Images are pushed to registry.
5. Staging deploy runs.
6. Migrations run.
7. Smoke tests run.
8. Optional deterministic eval runs.
9. Promote to demo environment.
```

## Image tags

Use:

```text
raglens-rag-api:<commit-sha>
raglens-eval-api:<commit-sha>
raglens-dashboard:<commit-sha>
```

Also:

```text
latest
```

only for convenience, not traceability.

---

# 21. Release gates

## Merge gate

Required before merge:

```text
- lint passes
- typecheck passes
- tests pass
- build passes
- migrations pass
```

## Main branch gate

Required after merge:

```text
- Docker smoke passes
- deterministic RAG eval passes
```

## Demo release gate

Required before public demo:

```text
- live eval run completed
- dashboard demo flow checked
- screenshots updated
- README updated
- no secrets exposed
```

---

# 22. Handling flaky AI evals

Live LLM evals can be flaky.

Rules:

```text
- Do not block every PR on live judge scores initially.
- Use deterministic evals for blocking CI.
- Use live evals as scheduled/manual quality reports.
- Store reports for comparison.
- Investigate repeated failures, not single noisy scores.
```

Later, once stable:

```text
- use rolling averages
- require regression across multiple cases
- use deterministic checks as hard gate
- use LLM judge as warning gate
```

---

# 23. Cost control in CI

## Rules

```text
- No live provider calls in default PR CI.
- Small eval dataset for live runs.
- Max cases per run.
- Judge optional.
- Cost estimate shown in reports.
```

## Suggested limits

```text
PR deterministic eval:
  20 to 30 cases
  mock providers
  cost: $0

Manual live eval:
  20 to 30 cases
  real provider
  judge enabled
  capped by maxCases

Nightly live eval:
  optional
  only after project is stable
```

---

# 24. Secrets management

## GitHub secrets

```text
OPENAI_API_KEY
ANTHROPIC_API_KEY, later
OPENROUTER_API_KEY, later
DATABASE_URL_STAGING, later
DEPLOY_TOKEN, later
```

## Rules

```text
- never echo secrets
- never upload .env
- never include raw provider headers in logs
- redact provider errors if needed
```

---

# 25. Quality reports

Generate a report after every eval run.

## JSON report

Used by CI.

```json
{
  "status": "fail",
  "evalRunId": "run_123",
  "summary": {
    "caseCount": 25,
    "passRate": 0.72,
    "hitAt5": 0.76,
    "citationValidity": 0.96,
    "groundedness": 0.78,
    "estimatedCost": 0.18
  },
  "thresholdFailures": [
    {
      "metric": "groundedness",
      "expected": ">= 0.85",
      "actual": 0.78
    }
  ],
  "failedCases": [
    {
      "question": "Does the company allow unlimited overseas remote work?",
      "failureType": "bad_refusal"
    }
  ]
}
```

## Markdown report

Used by humans.

```markdown
# RAG Quality Report

Dataset: Company Knowledge Base Eval v1  
Config: vector-default  
Status: Fail

## Summary

| Metric | Value | Threshold |
|---|---:|---:|
| Pass rate | 72% | 80% |
| Hit@5 | 76% | 80% |
| Citation validity | 96% | 95% |
| Groundedness | 78% | 85% |

## Failed Cases

- Does the company allow unlimited overseas remote work?  
  Failure: bad_refusal
```

---

# 26. Pipeline evolution

## Stage 1: Basic software CI

```text
lint
typecheck
unit tests
build
```

## Stage 2: DB and Docker CI

```text
migrations
docker compose smoke
health checks
```

## Stage 3: Deterministic RAG quality gate

```text
seed docs
seed dataset
run eval with mocks
check deterministic thresholds
```

## Stage 4: Manual live eval

```text
real OpenAI
judge scoring
report upload
```

## Stage 5: CI regression gate

```text
compare baseline vs candidate
fail if quality drops beyond threshold
```

## Stage 6: Deployment

```text
build images
push images
deploy staging/demo
run smoke tests
```

---

# 27. What to build first

Build CI/CD in this order:

```text
1. Basic CI for rag-api, eval-api, dashboard.
2. Migration smoke test.
3. Docker Compose smoke test.
4. Seed script smoke test.
5. Deterministic eval gate with mocked providers.
6. Manual live eval workflow.
7. Eval report artefacts.
8. Deployment workflow.
```

Do not start with cloud deployment.

---

# 28. Final CI/CD summary

RAGLens should have two kinds of pipelines:

```text
Software pipeline:
  proves the code works.

AI quality pipeline:
  proves the RAG system still behaves correctly.
```

The first production-style version should support:

```text
- deterministic PR CI
- Docker smoke testing
- migration testing
- mocked RAG quality gate
- manual live eval workflow
- uploaded eval reports
```

The later version should support:

```text
- regression comparison in CI
- blocking quality gates
- scheduled live evals
- deployment to a hosted demo environment
```

The key rule:

```text
Default CI must be deterministic and cheap.
Live AI evaluation must be explicit, reportable, and cost-controlled.
```
