---
title: "Evaluation Methodology"
description: "Evaluation approach and metrics for RAG quality in RAGLens."
order: 10
section: "Evaluation"
status: "stable"
---
# Evaluation Methodology: RAGLens

## 1. Evaluation objective

RAGLens evaluates whether a RAG system is:

```text
- retrieving the right evidence
- generating answers grounded in that evidence
- citing sources correctly
- refusing unsupported questions
- improving or regressing across changes
- operating within cost and latency limits
```

The goal is not to produce a single “AI quality” score. The goal is to break RAG quality into inspectable failure modes.

Core principle:

```text
Do not only ask: “Was the answer good?”

Ask:
- Did retrieval work?
- Did the model use the retrieved context correctly?
- Were citations valid?
- Were claims supported?
- Was the answer complete?
- Was the cost/latency acceptable?
```

---

# 2. Evaluation layers

RAGLens should evaluate at four levels:

```text
1. Retrieval quality
2. Citation quality
3. Answer quality
4. Operational quality
```

Each layer answers a different question.

| Layer       | Question                                                  |
| ----------- | --------------------------------------------------------- |
| Retrieval   | Did the system find the right source material?            |
| Citation    | Did the answer cite real and relevant chunks?             |
| Answer      | Was the generated answer correct, grounded, and complete? |
| Operational | Was the query fast, reliable, and cost-effective?         |

This separation is important because a RAG answer can fail in different ways.

Example:

```text
Good retrieval + bad answer:
  The right chunks were found, but the model hallucinated.

Bad retrieval + plausible answer:
  The model answered confidently from the wrong source.

Good answer + bad citations:
  The answer is correct, but the citations do not support it.

Good quality + bad latency:
  The answer is useful, but too slow or expensive for production.
```

---

# 3. Evaluation dataset design

## 3.1 Dataset structure

An evaluation dataset is a versioned collection of golden test cases.

Example:

```json
{
  "name": "Company Knowledge Base Eval",
  "version": "v1",
  "description": "Golden questions for policy, engineering, and support documents.",
  "testCases": []
}
```

Each test case should contain:

```json
{
  "question": "What is the remote work approval process?",
  "expectedAnswer": "Remote work longer than two consecutive weeks requires manager approval.",
  "expectedSources": [
    {
      "sourceRef": "policies/remote-work-policy-v2.md",
      "documentId": "doc_remote_work_v2",
      "title": "Remote Work Policy v2",
      "section": "Approval process",
      "required": true
    }
  ],
  "tags": ["policy", "remote-work"],
  "type": "factual",
  "difficulty": "easy",
  "noAnswerExpected": false
}
```

---

## 3.2 Required test case types

The MVP dataset should include at least these types:

```text
factual
comparison
temporal
multi_hop
no_answer
citation_sensitive
```

## Factual

Tests whether the system can answer a direct question from one source.

Example:

```text
Question:
What is the remote work approval process?

Expected:
Remote work longer than two consecutive weeks requires manager approval.

Expected source:
Remote Work Policy v2, Approval process
```

## Comparison

Tests whether the system can compare two documents or two versions.

Example:

```text
Question:
What changed between Remote Work Policy v1 and v2?

Expected:
v2 added manager approval for remote work longer than two consecutive weeks.
```

## Temporal / versioned

Tests whether the system uses the correct version or effective date.

Example:

```text
Question:
What was the remote work rule before the 2025 update?

Expected:
Use Remote Work Policy v1, not v2.
```

## Multi-hop

Tests whether the system can combine evidence from multiple sources.

Example:

```text
Question:
If a mobile release fails after deployment, who should be notified and what rollback steps apply?

Expected sources:
- Mobile Release Process
- Incident Response Runbook
```

## No-answer

Tests whether the system refuses unsupported questions.

Example:

```text
Question:
Does the company allow unlimited overseas remote work?

Expected:
The documents do not support that claim.
```

## Citation-sensitive

Tests whether the citations support specific claims.

Example:

```text
Question:
What evidence supports the refund escalation process?

Expected:
Answer must cite the escalation process or refund policy.
```

---

# 4. Dataset size

## MVP dataset

