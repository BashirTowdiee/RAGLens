---
title: "Product Design"
description: "Product design decisions and interaction model for RAGLens."
order: 4
section: "Product"
status: "stable"
---
# Product Design: RAGLens

## 1. Product design goal

RAGLens should feel like an engineering tool for building and debugging production RAG systems.

The product should help users answer five questions quickly:

```text
1. What documents are indexed?
2. What did the RAG system retrieve?
3. Why did it generate this answer?
4. Did the answer pass evaluation?
5. Did a recent change improve or regress quality?
```

The dashboard should not be a generic chatbot UI. The main value is **inspection, evidence, evaluation, and comparison**.

---

# 2. Design principles

## 2.1 Evidence first

Every answer should visually connect back to source chunks.

The UI should always make it easy to see:

```text
- generated answer
- citations
- cited chunks
- retrieved chunks
- expected sources
- unsupported claims
```

## 2.2 Debuggability over polish

The MVP should prioritise useful inspection over fancy visuals.

Useful:

```text
- clear tables
- structured metadata
- trace panels
- source previews
- pass/fail status
- score breakdowns
```

Less important for MVP:

```text
- advanced animations
- complex charts
- custom visualisations
- drag-and-drop workflow builders
```

## 2.3 Show the system’s reasoning artefacts, not hidden model reasoning

The UI should show operational artefacts:

```text
- retrieved chunks
- prompt version
- RAG config
- model
- provider
- judge scores
- evaluator notes
- unsupported claims
```

It should not claim to show hidden model reasoning.

## 2.4 Make failures actionable

A failed case should not just say “failed”.

It should say:

```text
Failure type:
  retrieval_miss

Why:
  Expected source was not retrieved in top 10.

Suggested next investigation:
  Check metadata filters, chunking, or retrieval mode.
```

## 2.5 Optimise for side-by-side comparison

The product should make it easy to compare:

```text
- expected answer vs generated answer
- expected sources vs retrieved sources
- run A vs run B
- vector retrieval vs hybrid retrieval
- prompt v1 vs prompt v2
```

---

# 3. Product information architecture

## Primary navigation

```text
Dashboard
Documents
Queries
Eval Datasets
Eval Runs
Comparisons
RAG Configs
Settings
```

## MVP navigation

For the first version, keep it smaller:

```text
Documents
Queries
Eval Runs
Datasets
Comparisons
Settings
```

## Page hierarchy

```text
Documents
  Document List
  Document Detail
  Chunk Detail

Queries
  Query Trace List
  Query Trace Detail

Datasets
  Dataset List
  Dataset Detail
  Test Case Detail

Eval Runs
  Eval Run List
  Eval Run Detail
  Eval Case Result Detail

Comparisons
  Run Comparison List
  Run Comparison Detail

Settings
  Providers
  Prompt Versions
  RAG Configs
  Thresholds
```

---

# 4. Core user flows

## Flow 1: Ingest documents

### Goal

User adds documents to the RAG system.

### Flow

```text
Documents
  -> Add Document
  -> Enter title, document type, content, metadata
  -> Submit
  -> System chunks and embeds content
  -> User sees indexed document
  -> User can inspect chunks
```

### MVP behaviour

For MVP, document ingestion can be simple:

```text
- paste markdown/text into a form
- upload .md or .txt
- seed sample corpus through script
```

### Success state

```text
Document indexed successfully.
12 chunks created.
Embeddings generated.
```

### Failure states

```text
- Empty document
- Unsupported document type
- Embedding provider failed
- Database write failed
```

---

## Flow 2: Ask a question and inspect trace

### Goal

User asks a question and understands how the answer was produced.

### Flow

```text
Queries
  -> New Query
  -> Enter question
  -> Select RAG config
  -> Submit
  -> View answer
  -> Inspect citations
  -> Open trace details
```

### Key UI outcome

The user should be able to see:

```text
- answer
- citations
- retrieved chunks
- chunk scores
- model/provider
- prompt version
- latency
- cost
```

---

