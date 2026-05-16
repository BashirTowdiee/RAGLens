---
title: "UX Dashboard Design"
description: "UX and dashboard design guidance for the RAGLens interface."
order: 5
section: "Design"
status: "stable"
---
# UX / Dashboard Design: RAGLens

## 1. Dashboard purpose

The RAGLens dashboard is not a chatbot interface.

It is a **RAG quality control dashboard** for:

```text
- inspecting indexed documents
- reviewing query traces
- understanding retrieved context
- checking citations
- running evaluations
- inspecting failed cases
- comparing RAG configurations
- monitoring cost and latency
```

The core UX goal:

```text
A user should be able to explain why a RAG answer passed or failed within 30 seconds of opening the result.
```

---

# 2. Primary user journeys

## Journey 1: Inspect a RAG answer

```text
Queries
  -> open query trace
  -> review answer
  -> inspect citations
  -> inspect retrieved chunks
  -> check model, prompt, cost, latency
```

User question:

```text
Why did the system answer this way?
```

---

## Journey 2: Run an evaluation

```text
Eval Runs
  -> New Eval Run
  -> select dataset
  -> select RAG config
  -> select thresholds
  -> run
  -> view results
```

User question:

```text
Is this RAG configuration good enough?
```

---

## Journey 3: Debug a failed case

```text
Eval Run Detail
  -> failed case
  -> expected vs generated answer
  -> expected sources vs retrieved sources
  -> citation analysis
  -> judge notes
  -> trace link
```

User question:

```text
Was this a retrieval issue, citation issue, or answer generation issue?
```

---

## Journey 4: Compare two runs

```text
Comparisons
  -> select baseline run
  -> select candidate run
  -> compare metrics
  -> inspect regressed cases
```

User question:

```text
Did the change improve or degrade quality?
```

---

# 3. Information architecture

## MVP sidebar

```text
Overview
Documents
Queries
Datasets
Eval Runs
Comparisons
Configs
Settings
```

## Suggested route structure

```text
/
  overview

/documents
/documents/:documentId
/documents/:documentId/chunks/:chunkId

/queries
/queries/:traceId

/datasets
/datasets/:datasetId
/datasets/:datasetId/test-cases/:testCaseId

/eval-runs
/eval-runs/new
/eval-runs/:evalRunId
/eval-runs/:evalRunId/results/:caseResultId

/comparisons
/comparisons/new
/comparisons/:comparisonId

/configs
/configs/:ragConfigId

/settings
```

---

# 4. App shell

## Layout

```text
┌─────────────────────────────────────────────────────────────┐
│ Top bar                                                     │
├───────────────┬─────────────────────────────────────────────┤
│ Sidebar       │ Page content                                │
│               │                                             │
│ Overview      │                                             │
│ Documents     │                                             │
│ Queries       │                                             │
│ Datasets      │                                             │
│ Eval Runs     │                                             │
│ Comparisons   │                                             │
│ Configs       │                                             │
│ Settings      │                                             │
└───────────────┴─────────────────────────────────────────────┘
```

## Top bar contents

```text
- product name: RAGLens
- environment badge: local / staging / production
- provider status
- global search
- current workspace, later
```

## Sidebar rules

Keep it boring and obvious.

```text
- Use text labels
- Avoid nested navigation for MVP
- Highlight active route
- Keep primary flows one click away
```

---

# 5. Overview page

## Purpose

Give a quick system health and quality snapshot.

## Key questions answered

```text
- How many documents are indexed?
- What was the latest eval result?
- Are there recent failures?
- What is the current cost and latency profile?
```

## Layout

```text
┌────────────────────────────────────────────────────────────┐
│ Overview                                                   │
│ Production-style RAG evaluation and observability          │
└────────────────────────────────────────────────────────────┘

┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐
│ Documents  │ │ Chunks     │ │ Eval Runs  │ │ Latest Pass│
│ 10         │ │ 142        │ │ 8          │ │ 84%        │
└────────────┘ └────────────┘ └────────────┘ └────────────┘

┌─────────────────────────────┐ ┌─────────────────────────────┐
│ Latest Eval Run             │ │ Recent Failed Cases          │
│ pass rate, scores, config   │ │ question, failure type       │
└─────────────────────────────┘ └─────────────────────────────┘

┌─────────────────────────────┐ ┌─────────────────────────────┐
│ Cost Summary                │ │ Latency Summary              │
│ last run cost               │ │ avg / p95                    │
└─────────────────────────────┘ └─────────────────────────────┘
```