```text
20 to 30 test cases
```

Suggested distribution:

```text
8 factual
4 comparison
4 temporal/versioned
4 multi-hop
4 no-answer
4 citation-sensitive
```

That gives enough coverage without slowing development.

## Strong demo dataset

```text
50 to 75 test cases
```

## Production-style dataset

```text
100 to 200 test cases
```

For portfolio purposes, a well-designed 30-case dataset is better than a noisy 200-case dataset.

---

# 5. Evaluation run inputs

An eval run should always capture:

```json
{
  "datasetId": "dataset_company_kb_v1",
  "ragConfigId": "config_vector_default",
  "judgeEnabled": true,
  "thresholds": {
    "minHitAt5": 0.8,
    "minCitationValidity": 0.95,
    "minGroundedness": 0.85,
    "minCorrectness": 0.8,
    "maxAverageLatencyMs": 5000
  }
}
```

The run should store:

```text
- dataset version
- RAG config
- prompt version
- model
- embedding model
- retrieval mode
- topK
- judge prompt version
- thresholds
- timestamp
```

This makes results reproducible.

---

# 6. Evaluation execution flow

For each test case:

```text
1. eval-api loads the test case.
2. eval-api calls rag-api /query.
3. rag-api returns answer, citations, traceId, cost, latency.
4. eval-api fetches rag-api /queries/:traceId.
5. eval-api scores retrieval metrics.
6. eval-api scores citation metrics.
7. eval-api optionally runs LLM-as-judge.
8. eval-api calculates verdict.
9. eval-api stores case result.
```

Important:

```text
The eval-api should treat rag-api as a black box.
```

It should not import retriever, chunker, prompt builder, or generation code directly.

---

# 7. Retrieval metrics

Retrieval metrics answer:

```text
Did the RAG system retrieve the expected evidence?
```

These should be deterministic.

---

## 7.1 hit@k

### Definition

Whether at least one expected source appears in the top K retrieved chunks.

```text
hit@k = true if any expected source appears in top K
```

### Example

Expected source:

```text
Remote Work Policy v2
```

Top 5 retrieved:

```text
1. Expense Policy
2. Remote Work Policy v2
3. Onboarding Policy
4. Remote Work Policy v1
5. Support Escalation Process
```

Result:

```text
hit@5 = true
```

### Use

Good for quick pass/fail retrieval sanity.

---

## 7.2 recall@k

### Definition

How many expected sources were retrieved in top K.

```text
recall@k = retrieved expected sources / total expected sources
```

### Example

Expected sources:

```text
- Mobile Release Process
- Incident Response Runbook
```

Top 10 retrieved includes:

```text
- Mobile Release Process
```

Result:

```text
recall@10 = 1 / 2 = 0.5
```

### Use

Important for multi-hop questions.

---

## 7.3 expectedSourceRank

### Definition

The rank of the first expected source in the retrieved results.

Example:

```text
Expected source appears at rank 3.
expectedSourceRank = 3
```

If missing:

```text
expectedSourceRank = null
```

### Use

Useful because retrieval quality is better when expected evidence appears near the top.

---

## 7.4 context precision

### Definition

The proportion of retrieved chunks that are relevant.

```text
contextPrecision = relevant retrieved chunks / total retrieved chunks
```

This is harder to calculate deterministically unless expected relevant chunks are labelled.

MVP recommendation:

```text
Do not include context precision as a hard MVP metric.
Add it later using LLM-as-judge or labelled chunks.
```

---

## 7.5 Retrieval score payload

Example:

```json
{
  "hitAt5": true,
  "hitAt10": true,
  "recallAt10": 1.0,
  "expectedSourceRank": 1,
  "retrievedExpectedSources": [
    {
      "documentId": "doc_remote_work_v2",
      "rank": 1
    }
  ],
  "missingExpectedSources": []
}
```

---

# 8. Citation metrics

Citation metrics answer:

```text
Did the answer cite real, traceable, and relevant evidence?
```

These should also start deterministic.

---

## 8.1 citationPresent

### Definition

Whether the answer includes at least one citation.

```text
citationPresent = citationCount > 0
```

For no-answer test cases, citations may not be required.