## Flow 3: Create an evaluation dataset

### Goal

User defines expected behaviour using golden test cases.

### Flow

```text
Datasets
  -> Create Dataset
  -> Add metadata
  -> Add Test Cases
  -> Define expected answer and expected sources
  -> Save
```

### Test case fields

```text
Question
Expected answer
Expected sources
Tags
Type
Difficulty
No-answer expected: yes/no
```

---

## Flow 4: Run evaluation

### Goal

User runs golden test cases against a RAG config.

### Flow

```text
Eval Runs
  -> New Eval Run
  -> Select dataset
  -> Select RAG config
  -> Select thresholds
  -> Start run
  -> Watch progress
  -> View summary
  -> Inspect failed cases
```

### Eval run lifecycle

```text
queued
running
completed
partially_failed
failed
```

---

## Flow 5: Inspect failed case

### Goal

User understands exactly why a test case failed.

### Flow

```text
Eval Run Detail
  -> Click failed case
  -> View expected vs generated answer
  -> View expected vs retrieved sources
  -> View citations
  -> View judge scores
  -> View unsupported claims
  -> View underlying query trace
```

### Failure categories

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

---

## Flow 6: Compare two runs

### Goal

User sees whether a system change improved or regressed quality.

### Flow

```text
Comparisons
  -> New Comparison
  -> Select baseline run
  -> Select candidate run
  -> View metric deltas
  -> Review improved cases
  -> Review regressed cases
```

### Comparison dimensions

```text
Pass rate
Hit@5
Recall@10
Groundedness
Correctness
Completeness
Citation validity
Citation support
Average latency
Estimated cost
```

---

# 5. Dashboard overview page

## Purpose

Give a fast health summary of the RAG system and recent eval quality.

## Sections

```text
1. System summary
2. Recent eval runs
3. Quality trend
4. Recent failed cases
5. Cost and latency summary
```

## MVP layout

```text
┌─────────────────────────────────────────────────────────┐
│ RAGLens                                                │
│ Evaluation and observability for production RAG systems │
└─────────────────────────────────────────────────────────┘

┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ Documents   │ │ Chunks      │ │ Eval Runs   │ │ Avg Pass    │
│ 10          │ │ 128         │ │ 6           │ │ 84%         │
└─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘

┌──────────────────────────────┐ ┌──────────────────────────────┐
│ Recent Eval Runs             │ │ Recent Failed Cases           │
│ dataset / config / pass rate │ │ failure type / question       │
└──────────────────────────────┘ └──────────────────────────────┘

┌──────────────────────────────┐ ┌──────────────────────────────┐
│ Cost Summary                 │ │ Latency Summary               │
│ estimated cost by run        │ │ average / p95 latency         │
└──────────────────────────────┘ └──────────────────────────────┘
```

## Metrics to show

```text
Total documents
Total chunks
Latest eval pass rate
Average groundedness
Average citation support
Average latency
Estimated eval cost
Failed cases in latest run
```

---

# 6. Documents design

## 6.1 Documents list page

### Purpose

Show what knowledge has been indexed.

### Table columns

```text
Title
Type
Status
Chunks
Version
Tags
Created
Updated
Actions
```

### Status values

```text
pending
indexing
indexed
failed
```

### Actions

```text
View
Re-index
Delete
```

## Example

```text
┌────────────────────────────┬──────────┬─────────┬────────┬─────────┐
│ Title                      │ Type     │ Status  │ Chunks │ Version │
├────────────────────────────┼──────────┼─────────┼────────┼─────────┤
│ Remote Work Policy v2      │ markdown │ indexed │ 12     │ v2      │
│ Incident Response Runbook  │ markdown │ indexed │ 18     │ v1      │
│ Expense Policy             │ markdown │ indexed │ 9      │ v1      │
└────────────────────────────┴──────────┴─────────┴────────┴─────────┘
```

---

## 6.2 Document detail page

### Purpose

Inspect document metadata and chunks.

### Sections