## MVP widgets

### Metric cards

```text
Documents indexed
Chunks indexed
Latest eval pass rate
Average groundedness
Average citation support
Average latency
Estimated eval cost
```

### Latest eval run card

```text
Dataset: Company Knowledge Base Eval v1
Config: vector-default
Status: completed
Pass rate: 84%
Failed cases: 4 / 25
```

### Recent failed cases

```text
Question
Failure type
Run
Action: Open
```

---

# 6. Documents UX

## 6.1 Documents list

## Purpose

Show what the RAG system can search.

## Page layout

```text
┌────────────────────────────────────────────────────────────┐
│ Documents                                      Add Document│
│ Indexed source material used by the RAG API                │
└────────────────────────────────────────────────────────────┘

[Search documents...] [Type filter] [Status filter]

┌────────────────────────────────────────────────────────────┐
│ Title | Type | Status | Chunks | Version | Updated | Action│
└────────────────────────────────────────────────────────────┘
```

## Table columns

```text
Title
Document type
Status
Chunk count
Version
Tags
Updated
Actions
```

## Statuses

```text
indexed
indexing
failed
pending
```

## Row actions

```text
View
Re-index, post-MVP
Delete, post-MVP
```

---

## 6.2 Add document

## MVP options

Support two options:

```text
- paste markdown/text
- upload .md or .txt
```

## Form fields

```text
Title
Document type
Content
Metadata JSON, optional
Tags, optional
Version, optional
```

## Submit behaviour

After submit:

```text
1. validate input
2. create document
3. chunk document
4. generate embeddings
5. index document
6. show success state
```

## Success message

```text
Document indexed.
12 chunks created.
```

## Error examples

```text
Document content is empty.
Unsupported document type.
Embedding provider failed.
```

---

## 6.3 Document detail

## Purpose

Inspect document metadata and chunks.

## Layout

```text
┌────────────────────────────────────────────────────────────┐
│ Remote Work Policy v2                                     │
│ markdown | indexed | 12 chunks | version v2               │
└────────────────────────────────────────────────────────────┘

┌─────────────────────────────┐ ┌─────────────────────────────┐
│ Metadata                    │ │ Indexing Summary             │
│ department, tags, checksum  │ │ chunk count, token count      │
└─────────────────────────────┘ └─────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│ Chunks                                                     │
│ # | Section | Tokens | Preview | Action                    │
└────────────────────────────────────────────────────────────┘
```

## Chunk preview drawer

When user clicks a chunk:

```text
- chunk ID
- document title
- section
- token count
- full text
- metadata
```

---

# 7. Queries UX

## 7.1 Query trace list

## Purpose

Browse historical questions and open traces.

## Layout

```text
┌────────────────────────────────────────────────────────────┐
│ Query Traces                                      New Query│
│ Inspect how answers were generated                         │
└────────────────────────────────────────────────────────────┘

[Search question...] [Provider] [Model] [Config] [Date]

┌────────────────────────────────────────────────────────────┐
│ Question | Model | Config | Citations | Latency | Cost     │
└────────────────────────────────────────────────────────────┘
```

## Table columns

```text
Question
Provider
Model
RAG config
Citation count
Latency
Estimated cost
Created
Action
```

---

## 7.2 New query

## Purpose

Let user run a one-off query.

## Form

```text
Question
RAG config
Top K override, optional post-MVP
Prompt version override, optional post-MVP
```

## Result layout

After submission, route to trace detail:

```text
/queries/:traceId
```

This keeps the product trace-first.

---

## 7.3 Query trace detail

This is a core screen.

## Purpose

Show exactly how an answer was produced.

## Layout

```text
┌────────────────────────────────────────────────────────────┐
│ Query Trace                                                │
│ What is the remote work approval process?                  │
│ trace_abc | created 2026-05-17 10:42                      │
└────────────────────────────────────────────────────────────┘

┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐
│ Provider   │ │ Model      │ │ Latency    │ │ Cost       │
│ OpenAI     │ │ gpt-4.1    │ │ 1840ms     │ │ $0.008     │
└────────────┘ └────────────┘ └────────────┘ └────────────┘

┌──────────────────────────────┐ ┌──────────────────────────────┐
│ Generated Answer             │ │ Citations                    │
│ ...                          │ │ [1] Remote Work Policy v2    │
└──────────────────────────────┘ └──────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│ Retrieved Chunks                                           │
│ rank, score, document, preview                             │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│ Trace Metadata                                             │
│ prompt version, config, token usage                        │
└────────────────────────────────────────────────────────────┘
```