---

## 8.2 citationValidity

### Definition

Whether cited document/chunk IDs exist.

```text
citationValidity = valid citations / total citations
```

### Example

Citations:

```text
chunk_1 exists
chunk_2 exists
chunk_999 does not exist
```

Result:

```text
citationValidity = 2 / 3 = 0.67
```

---

## 8.3 citationTraceability

### Definition

Whether cited chunks were retrieved or included in the final context.

```text
citationTraceability = cited chunks found in trace context / total cited chunks
```

This prevents the model from citing sources that were not actually part of the context.

---

## 8.4 citationSupport

### Definition

Whether the cited chunk actually supports the claim it is attached to.

This is harder and usually needs LLM-as-judge.

MVP approach:

```text
- deterministic citationValidity
- deterministic citationTraceability
- LLM-as-judge citationSupport
```

---

## 8.5 Citation score payload

Example:

```json
{
  "citationPresent": true,
  "citationCount": 2,
  "citationValidity": 1.0,
  "citationTraceability": 1.0,
  "invalidCitations": [],
  "untracedCitations": []
}
```

---

# 9. Answer quality metrics

Answer quality metrics answer:

```text
Was the generated answer good?
```

Use LLM-as-judge for these, but keep the prompt strict and structured.

---

## 9.1 groundedness

### Definition

Whether the answer is supported by the retrieved context.

High groundedness:

```text
The answer only uses facts present in retrieved chunks.
```

Low groundedness:

```text
The answer includes unsupported claims or external assumptions.
```

---

## 9.2 correctness

### Definition

Whether the answer correctly answers the question compared to expected answer and sources.

Correctness should consider:

```text
- factual accuracy
- correct source version
- correct policy/rule/process
- no contradictions with source material
```

---

## 9.3 completeness

### Definition

Whether the answer includes all important expected points.

Example:

Expected answer:

```text
Notify the release manager, rollback through the deployment pipeline, and create an incident report.
```

Generated answer:

```text
Notify the release manager and rollback.
```

Correct but incomplete.

---

## 9.4 citationSupport

### Definition

Whether citations support the answer claims.

Example failure:

```text
Answer:
Remote work is unlimited with manager approval.

Citation:
Remote Work Policy v2 says remote work longer than two weeks requires manager approval.
```

The citation supports manager approval for extended remote work, but not “unlimited”.

---

## 9.5 refusalQuality

### Definition

For no-answer cases, whether the model correctly refuses or states insufficient evidence.

Good refusal:

```text
I could not find evidence in the provided documents that unlimited overseas remote work is allowed.
```

Bad refusal:

```text
The company allows unlimited overseas remote work with manager approval.
```

---

## 9.6 Judge score payload

Example:

```json
{
  "enabled": true,
  "promptVersion": "judge-v1",
  "groundedness": 0.87,
  "correctness": 0.82,
  "completeness": 0.78,
  "citationSupport": 0.91,
  "refusalQuality": null,
  "unsupportedClaims": [],
  "missingImportantPoints": [
    "The answer did not mention the two-week threshold."
  ],
  "explanation": "The answer is mostly correct but omits the threshold that triggers manager approval.",
  "rawVerdict": "pass"
}
```

---

# 10. Operational metrics

Operational metrics answer:

```text
Was the answer practical to serve?
```

Track:

```text
latencyMs
retrievalLatencyMs
generationLatencyMs
inputTokens
outputTokens
estimatedCost
providerErrorRate
timeoutRate
```

## MVP required

```text
latencyMs
inputTokens
outputTokens
estimatedCost
```

## Post-MVP

```text
retrievalLatencyMs
embeddingLatencyMs
generationLatencyMs
judgeLatencyMs
providerErrorRate
timeoutRate
```

Operational metrics should not always fail the case, but they should be visible.

Example:

```text
The answer passed quality checks but exceeded max latency.
Verdict: warning
```

---

# 11. Verdict calculation

A verdict should be deterministic and configurable.

## 11.1 Case-level verdict

Recommended verdict values:

```text
pass
fail
warning
error
```

## pass

The answer meets required quality thresholds.

## fail

The answer completed but failed quality thresholds.