```text
Header
  title
  document type
  status
  version
  chunk count

Metadata
  source URI
  tags
  department
  checksum

Chunks
  chunk index
  token count
  preview
  embedding status
```

### Chunk table

```text
Chunk #
Token Count
Section
Preview
Actions
```

### Chunk detail drawer

When opening a chunk:

```text
- full chunk text
- document title
- chunk ID
- metadata
- token count
- created date
```

---

# 7. Query trace design

## 7.1 Query trace list page

### Purpose

Show recent RAG queries and make traces easy to open.

### Table columns

```text
Question
Model
Provider
RAG Config
Citations
Latency
Cost
Created
```

### Filters

```text
Provider
Model
RAG config
Has citations
Date range
Min latency
```

---

## 7.2 Query trace detail page

This is one of the most important screens.

### Page structure

```text
Header
  question
  trace ID
  status
  created date

Summary cards
  model
  provider
  prompt version
  latency
  cost
  token usage

Main content
  answer
  citations
  retrieved chunks
  prompt metadata
  provider call details
```

## Layout

```text
┌────────────────────────────────────────────────────────────┐
│ Question                                                   │
│ What is the remote work approval process?                  │
│ Trace: trace_abc                                           │
└────────────────────────────────────────────────────────────┘

┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐
│ Model      │ │ Latency    │ │ Cost       │ │ Citations  │
│ gpt-4.1    │ │ 1840ms     │ │ $0.008     │ │ 2          │
└────────────┘ └────────────┘ └────────────┘ └────────────┘

┌───────────────────────────────┐ ┌─────────────────────────────┐
│ Generated Answer              │ │ Citations                   │
│ Remote work longer than...    │ │ [1] Remote Work Policy v2   │
└───────────────────────────────┘ └─────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│ Retrieved Chunks                                           │
│ Rank | Score | Document | Preview                          │
└────────────────────────────────────────────────────────────┘
```

---

## Retrieved chunks panel

Each chunk card should show:

```text
Rank
Score
Document title
Chunk ID
Was used in final context
Preview
Open full text
```

Example:

```text
#1  Score: 0.91
Remote Work Policy v2
Chunk: chunk_123
Used in context: yes

"Remote work longer than two consecutive weeks requires manager approval..."
```

---

## Citations panel

Each citation should show:

```text
Citation number
Document title
Chunk ID
Section
Supported claim if available
Open source chunk
```

MVP citation support can be shown after eval scoring.

---

# 8. Dataset design

## 8.1 Dataset list page

### Purpose

Show available evaluation datasets.

### Table columns

```text
Name
Version
Test Cases
Created
Last Run
Actions
```

### Actions

```text
View
Run Eval
Duplicate
Delete
```

---

## 8.2 Dataset detail page

### Purpose

Manage golden test cases.

### Sections

```text
Dataset summary
Test case list
Create test case button
```

### Test case table columns

```text
Question
Type
Difficulty
Expected Sources
Tags
Actions
```

### Test case types

```text
factual
comparison
temporal
multi-hop
summarisation
no-answer
citation-sensitive
```

---

## 8.3 Test case detail page

### Purpose

Inspect or edit expected behaviour.

### Fields

```text
Question
Expected answer
Expected sources
Tags
Type
Difficulty
No-answer expected
Notes
```

### Layout

```text
┌────────────────────────────────────────────────────────────┐
│ Question                                                   │
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

# 9. Eval run design

## 9.1 Eval run list page

### Purpose

Show evaluation history.

### Table columns

```text
Run
Dataset
RAG Config
Status
Pass Rate
Groundedness
Citation Support
Hit@5
Cost
Latency
Created
```

### Status badges

```text
queued
running
completed
partially failed
failed
```

### Filters

```text
Dataset
RAG config
Status
Date range
Minimum pass rate
```

---

## 9.2 New eval run page

### Purpose

Start an evaluation run.

### Form fields

```text
Dataset
RAG Config
Judge enabled
Threshold preset
Max test cases
Notes
```

### Threshold config

```text
Minimum hit@5
Minimum citation validity
Minimum groundedness
Minimum correctness
Maximum average latency
Maximum estimated cost
```

### MVP simplification

Use presets first:

```text
Strict
Balanced
Exploratory
```

Example:

```text
Balanced:
  minHitAt5: 0.80
  minCitationValidity: 0.95
  minGroundedness: 0.85
  maxAverageLatencyMs: 5000