## Sections

### A. Summary cards

```text
Provider
Model
Prompt version
RAG config
Latency
Estimated cost
Input tokens
Output tokens
```

### B. Generated answer

Show answer in a readable card.

```text
Remote work longer than two consecutive weeks requires manager approval...
```

### C. Citations

Each citation card:

```text
[1] Remote Work Policy v2
Chunk: chunk_123
Section: Approval process
Open source chunk
```

### D. Retrieved chunks

Each chunk card:

```text
Rank: #1
Score: 0.91
Document: Remote Work Policy v2
Chunk: chunk_123
Used in final context: yes

Preview:
"Remote work longer than two consecutive weeks requires manager approval..."
```

### E. Prompt metadata

For MVP, do not show the full prompt by default. Show metadata first.

```text
Prompt version: answer-v1
Context chunks used: 8
Retrieval mode: vector
Top K: 8
```

Post-MVP:

```text
Show prompt
Copy prompt
```

---

# 8. Datasets UX

## 8.1 Dataset list

## Purpose

Manage golden evaluation datasets.

## Layout

```text
┌────────────────────────────────────────────────────────────┐
│ Evaluation Datasets                             New Dataset│
│ Golden test cases used to measure RAG quality              │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│ Name | Version | Test Cases | Last Run | Created | Action  │
└────────────────────────────────────────────────────────────┘
```

## Columns

```text
Name
Version
Description
Test case count
Last run
Created
Actions
```

---

## 8.2 Dataset detail

## Purpose

Show and manage test cases.

## Layout

```text
┌────────────────────────────────────────────────────────────┐
│ Company Knowledge Base Eval v1                  Add Case   │
│ 25 test cases | policy, engineering, support               │
└────────────────────────────────────────────────────────────┘

[Type filter] [Difficulty] [Tag] [Search question]

┌────────────────────────────────────────────────────────────┐
│ Question | Type | Difficulty | Expected Sources | Actions  │
└────────────────────────────────────────────────────────────┘
```

## Test case types

```text
factual
comparison
temporal
multi-hop
no-answer
citation-sensitive
summarisation
```

---

## 8.3 Test case detail

## Purpose

Inspect expected behaviour.

## Layout

```text
┌────────────────────────────────────────────────────────────┐
│ Test Case                                                  │
│ What is the remote work approval process?                  │
└────────────────────────────────────────────────────────────┘

┌──────────────────────────────┐ ┌──────────────────────────────┐
│ Expected Answer              │ │ Expected Sources             │
│ Remote work longer than...   │ │ Remote Work Policy v2        │
└──────────────────────────────┘ └──────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│ Metadata                                                   │
│ Type: factual | Difficulty: easy | Tags: policy, remote    │
└────────────────────────────────────────────────────────────┘
```

---

# 9. Eval Runs UX

## 9.1 Eval run list

## Purpose

Show all quality runs.

## Layout

```text
┌────────────────────────────────────────────────────────────┐
│ Eval Runs                                      New Eval Run│
│ Run golden datasets against RAG configurations             │
└────────────────────────────────────────────────────────────┘

[Dataset] [Config] [Status] [Date]

┌────────────────────────────────────────────────────────────┐
│ Run | Dataset | Config | Status | Pass | Grounded | Cost   │
└────────────────────────────────────────────────────────────┘
```

## Columns

```text
Run ID / name
Dataset
RAG config
Status
Pass rate
Hit@5
Groundedness
Citation support
Average latency
Estimated cost
Created
Action
```

---

## 9.2 New eval run

## Purpose

Start evaluation against a selected config.

## Form

```text
Dataset
RAG config
Judge enabled
Threshold preset
Max cases, optional
Notes, optional
```

## Threshold presets

### Exploratory

```text
No hard failure.
Collect metrics only.
```

### Balanced

```text
minHitAt5: 0.80
minCitationValidity: 0.95
minGroundedness: 0.85
maxAverageLatencyMs: 5000
```

### Strict

```text
minHitAt5: 0.90
minCitationValidity: 1.00
minGroundedness: 0.90
minCorrectness: 0.90
maxAverageLatencyMs: 4000
```

## Start run behaviour

```text
1. create eval run
2. route to eval run detail
3. show running progress
```

---

## 9.3 Eval run detail

This is the main evaluation dashboard.

## Purpose

Summarise quality and identify failures.

## Layout