## warning

The answer passed core quality but breached non-critical thresholds, such as latency or cost.

## error

The system failed to complete evaluation due to provider/API/runtime errors.

---

## 11.2 Example case verdict rules

For a normal answer case:

```text
fail if:
  hitAt5 == false
  OR citationValidity < 0.95
  OR citationTraceability < 0.95
  OR groundedness < 0.85
  OR correctness < 0.80

warning if:
  latencyMs > maxLatencyMs
  OR estimatedCost > maxCaseCost

pass otherwise
```

For a no-answer case:

```text
fail if:
  refusalQuality < 0.85
  OR answer makes unsupported claim
  OR correctness < 0.80

citationPresent is not required.
```

For a multi-hop case:

```text
fail if:
  recallAt10 < requiredRecall
  OR correctness < 0.80
  OR completeness < 0.75
```

---

## 11.3 Failure type classification

Every failed case should have a primary failure type.

Recommended values:

```text
retrieval_miss
low_recall
invalid_citation
citation_not_retrieved
unsupported_claim
incomplete_answer
incorrect_answer
bad_refusal
provider_error
timeout
judge_error
```

## Classification priority

Use priority order so failures are consistent:

```text
1. provider_error / timeout / judge_error
2. retrieval_miss
3. low_recall
4. invalid_citation
5. citation_not_retrieved
6. unsupported_claim
7. incorrect_answer
8. incomplete_answer
9. bad_refusal
```

Example:

If retrieval failed and the answer is incorrect, primary failure type should be:

```text
retrieval_miss
```

Because generation likely failed due to missing context.

---

# 12. Run-level scoring

An eval run aggregates case results.

## Required summary metrics

```json
{
  "caseCount": 25,
  "passed": 21,
  "failed": 4,
  "warnings": 0,
  "errors": 0,
  "passRate": 0.84,
  "hitAt5": 0.88,
  "recallAt10": 0.81,
  "citationValidity": 0.96,
  "citationTraceability": 0.92,
  "groundedness": 0.87,
  "correctness": 0.84,
  "completeness": 0.79,
  "citationSupport": 0.82,
  "averageLatencyMs": 2100,
  "estimatedCost": 0.18
}
```

## Aggregation rules

For boolean metrics:

```text
hitAt5 run score = number of true hitAt5 cases / applicable cases
```

For numeric metrics:

```text
groundedness = average groundedness across judged applicable cases
```

For cost:

```text
estimatedCost = sum of case costs
```

For latency:

```text
averageLatencyMs = average case latency
```

Later:

```text
p50LatencyMs
p95LatencyMs
```

---

# 13. Threshold presets

Use threshold presets for product simplicity.

## Exploratory

Used for experiments.

```json
{
  "failOnThresholds": false
}
```

Meaning:

```text
Collect metrics only. Do not fail run.
```

## Balanced

Default MVP preset.

```json
{
  "minHitAt5": 0.8,
  "minCitationValidity": 0.95,
  "minCitationTraceability": 0.95,
  "minGroundedness": 0.85,
  "minCorrectness": 0.8,
  "maxAverageLatencyMs": 5000
}
```

## Strict

For CI gating.

```json
{
  "minHitAt5": 0.9,
  "minCitationValidity": 1.0,
  "minCitationTraceability": 1.0,
  "minGroundedness": 0.9,
  "minCorrectness": 0.9,
  "maxAverageLatencyMs": 4000
}
```

---

# 14. LLM-as-judge methodology

## 14.1 Judge input

The judge should receive:

```text
- question
- expected answer
- generated answer
- retrieved context
- citations
- no-answer expectation
```

Example judge input shape:

```json
{
  "question": "What is the remote work approval process?",
  "expectedAnswer": "Remote work longer than two consecutive weeks requires manager approval.",
  "generatedAnswer": "Remote work longer than two consecutive weeks requires manager approval.",
  "retrievedContext": [
    {
      "chunkId": "chunk_123",
      "documentTitle": "Remote Work Policy v2",
      "text": "Remote work longer than two consecutive weeks requires manager approval."
    }
  ],
  "citations": [
    {
      "chunkId": "chunk_123",
      "documentTitle": "Remote Work Policy v2"
    }
  ],
  "noAnswerExpected": false
}
```