```

---

## 9.3 Eval run detail page

This is the main quality dashboard.

### Header

```text
Eval Run: run_123
Dataset: Company Knowledge Base Eval v1
RAG Config: vector-default
Status: completed
```

### Summary cards

```text
Pass Rate
Hit@5
Recall@10
Groundedness
Citation Support
Average Latency
Estimated Cost
```

### Case results table

Columns:

```text
Question
Type
Verdict
Failure Type
Hit@5
Citation Validity
Groundedness
Cost
Latency
Actions
```

### Layout

```text
┌────────────────────────────────────────────────────────────┐
│ Eval Run: Company KB Eval v1                               │
│ Config: vector-default | Status: completed                 │
└────────────────────────────────────────────────────────────┘

┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐
│ Pass Rate  │ │ Hit@5      │ │ Grounded   │ │ Cost       │
│ 84%        │ │ 88%        │ │ 0.87       │ │ $0.18      │
└────────────┘ └────────────┘ └────────────┘ └────────────┘

┌────────────────────────────────────────────────────────────┐
│ Failed Cases                                               │
│ Question | Failure Type | Scores | Actions                 │
└────────────────────────────────────────────────────────────┘
```

---

# 10. Failed case detail design

This is the most important product screen.

## Purpose

Help the engineer understand exactly why a case failed.

## Page sections

```text
1. Verdict summary
2. Question
3. Expected answer vs generated answer
4. Expected sources vs retrieved sources
5. Citation analysis
6. Judge analysis
7. Underlying trace
8. Suggested investigation
```

## Layout

```text
┌────────────────────────────────────────────────────────────┐
│ Verdict: Failed                                            │
│ Failure Type: Retrieval Miss                               │
│ Test Case: What is the remote work approval process?       │
└────────────────────────────────────────────────────────────┘

┌──────────────────────────────┐ ┌──────────────────────────────┐
│ Expected Answer              │ │ Generated Answer             │
│ Remote work longer than...   │ │ Employees may work remotely...│
└──────────────────────────────┘ └──────────────────────────────┘

┌──────────────────────────────┐ ┌──────────────────────────────┐
│ Expected Sources             │ │ Retrieved Sources            │
│ Remote Work Policy v2        │ │ Remote Work Policy v1        │
│                              │ │ Onboarding Policy            │
└──────────────────────────────┘ └──────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│ Citation Analysis                                           │
│ citation_validity: 1.0                                      │
│ citation_support: 0.42                                      │
│ Problem: citation points to stale policy version             │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│ Judge Notes                                                 │
│ Unsupported claims: ...                                     │
│ Missing points: ...                                         │
└────────────────────────────────────────────────────────────┘
```

---

## Failure summary component

Show a clear diagnostic label.

Example:

```text
Failure type:
  retrieval_miss

Primary issue:
  Expected source "Remote Work Policy v2" was not retrieved in top 10.

Impact:
  Answer was generated from stale or incomplete context.

Next investigation:
  Check metadata filtering, document versioning, or retrieval scoring.
```

---

# 11. Run comparison design

## Purpose

Show whether a change improved or regressed quality.

## Comparison setup

User selects:

```text
Baseline run
Candidate run
```

Example:

```text
Baseline:
  vector-default, prompt answer-v1

Candidate:
  hybrid-default, prompt answer-v2
