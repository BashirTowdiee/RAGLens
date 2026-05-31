---
title: "Seed Ingestion"
description: "How to load the controlled seed corpus into rag-api for local demos and dashboard inspection."
order: 14
section: "Development"
status: "draft"
---
# Seed Ingestion

## Purpose

RAGLens includes a controlled seed corpus so the platform can be demonstrated and evaluated without relying on private company data.

The seed ingestion workflow loads Markdown documents from:

```text
infra/seed/documents
```

and stores them in the `rag.documents` and `rag.document_chunks` tables through the same document repository contract used by the `rag-api` document endpoints.

## Prerequisites

Start the local platform:

```bash
docker compose up --build
```

The command starts PostgreSQL with pgvector, `rag-api`, `eval-api`, and the dashboard.

The default database connection used by `rag-api` is:

```text
postgres://raglens:raglens@localhost:5432/raglens
```

## Apply migrations

Before seeding documents, make sure the database has the schema from `infra/migrations`.

The required tables for document ingestion are:

```text
rag.documents
rag.document_chunks
```

The Postgres-backed repository expects both tables to exist before the seed command runs.

## Run the seed command

From the repository root, run:

```bash
npm --workspace apps/rag-api run seed:documents
```

The command:

```text
1. reads Markdown files under infra/seed/documents
2. ignores README.md files
3. extracts each document title from the first H1 heading
4. uses the Markdown file name as the stable source ID
5. chunks each document by heading path
6. upserts the document by source ID
7. replaces chunks when a source document is re-ingested
```

## Verify in the dashboard

Open:

```text
http://localhost:3000/documents
```

You should see the indexed seed documents. Select a document to inspect its metadata and generated chunks.

To ingest ad-hoc files from the dashboard UI, open:

```text
http://localhost:3000/documents/upload
```

The upload flow supports `.md`, `.markdown`, and `.txt` files and forwards content to `POST /api/v1/documents/ingest`.

## Verify through rag-api

List indexed documents:

```bash
curl http://localhost:8000/api/v1/documents
```

Inspect chunks for a document:

```bash
curl http://localhost:8000/api/v1/documents/<document-id>/chunks
```

## Expected seed source IDs

The controlled corpus currently includes stable source IDs such as:

```text
remote-work-policy-v1
remote-work-policy-v2
expense-policy
onboarding-policy
mobile-release-process
incident-response-runbook
api-integration-guide
architecture-decision-records
refund-policy
escalation-process
known-issues
```

These source IDs are used by evaluation fixtures to assert expected retrieval sources.

## Troubleshooting

### `relation "rag.documents" does not exist`

The database migrations have not been applied to the target database. Apply `infra/migrations/*.sql` before running the seed command.

### `ECONNREFUSED` or connection timeout

PostgreSQL is not running or the `DATABASE_URL` does not point to the local database.

### Dashboard shows no documents

Run the seed command and refresh `/documents`. The dashboard reads from `rag-api`; it does not load seed files directly from disk.