```text
┌────────────────────────────────────────────────────────────┐
│ Eval Run                                                   │
│ Company KB Eval v1 | vector-default | completed            │
└────────────────────────────────────────────────────────────┘

┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐
│ Pass Rate  │ │ Hit@5      │ │ Grounded   │ │ Citation   │
│ 84%        │ │ 88%        │ │ 0.87       │ │ 0.91       │
└────────────┘ └────────────┘ └────────────┘ └────────────┘

┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐
│ Cost       │ │ Avg Latency│ │ Cases      │ │ Failures   │
│ $0.18      │ │ 2100ms     │ │ 25         │ │ 4          │
└────────────┘ └────────────┘ └────────────┘ └────────────┘

┌────────────────────────────────────────────────────────────┐
│ Case Results                                               │
│ question, type, verdict, failure, scores, action           │
└────────────────────────────────────────────────────────────┘
```

## Summary cards

```text
Pass rate
Cases passed
Cases failed
Hit@5
Recall@10
Average groundedness
Average correctness
Average citation support
Average latency
Estimated cost
```

## Case result table columns

```text
Question
Type
Verdict
Failure type
Hit@5
Groundedness
Citation support
Latency
Cost
Action
```

## Filters

```text
Verdict
Failure type
Test type
Tag
Difficulty
```

---

# 10. Failed Case Detail UX

This is the highest-value screen.

## Purpose

Diagnose why a case failed.

## Layout

```text
┌────────────────────────────────────────────────────────────┐
│ Failed Case                                                │
│ Failure type: retrieval_miss                              │
│ Verdict: fail                                              │
└────────────────────────────────────────────────────────────┘

┌──────────────────────────────┐ ┌──────────────────────────────┐
│ Question                     │ │ Scores                       │
│ What is the remote work...   │ │ hit@5 false, grounded 0.42   │
└──────────────────────────────┘ └──────────────────────────────┘

┌──────────────────────────────┐ ┌──────────────────────────────┐
│ Expected Answer              │ │ Generated Answer             │
│ ...                          │ │ ...                          │
└──────────────────────────────┘ └──────────────────────────────┘

┌──────────────────────────────┐ ┌──────────────────────────────┐
│ Expected Sources             │ │ Retrieved Sources            │
│ Remote Work Policy v2        │ │ Remote Work Policy v1        │
└──────────────────────────────┘ └──────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│ Citation Analysis                                           │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│ Judge Notes                                                 │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│ Underlying Trace                                            │
│ Open query trace                                            │
└────────────────────────────────────────────────────────────┘
```

## Top diagnostic summary

Example:

```text
Primary failure:
Expected source was not retrieved.

Impact:
The generated answer used stale context from Remote Work Policy v1.

Suggested investigation:
Check retrieval config, metadata filters, document versioning, or chunk content.
```

## Expected vs generated answer

Use side-by-side panels.

```text
Expected answer:
Remote work longer than two consecutive weeks requires manager approval.

Generated answer:
Employees may work remotely with team approval where practical.
```

## Expected vs retrieved sources

```text
Expected:
- Remote Work Policy v2, Approval process

Retrieved:
- Remote Work Policy v1, General remote work
- Onboarding Policy, Work setup
- Expense Policy, Travel expenses
```

## Citation analysis

Show:

```text
citation_present: true
citation_validity: 1.0
citation_traceability: 1.0
citation_support: 0.42
```

Plain-English summary:

```text
The citation points to a real retrieved chunk, but the chunk does not support the main claim.
```

## Judge notes

Show:

```text
Unsupported claims
Missing important points
Evaluator explanation
Judge prompt version
```

Example:

```text
Unsupported claims:
- "team approval is sufficient"

Missing important points:
- manager approval required for remote work longer than two consecutive weeks
```

---

# 11. Comparisons UX

## 11.1 Comparison list

## Purpose

Show saved run comparisons.

Columns:

```text
Baseline run
Candidate run
Dataset
Pass rate delta
Cost delta
Created
Action
```

---

## 11.2 New comparison

Form:

```text
Baseline eval run
Candidate eval run
```

Validation:

```text
- runs should use same dataset
- warn if datasets differ
```

---

## 11.3 Comparison detail

## Purpose

Explain whether a change helped or hurt.

## Layout