```

## Comparison summary

```text
Metric                 Baseline     Candidate     Delta
Pass Rate              78%          86%           +8%
Hit@5                  80%          91%           +11%
Groundedness           0.82         0.89          +0.07
Citation Support       0.76         0.84          +0.08
Avg Latency            1.9s         2.7s          +0.8s
Estimated Cost         $0.12        $0.18         +$0.06
```

## Sections

```text
Summary deltas
Improved cases
Regressed cases
Unchanged failures
Cost/latency impact
Configuration difference
```

## Improved/regressed cases table

Columns:

```text
Question
Baseline Verdict
Candidate Verdict
Metric Change
Failure Type
Open
```

---

# 12. RAG config design

## Purpose

Let users compare different RAG settings.

## RAG config fields

```text
Name
Provider
Model
Embedding model
Retrieval mode
Top K
Chunk size
Chunk overlap
Prompt version
Reranker enabled
Metadata filters
```

## MVP config page

For MVP, configs can be seeded and read-only.

Later, allow editing.

Example configs:

```text
vector-default
vector-topk-12
hybrid-default
prompt-v2
cheap-model
quality-model
```

---

# 13. Settings design

## Provider settings

Show configured providers without exposing secrets.

Fields:

```text
Provider
Status
Models
Default model
Default embedding model
```

Example:

```text
OpenAI
Status: configured
Default chat model: gpt-4.1-mini
Default embedding model: text-embedding-3-small
```

## Prompt versions

Show:

```text
Prompt name
Version
Created date
Used in runs
```

MVP can be read-only.

## Thresholds

Show presets:

```text
Exploratory
Balanced
Strict
```

Each preset includes:

```text
minHitAt5
minCitationValidity
minGroundedness
minCorrectness
maxLatency
maxCost
```

---

# 14. Visual design direction

## Style

RAGLens should look like a serious developer tool.

Suggested style:

```text
- clean tables
- cards for summary metrics
- split-pane detail views
- monospace for IDs and trace metadata
- status badges
- compact filters
- neutral colour palette
```

## Avoid

```text
- playful chatbot aesthetic
- oversized hero sections inside the app
- excessive gradients
- AI gimmick visuals
```

## Use colour sparingly

Use colour mainly for status:

```text
green: pass / healthy
red: fail / error
yellow: warning / partial
blue: informational
grey: neutral metadata
```

---

# 15. Component system

## Core components

```text
AppShell
SidebarNav
TopBar
PageHeader
MetricCard
StatusBadge
DataTable
FilterBar
ScorePill
SourceChunkCard
CitationCard
TraceMetadataPanel
DiffPanel
EmptyState
ErrorState
LoadingState
```

## Domain components

```text
DocumentTable
ChunkPreview
QueryTraceSummary
RetrievedChunksPanel
CitationPanel
EvalRunSummary
EvalCaseResultTable
FailedCaseAnalysis
RunComparisonTable
JudgeScorePanel
```

---

# 16. Score display design

## Score pills

Use consistent score display:

```text
0.90 to 1.00: strong
0.75 to 0.89: acceptable
0.50 to 0.74: weak
below 0.50: fail
```

Example:

```text
Groundedness: 0.87
Citation Support: 0.42
Hit@5: true
```

## Verdict badge

```text
PASS
FAIL
WARNING
ERROR
```

## Failure type badge

```text
retrieval_miss
invalid_citation
unsupported_claim
incomplete_answer
provider_error
```

---

# 17. Empty states

## Documents empty state

```text
No documents indexed yet.

Add markdown or text documents to create a searchable knowledge base.
```

Action:

```text
Add document
Seed sample corpus
```

## Eval datasets empty state

```text
No evaluation datasets yet.

Create a golden dataset to measure retrieval, citation, and answer quality.
```

Action:

```text
Create dataset
Seed sample dataset
```

## Eval runs empty state

```text
No eval runs yet.

Run a dataset against a RAG config to measure quality.
```

Action:

```text
Start eval run
```

---

# 18. Error states

## Provider failure

```text
The model provider returned an error.

Provider:
OpenAI

Operation:
answer_generation

Suggested action:
Check API key, provider status, or retry the request.
```

## Embedding failure

```text
Embedding generation failed.

The document was stored, but chunks were not indexed.
```

## Eval partial failure

```text
Eval run partially failed.