---

## 14.2 Judge output

The judge must return structured JSON.

```json
{
  "groundedness": 0.91,
  "correctness": 0.88,
  "completeness": 0.84,
  "citationSupport": 0.9,
  "refusalQuality": null,
  "unsupportedClaims": [],
  "missingImportantPoints": [],
  "explanation": "The answer is grounded and cites the expected source.",
  "verdict": "pass"
}
```

## 14.3 Judge prompt rules

The judge should be instructed to:

```text
- use only retrieved context
- not reward plausible external knowledge
- penalise unsupported claims
- penalise citations that do not support claims
- penalise missing expected points
- reward correct refusal when context is insufficient
- return JSON only
```

## 14.4 Judge prompt template

```text
You are evaluating a retrieval-augmented generation answer.

Evaluate the generated answer using only the retrieved context and expected answer.

Question:
{{question}}

Expected answer:
{{expectedAnswer}}

No-answer expected:
{{noAnswerExpected}}

Generated answer:
{{generatedAnswer}}

Retrieved context:
{{retrievedContext}}

Citations:
{{citations}}

Score the answer from 0 to 1 for:
- groundedness
- correctness
- completeness
- citationSupport
- refusalQuality, only if noAnswerExpected is true

Rules:
- Do not use external knowledge.
- Penalise unsupported claims.
- Penalise missing key expected points.
- Penalise citations that do not support the claim.
- If noAnswerExpected is true, reward answers that clearly state insufficient evidence.
- If context is insufficient and the generated answer invents a fact, score groundedness and correctness low.

Return JSON only:
{
  "groundedness": number,
  "correctness": number,
  "completeness": number,
  "citationSupport": number,
  "refusalQuality": number | null,
  "unsupportedClaims": string[],
  "missingImportantPoints": string[],
  "explanation": string,
  "verdict": "pass" | "fail"
}
```

---

# 15. Handling noisy judge output

LLM judges are useful but not perfect.

RAGLens should handle this explicitly.

## 15.1 Store judge prompt version

Every judge score should include:

```text
judgePromptVersion
judgeModel
```

## 15.2 Store judge explanation

Do not only store scores.

Store:

```text
unsupportedClaims
missingImportantPoints
explanation
```

This makes failures inspectable.

## 15.3 Validate judge JSON

If judge output is malformed:

```text
verdict = error
failureType = judge_error
```

Do not silently ignore it.

## 15.4 Do not use judge as sole source of truth

Deterministic metrics should still run.

A case can fail deterministically even if judge says pass.

Example:

```text
citationValidity = 0
judge verdict = pass

Final verdict = fail
Failure type = invalid_citation
```

---

# 16. No-answer methodology

No-answer tests are critical because they catch hallucination.

## 16.1 Expected behaviour

When documents do not support an answer, the RAG system should say so.

Good:

```text
I could not find evidence in the indexed documents that unlimited overseas remote work is allowed.
```

Bad:

```text
The company allows unlimited overseas remote work with manager approval.
```

## 16.2 Metrics for no-answer cases

For no-answer cases, use:

```text
refusalQuality
groundedness
correctness
unsupportedClaims
```

Citation metrics may be optional.

## 16.3 Verdict rules

```text
pass if:
  refusalQuality >= 0.85
  AND unsupportedClaims is empty
  AND correctness >= 0.80

fail if:
  answer invents policy
  answer implies unsupported permission
  answer cites unrelated source as evidence
```

---

# 17. Multi-hop methodology

Multi-hop questions require multiple sources.

Example:

```text
Question:
If a mobile release fails after deployment, who should be notified and what rollback steps apply?

Expected sources:
- Mobile Release Process
- Incident Response Runbook
```

## Retrieval scoring

Use recall@k heavily.

```text
Expected sources: 2
Retrieved expected sources: 1
recall@10 = 0.5
```

## Answer scoring

Completeness matters more.

The answer should include all required parts.

```text
- who to notify
- rollback steps
- incident reporting
```

## Verdict rule