```text
┌────────────────────────────────────────────────────────────┐
│ Run Comparison                                             │
│ vector-default vs hybrid-default                           │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│ Metric Deltas                                              │
└────────────────────────────────────────────────────────────┘

┌────────────────────┬──────────┬───────────┬───────────────┐
│ Metric             │ Baseline │ Candidate │ Delta         │
├────────────────────┼──────────┼───────────┼───────────────┤
│ Pass Rate          │ 78%      │ 86%       │ +8%           │
│ Hit@5              │ 80%      │ 91%       │ +11%          │
│ Groundedness       │ 0.82     │ 0.89      │ +0.07         │
│ Citation Support   │ 0.76     │ 0.84      │ +0.08         │
│ Avg Latency        │ 1.9s     │ 2.7s      │ +0.8s         │
│ Cost               │ $0.12    │ $0.18     │ +$0.06        │
└────────────────────┴──────────┴───────────┴───────────────┘

┌──────────────────────────────┐ ┌──────────────────────────────┐
│ Improved Cases               │ │ Regressed Cases              │
└──────────────────────────────┘ └──────────────────────────────┘
```

## Improved cases

```text
Failed -> Passed
Low groundedness -> acceptable groundedness
Retrieval miss -> source retrieved
```

## Regressed cases

```text
Passed -> Failed
Citation support dropped
Latency exceeded threshold
Cost exceeded threshold
```

---

# 12. Configs UX

## Purpose

Let users understand what settings produced an answer or eval result.

## MVP approach

Configs can be read-only and seeded.

## Config list columns

```text
Name
Provider
Model
Embedding model
Retrieval mode
Top K
Prompt version
Created
```

## Config detail

```text
Name: vector-default
Provider: OpenAI
Model: gpt-4.1-mini
Embedding model: text-embedding-3-small
Retrieval mode: vector
Top K: 8
Chunk size: 800
Chunk overlap: 100
Prompt version: answer-v1
```

## Post-MVP

Allow:

```text
- duplicate config
- edit config
- run eval with config
```

---

# 13. Settings UX

## Sections

```text
Providers
Prompt Versions
Threshold Presets
Environment
```

## Providers

Show provider configuration status, not secrets.

```text
OpenAI
Status: configured
Chat model: gpt-4.1-mini
Embedding model: text-embedding-3-small
```

## Prompt versions

```text
answer-v1
judge-v1
citation-check-v1
```

## Threshold presets

```text
Exploratory
Balanced
Strict
```

For each:

```text
minHitAt5
minCitationValidity
minGroundedness
maxLatency
maxCost
```

---

# 14. Component design

## Global components

```text
AppShell
Sidebar
TopBar
PageHeader
MetricCard
StatusBadge
ScoreBadge
DataTable
FilterBar
SearchInput
EmptyState
ErrorState
LoadingState
ConfirmDialog
CodeBlock
JsonViewer
```

## RAG-specific components

```text
DocumentStatusBadge
ChunkCard
ChunkPreviewDrawer
CitationCard
RetrievedChunkList
TraceMetadataPanel
ProviderCallSummary
PromptVersionBadge
```

## Eval-specific components

```text
EvalRunStatusBadge
VerdictBadge
FailureTypeBadge
ScoreBreakdown
JudgeNotesPanel
ExpectedVsActualPanel
ExpectedVsRetrievedSources
RunComparisonTable
ThresholdPresetCard
```

---

# 15. Status badge system

## Eval run status

```text
queued
running
completed
partially_failed
failed
```

## Verdict

```text
pass
fail
warning
error
```

## Failure type

```text
retrieval_miss
low_recall
invalid_citation
unsupported_claim
incomplete_answer
incorrect_answer
bad_refusal
provider_error
timeout
```

## Document status

```text
pending
indexing
indexed
failed
```

---

# 16. Score UX

## Score display rules

Use numeric score plus label.

```text
0.90 - 1.00  strong
0.75 - 0.89  acceptable
0.50 - 0.74  weak
0.00 - 0.49  fail
```

Examples:

```text
Groundedness
0.87 acceptable

Citation Support
0.42 fail

Hit@5
false fail
```

## Do not hide raw values

Always show exact score.

Avoid vague-only labels like:

```text
Good
Bad
Okay
```

---

# 17. Empty states

## Documents

```text
No documents indexed yet.

Add markdown or text documents to create a searchable knowledge base.
```

Actions:

```text
Add document
Seed sample corpus
```

## Queries

```text
No query traces yet.

Ask a question to generate a source-grounded answer and inspect its trace.
```

Action:

```text
New query
```

## Datasets

```text
No evaluation datasets yet.

Create a golden dataset to measure retrieval, citation, and answer quality.
```