18 of 20 cases completed.
2 cases failed due to provider timeout.
```

Action:

```text
Retry failed cases
```

Retry can be post-MVP.

---

# 19. Loading states

## Query loading

Show stages:

```text
Embedding question
Retrieving chunks
Generating answer
Saving trace
```

## Eval run loading

Show progress:

```text
Running case 7 of 20
Completed: 6
Failed: 0
Estimated cost so far: $0.04
```

MVP can show simple progress.

---

# 20. MVP product design scope

## Must design and build

```text
Documents list
Document detail
Query trace list
Query trace detail
Dataset list
Dataset detail
Eval run list
Eval run detail
Eval case result detail
Run comparison detail
Settings overview
```

## Can be minimal

```text
New document form
New dataset form
New test case form
New eval run form
```

## Can be deferred

```text
Advanced charts
Manual review workflow
Prompt editor UI
RAG config editor UI
Provider secret management UI
Retry failed cases UI
Document re-index workflow
```

---

# 21. MVP screen priority

Build in this order:

```text
1. Query trace detail
2. Eval run detail
3. Failed case detail
4. Documents list/detail
5. Dataset list/detail
6. Run comparison
7. Dashboard overview
8. Settings
```

Reason:

```text
The core value is trace and failure inspection.
```

A beautiful dashboard overview is less important than being able to explain a failed answer.

---

# 22. Demo path design

The demo should tell a story.

## Demo flow

```text
1. Open Documents page.
2. Show sample company knowledge base is indexed.
3. Ask a question.
4. Show cited answer.
5. Open query trace.
6. Show retrieved chunks and citations.
7. Open Eval Runs.
8. Show latest run summary.
9. Open failed case.
10. Explain failure.
11. Open comparison.
12. Show prompt/retrieval change improved quality.
```

## Demo narrative

```text
This is not just a RAG chatbot. Every answer is traceable. Every trace can be evaluated. Every change can be compared.
```

---

# 23. Example sample dataset for design

## Documents

```text
Remote Work Policy v1
Remote Work Policy v2
Expense Policy
Onboarding Policy
Mobile Release Process
Incident Response Runbook
API Integration Guide
Customer Refund Policy
Escalation Process
Known Issues
```

## Eval questions

```text
What is the remote work approval process?
What changed between remote work policy v1 and v2?
What is the rollback process after a failed mobile release?
Who should be notified during a severity one incident?
Does the company allow unlimited overseas remote work?
What evidence supports the refund escalation process?
```

These give the UI meaningful examples for:

```text
- normal pass
- retrieval miss
- stale source issue
- no-answer case
- citation failure
- multi-hop answer
```

---

# 24. Screen-by-screen MVP acceptance criteria

## Documents list

```text
- Shows indexed documents.
- Shows status and chunk count.
- User can open document detail.
```

## Document detail

```text
- Shows metadata.
- Shows chunks.
- User can open chunk preview.
```

## Query trace detail

```text
- Shows question and answer.
- Shows citations.
- Shows retrieved chunks.
- Shows model/provider/prompt version.
- Shows cost and latency.
```

## Dataset detail

```text
- Shows test cases.
- Shows expected answer and sources.
- Shows type and difficulty.
```

## Eval run detail

```text
- Shows summary metrics.
- Shows case results.
- Failed cases are obvious.
- User can open failed case.
```

## Failed case detail

```text
- Shows expected vs generated answer.
- Shows expected vs retrieved sources.
- Shows citation analysis.
- Shows judge notes.
- Shows underlying trace link.
```

## Comparison detail

```text
- Shows baseline vs candidate.
- Shows metric deltas.
- Shows improved and regressed cases.
```

---

# 25. Product design summary

RAGLens should be designed as a **RAG quality control centre**.

The central user experience is not chatting. It is inspecting and improving.

The most important screens are:

```text
1. Query trace detail
2. Eval run detail
3. Failed case detail
4. Run comparison
```

The product should make this obvious:

```text
The answer is not the product.
The ability to prove, inspect, and improve the answer is the product.
```