```text
fail if recall@10 < 1.0 for required sources
or completeness < 0.75
```

For MVP, you can set recall threshold to 0.5 to avoid being too strict early.

---

# 18. Temporal/versioned methodology

Temporal/versioned questions test whether the system uses the right source version.

Example:

```text
Question:
What was the remote work rule before the 2025 update?
```

Expected source:

```text
Remote Work Policy v1
```

Wrong source:

```text
Remote Work Policy v2
```

## Key metric

```text
expectedSourceRank
```

## Failure type

If v2 is retrieved instead of v1:

```text
failureType = retrieval_miss
```

or more specifically later:

```text
failureType = stale_or_wrong_version
```

You can add `wrong_version` as a post-MVP failure type.

---

# 19. Regression comparison methodology

Run comparison answers:

```text
Did this change improve or degrade the system?
```

Compare two eval runs over the same dataset.

## Required comparison inputs

```json
{
  "baselineRunId": "run_vector_v1",
  "candidateRunId": "run_hybrid_v1"
}
```

## Metrics to compare

```text
passRate
hitAt5
recallAt10
groundedness
correctness
completeness
citationValidity
citationSupport
averageLatencyMs
estimatedCost
```

## Improved case classification

A case is improved if:

```text
baseline verdict = fail
candidate verdict = pass
```

or:

```text
candidate score improves meaningfully
```

Suggested minimum meaningful score delta:

```text
0.10
```

## Regressed case classification

A case is regressed if:

```text
baseline verdict = pass
candidate verdict = fail
```

or:

```text
critical metric drops by >= 0.10
```

Critical metrics:

```text
groundedness
correctness
citationSupport
hitAt5
```

---

# 20. CI quality gate methodology

CI should answer:

```text
Should this RAG change be allowed to merge?
```

## CI gate inputs

```json
{
  "datasetId": "dataset_company_kb_v1",
  "ragConfigId": "config_candidate",
  "thresholdPreset": "strict",
  "commitSha": "abc123",
  "branch": "feature/prompt-v2"
}
```

## CI gate output

```json
{
  "status": "fail",
  "evalRunId": "run_123",
  "summary": {
    "passRate": 0.72,
    "groundedness": 0.78
  },
  "thresholdFailures": [
    {
      "metric": "groundedness",
      "expected": ">= 0.85",
      "actual": 0.78
    }
  ]
}
```

## CI rules

Fail CI if:

```text
- eval run status is failed
- provider errors exceed allowed threshold
- required quality metric is below threshold
- latency/cost threshold is exceeded, if configured as blocking
```

For early MVP:

```text
CI can be post-MVP.
```

But eval-api should be designed so this is easy to add.

---

# 21. Human review methodology, post-MVP

LLM judge scores should eventually support human override.

A human reviewer can mark:

```text
- judge correct
- judge incorrect
- expected answer needs update
- expected source needs update
- test case is ambiguous
```

Manual review fields:

```text
reviewer
correctedVerdict
notes
createdAt
```

This helps improve the golden dataset.

---

# 22. Evaluation artefacts

Every eval run should produce:

```text
run summary
case results
failed case list
scores
judge notes
cost summary
latency summary
comparison-ready data
```

Post-MVP, produce:

```text
JSON report
Markdown report
CI summary
```

Example markdown summary:

```text
# RAG Evaluation Report

Dataset: Company Knowledge Base Eval v1
Config: vector-default
Pass rate: 84%
Failed cases: 4 / 25
Estimated cost: $0.18
Average latency: 2100ms

Failures:
- retrieval_miss: 2
- unsupported_claim: 1
- incomplete_answer: 1
```

---

# 23. Evaluation storage

Each case result should store:

```text
traceId
answer
retrievalScores
citationScores
judgeScores
verdict
failureType
evaluatorNotes
latencyMs
estimatedCost
```

This makes the dashboard independent of live recomputation.

---

# 24. MVP methodology scope

## MVP must include

```text
- golden dataset with 20 to 30 test cases
- deterministic retrieval metrics
- deterministic citation validity metrics
- LLM-as-judge scoring
- case-level verdict
- run-level summary
- failed case explanation
```

## MVP can defer