Action:

```text
Create dataset
```

## Eval runs

```text
No eval runs yet.

Run a dataset against a RAG config to measure quality.
```

Action:

```text
New eval run
```

---

# 18. Error states

## Provider error

```text
Provider call failed.

Provider: OpenAI
Operation: answer generation
Error: rate_limit_exceeded

Suggested action:
Retry later, reduce concurrency, or check provider limits.
```

## Eval partial failure

```text
Eval run partially failed.

18 of 20 cases completed.
2 cases failed due to provider timeouts.
```

## Trace missing

```text
Trace not found.

This result references a trace ID that no longer exists or was not persisted correctly.
```

## Citation invalid

```text
Invalid citation.

The answer cited chunk_123, but that chunk does not exist.
```

---

# 19. Loading states

## Query trace loading

Show step-based progress if running live:

```text
Embedding query
Retrieving chunks
Generating answer
Saving trace
```

## Eval run loading

Show:

```text
Running case 7 of 25
Completed: 6
Failed: 0
Estimated cost so far: $0.04
```

For MVP, polling is enough.

---

# 20. Filtering and search

## Documents

```text
Search by title
Filter by status
Filter by type
Filter by tag
```

## Query traces

```text
Search by question
Filter by provider
Filter by model
Filter by config
Filter by date
```

## Eval runs

```text
Filter by dataset
Filter by config
Filter by status
Filter by date
```

## Eval case results

```text
Filter by verdict
Filter by failure type
Filter by test type
Filter by tag
```

---

# 21. MVP dashboard build order

Build the UX in this order:

```text
1. App shell and sidebar
2. Documents list/detail
3. Query trace detail
4. Eval run list/detail
5. Failed case detail
6. Dataset list/detail
7. New eval run form
8. Comparison detail
9. Overview
10. Settings/configs
```

Reason:

```text
The product value is trace inspection and failed-case debugging.
```

---

# 22. MVP wireframe set

A practical first wireframe set:

```text
01 App Shell
02 Documents List
03 Document Detail
04 Query Trace List
05 Query Trace Detail
06 Dataset List
07 Dataset Detail
08 Eval Run List
09 Eval Run Detail
10 Failed Case Detail
11 Comparison Detail
12 Config Detail
13 Overview
```

These are enough for a strong first dashboard.

---

# 23. Example demo script

The dashboard should support this exact demo:

```text
1. Open Overview.
2. Show 10 indexed documents and latest eval quality.
3. Open Documents.
4. Show company knowledge base documents.
5. Open Queries.
6. Ask “What is the remote work approval process?”
7. Open trace.
8. Show retrieved chunks and citations.
9. Open Eval Runs.
10. Show latest eval summary.
11. Open failed case.
12. Show expected vs generated answer.
13. Show expected vs retrieved sources.
14. Show citation support failure.
15. Open comparison.
16. Show hybrid retrieval improved pass rate but increased latency and cost.
```

This demo communicates the product clearly.

---

# 24. MVP UX acceptance criteria

## Global

```text
- User can navigate between all main sections.
- Loading, empty, and error states exist for each main page.
- Tables support basic sorting or filtering where useful.
```

## Documents

```text
- User can view indexed documents.
- User can open document detail.
- User can inspect chunks.
```

## Queries

```text
- User can view query traces.
- User can open trace detail.
- User can see answer, citations, retrieved chunks, model, cost, and latency.
```

## Datasets

```text
- User can view datasets.
- User can inspect test cases.
- User can see expected answer and expected sources.
```

## Eval runs

```text
- User can view eval runs.
- User can open eval run detail.
- User can see summary metrics and case results.
- User can filter failed cases.
```

## Failed cases

```text
- User can compare expected vs generated answer.
- User can compare expected vs retrieved sources.
- User can inspect citation and judge scores.
- User can open the underlying query trace.
```

## Comparisons

```text
- User can compare two runs.
- User can see metric deltas.
- User can see improved and regressed cases.
```

---

# 25. Final UX direction

RAGLens’s dashboard should feel like:

```text
Datadog-style trace inspection
+
CI test report
+
RAG evaluation workbench
```

Not:

```text
ChatGPT clone
```

The strongest UX is centred around these four screens:

```text
1. Query Trace Detail
2. Eval Run Detail
3. Failed Case Detail
4. Run Comparison Detail
```

Those screens prove the core product promise:

```text
Every answer is traceable.
Every trace is evaluable.
Every change is measurable.
```