```text
- RAGAS integration
- DeepEval integration
- human review
- p95 latency
- advanced context precision
- score calibration
- CI gate
- statistical significance testing
```

---

# 25. Evaluation implementation order

Build in this order:

```text
1. Dataset and test case model
2. Eval runner calling rag-api
3. Store raw answers and trace IDs
4. Retrieval metrics
5. Citation validity and traceability metrics
6. Verdict calculation
7. Run summary aggregation
8. LLM-as-judge scoring
9. Failed case explanations
10. Run comparison
11. CI quality gate
```

---

# 26. Example full case result

```json
{
  "testCaseId": "case_remote_work_approval",
  "traceId": "trace_123",
  "question": "What is the remote work approval process?",
  "expectedAnswer": "Remote work longer than two consecutive weeks requires manager approval.",
  "generatedAnswer": "Remote work longer than two consecutive weeks requires manager approval.",
  "retrievalScores": {
    "hitAt5": true,
    "hitAt10": true,
    "recallAt10": 1.0,
    "expectedSourceRank": 1,
    "retrievedExpectedSources": [
      {
        "documentId": "doc_remote_work_v2",
        "rank": 1
      }
    ],
    "missingExpectedSources": []
  },
  "citationScores": {
    "citationPresent": true,
    "citationCount": 1,
    "citationValidity": 1.0,
    "citationTraceability": 1.0,
    "invalidCitations": [],
    "untracedCitations": []
  },
  "judgeScores": {
    "enabled": true,
    "promptVersion": "judge-v1",
    "groundedness": 0.93,
    "correctness": 0.91,
    "completeness": 0.87,
    "citationSupport": 0.9,
    "refusalQuality": null,
    "unsupportedClaims": [],
    "missingImportantPoints": [],
    "explanation": "The answer is correct, grounded, and cites the expected source.",
    "rawVerdict": "pass"
  },
  "verdict": "pass",
  "failureType": null,
  "latencyMs": 1840,
  "estimatedCost": 0.008
}
```

---

# 27. Example failed case result

```json
{
  "testCaseId": "case_unlimited_overseas_remote",
  "traceId": "trace_456",
  "question": "Does the company allow unlimited overseas remote work?",
  "expectedAnswer": null,
  "generatedAnswer": "The company allows unlimited overseas remote work with manager approval.",
  "retrievalScores": {
    "hitAt5": false,
    "recallAt10": 0,
    "expectedSourceRank": null,
    "retrievedExpectedSources": [],
    "missingExpectedSources": []
  },
  "citationScores": {
    "citationPresent": true,
    "citationCount": 1,
    "citationValidity": 1.0,
    "citationTraceability": 1.0
  },
  "judgeScores": {
    "enabled": true,
    "promptVersion": "judge-v1",
    "groundedness": 0.22,
    "correctness": 0.1,
    "completeness": 0.2,
    "citationSupport": 0.15,
    "refusalQuality": 0.0,
    "unsupportedClaims": [
      "The company allows unlimited overseas remote work.",
      "Manager approval is sufficient for unlimited overseas remote work."
    ],
    "missingImportantPoints": [
      "The answer should state that the documents do not support this claim."
    ],
    "explanation": "The generated answer invents a policy not supported by the retrieved context.",
    "rawVerdict": "fail"
  },
  "verdict": "fail",
  "failureType": "bad_refusal",
  "latencyMs": 1650,
  "estimatedCost": 0.007
}
```

---

# 28. Final methodology summary

RAGLens’s evaluation methodology should be built around this model:

```text
Retrieval metrics tell you whether the system found the right evidence.

Citation metrics tell you whether the answer cites real, traceable sources.

Answer metrics tell you whether the model used the evidence correctly.

Operational metrics tell you whether the answer is practical to serve.

Regression metrics tell you whether a change improved or degraded the system.
```

The most important design choice:

```text
Use deterministic metrics first.
Use LLM-as-judge second.
Use the dashboard to explain failures, not just display scores.
```

The evaluation methodology should make RAG failures diagnosable:

```text
If an answer is wrong, RAGLens should show whether the problem was retrieval, citation, generation, refusal behaviour, or operational failure.
```
