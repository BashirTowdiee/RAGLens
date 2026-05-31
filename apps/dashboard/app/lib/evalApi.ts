export type EvalRunSummary = {
  total_cases: number;
  completed_cases: number;
  failed_cases: number;
  passed_cases: number;
  warning_cases: number;
  error_cases: number;
  pass_rate: number;
  failure_types: Record<string, number>;
};

export type EvalRunRecord = {
  id: string;
  dataset_id: string;
  name: string;
  rag_config_id: string;
  judge_enabled: boolean;
  status: string;
  summary: EvalRunSummary;
  created_at: string;
  updated_at: string;
};

export type DatasetRecord = {
  id: string;
  name: string;
  version: string;
  description: string;
  status: string;
  created_at: string;
};

export type TestCaseRecord = {
  id: string;
  dataset_id: string;
  question: string;
  expected_answer: string;
  reference_citations: string[];
  created_at: string;
};

export type CreateDatasetInput = {
  name: string;
  version: string;
  description: string;
};

export type CreateDatasetTestCaseInput = {
  question: string;
  expected_answer: string;
  reference_citations: string[];
};

export type CreateEvalRunInput = {
  dataset_id: string;
  name: string;
  rag_config_id: string;
  judge_enabled: boolean;
};

export type ExecuteEvalRunOptions = {
  maxCases?: number;
  maxCostUsd?: number;
};

export type RetrievalScore = {
  hit_at_5: boolean;
  hit_at_10: boolean;
  recall_at_10: number;
  retrieved_expected_sources: string[];
  missing_expected_sources: string[];
};

export type CitationScore = {
  citation_present: boolean;
  citation_count: number;
  citation_validity: number;
  invalid_citations: string[];
};

export type DeterministicScore = {
  retrieval: RetrievalScore;
  citations: CitationScore;
  verdict: string;
  failure_type: string;
};

export type JudgeEvaluation = {
  scores: {
    groundedness: number;
    correctness: number;
    completeness: number;
    citation_support: number;
    refusal_quality: number | null;
  };
  unsupported_claims: string[];
  missing_important_points: string[];
  verdict: string;
  rationale: string;
};

export type EvalCaseResult = {
  id: string;
  eval_run_id: string;
  test_case_id: string;
  trace_id: string;
  question: string;
  answer: string;
  expected_answer: string;
  status: string;
  latency_ms: number;
  cost_usd: number;
  error_message: string;
  scores: DeterministicScore;
  judge: JudgeEvaluation | null;
  judge_error: string;
  created_at: string;
};

export type MetricDelta = {
  metric: string;
  baseline: number;
  candidate: number;
  delta: number;
};

export type ComparisonCase = {
  test_case_id: string;
  baseline_result_id: string | null;
  candidate_result_id: string | null;
  baseline_verdict: string | null;
  candidate_verdict: string | null;
  classification: string;
};

export type ComparisonRecord = {
  id: string;
  baseline_run: EvalRunRecord;
  candidate_run: EvalRunRecord;
  dataset_id: string;
  status: string;
  metric_deltas: MetricDelta[];
  improved_cases: ComparisonCase[];
  regressed_cases: ComparisonCase[];
  unchanged_cases: ComparisonCase[];
  missing_baseline_cases: ComparisonCase[];
  missing_candidate_cases: ComparisonCase[];
  created_at: string;
};

export type EvalRunsResult =
  | { ok: true; evalRuns: EvalRunRecord[] }
  | { ok: false; error: string };

export type EvalRunResult =
  | { ok: true; evalRun: EvalRunRecord }
  | { ok: false; error: string };

export type EvalCaseResultsResult =
  | { ok: true; results: EvalCaseResult[] }
  | { ok: false; error: string };

export type EvalCaseResultResult =
  | { ok: true; result: EvalCaseResult }
  | { ok: false; error: string };

export type ComparisonResult =
  | { ok: true; comparison: ComparisonRecord }
  | { ok: false; error: string };

export type DatasetsResult =
  | { ok: true; datasets: DatasetRecord[] }
  | { ok: false; error: string };

export type DatasetResult =
  | { ok: true; dataset: DatasetRecord }
  | { ok: false; error: string };

export type CreateDatasetResult =
  | { ok: true; dataset: DatasetRecord }
  | { ok: false; error: string };

export type DatasetTestCasesResult =
  | { ok: true; testCases: TestCaseRecord[] }
  | { ok: false; error: string };

export type CreateDatasetTestCaseResult =
  | { ok: true; testCase: TestCaseRecord }
  | { ok: false; error: string };

export type CreateEvalRunResult =
  | { ok: true; evalRun: EvalRunRecord }
  | { ok: false; error: string };

export type ExecuteEvalRunResult =
  | { ok: true; evalRun: EvalRunRecord }
  | { ok: false; error: string };

export function getEvalApiBaseUrl(): string {
  return (
    process.env.EVAL_API_BASE_URL ??
    process.env.NEXT_PUBLIC_EVAL_API_BASE_URL ??
    'http://localhost:8001'
  );
}

export function getEvalApiDisplayBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_EVAL_API_BASE_URL ??
    process.env.EVAL_API_BASE_URL ??
    'http://localhost:8001'
  );
}

export async function fetchEvalRuns(): Promise<EvalRunsResult> {
  try {
    const response = await fetch(`${getEvalApiBaseUrl()}/api/v1/eval-runs`, {
      cache: 'no-store'
    });

    if (!response.ok) {
      return { ok: false, error: `eval-api returned HTTP ${response.status}` };
    }

    const body = (await response.json()) as { eval_runs?: EvalRunRecord[] };
    return { ok: true, evalRuns: body.eval_runs ?? [] };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unable to fetch eval runs.'
    };
  }
}

export async function fetchEvalRun(evalRunId: string): Promise<EvalRunResult> {
  try {
    const response = await fetch(`${getEvalApiBaseUrl()}/api/v1/eval-runs/${evalRunId}`, {
      cache: 'no-store'
    });

    if (!response.ok) {
      return { ok: false, error: `eval-api returned HTTP ${response.status}` };
    }

    return { ok: true, evalRun: (await response.json()) as EvalRunRecord };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unable to fetch eval run.'
    };
  }
}

export async function fetchDatasets(): Promise<DatasetsResult> {
  try {
    const response = await fetch(`${getEvalApiBaseUrl()}/api/v1/datasets`, {
      cache: 'no-store'
    });

    if (!response.ok) {
      return { ok: false, error: `eval-api returned HTTP ${response.status}` };
    }

    const body = (await response.json()) as { datasets?: DatasetRecord[] };
    return { ok: true, datasets: body.datasets ?? [] };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unable to fetch datasets.'
    };
  }
}

export async function fetchDataset(datasetId: string): Promise<DatasetResult> {
  try {
    const response = await fetch(`${getEvalApiBaseUrl()}/api/v1/datasets/${datasetId}`, {
      cache: 'no-store'
    });

    if (!response.ok) {
      return { ok: false, error: `eval-api returned HTTP ${response.status}` };
    }

    return { ok: true, dataset: (await response.json()) as DatasetRecord };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unable to fetch dataset.'
    };
  }
}

export async function createDataset(input: CreateDatasetInput): Promise<CreateDatasetResult> {
  try {
    const response = await fetch(`${getEvalApiBaseUrl()}/api/v1/datasets`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: input.name,
        version: input.version,
        description: input.description
      }),
      cache: 'no-store'
    });

    if (!response.ok) {
      return { ok: false, error: `eval-api returned HTTP ${response.status}` };
    }

    return { ok: true, dataset: (await response.json()) as DatasetRecord };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unable to create dataset.'
    };
  }
}

export async function fetchDatasetTestCases(datasetId: string): Promise<DatasetTestCasesResult> {
  try {
    const response = await fetch(`${getEvalApiBaseUrl()}/api/v1/datasets/${datasetId}/test-cases`, {
      cache: 'no-store'
    });

    if (!response.ok) {
      return { ok: false, error: `eval-api returned HTTP ${response.status}` };
    }

    const body = (await response.json()) as { test_cases?: TestCaseRecord[] };
    return { ok: true, testCases: body.test_cases ?? [] };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unable to fetch test cases.'
    };
  }
}

export async function createDatasetTestCase(
  datasetId: string,
  input: CreateDatasetTestCaseInput
): Promise<CreateDatasetTestCaseResult> {
  try {
    const response = await fetch(`${getEvalApiBaseUrl()}/api/v1/datasets/${datasetId}/test-cases`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        question: input.question,
        expected_answer: input.expected_answer,
        reference_citations: input.reference_citations
      }),
      cache: 'no-store'
    });

    if (!response.ok) {
      return { ok: false, error: `eval-api returned HTTP ${response.status}` };
    }

    return { ok: true, testCase: (await response.json()) as TestCaseRecord };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unable to create test case.'
    };
  }
}

export async function createEvalRun(input: CreateEvalRunInput): Promise<CreateEvalRunResult> {
  try {
    const response = await fetch(`${getEvalApiBaseUrl()}/api/v1/eval-runs`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        dataset_id: input.dataset_id,
        name: input.name,
        rag_config_id: input.rag_config_id,
        judge_enabled: input.judge_enabled
      }),
      cache: 'no-store'
    });

    if (!response.ok) {
      return { ok: false, error: `eval-api returned HTTP ${response.status}` };
    }

    return { ok: true, evalRun: (await response.json()) as EvalRunRecord };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unable to create eval run.'
    };
  }
}

export async function executeEvalRun(
  evalRunId: string,
  options: ExecuteEvalRunOptions
): Promise<ExecuteEvalRunResult> {
  try {
    const searchParams = new URLSearchParams();
    if (options.maxCases !== undefined) {
      searchParams.set('maxCases', String(options.maxCases));
    }
    if (options.maxCostUsd !== undefined) {
      searchParams.set('maxCostUsd', String(options.maxCostUsd));
    }

    const query = searchParams.toString();
    const response = await fetch(
      `${getEvalApiBaseUrl()}/api/v1/eval-runs/${evalRunId}/execute${query ? `?${query}` : ''}`,
      {
        method: 'POST',
        cache: 'no-store'
      }
    );

    if (!response.ok) {
      return { ok: false, error: `eval-api returned HTTP ${response.status}` };
    }

    return { ok: true, evalRun: (await response.json()) as EvalRunRecord };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unable to execute eval run.'
    };
  }
}

export async function fetchEvalCaseResults(evalRunId: string): Promise<EvalCaseResultsResult> {
  try {
    const response = await fetch(`${getEvalApiBaseUrl()}/api/v1/eval-runs/${evalRunId}/results`, {
      cache: 'no-store'
    });

    if (!response.ok) {
      return { ok: false, error: `eval-api returned HTTP ${response.status}` };
    }

    const body = (await response.json()) as { results?: EvalCaseResult[] };
    return { ok: true, results: body.results ?? [] };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unable to fetch eval case results.'
    };
  }
}

export async function fetchEvalCaseResult(
  evalRunId: string,
  caseResultId: string
): Promise<EvalCaseResultResult> {
  try {
    const response = await fetch(
      `${getEvalApiBaseUrl()}/api/v1/eval-runs/${evalRunId}/results/${caseResultId}`,
      { cache: 'no-store' }
    );

    if (!response.ok) {
      return { ok: false, error: `eval-api returned HTTP ${response.status}` };
    }

    return { ok: true, result: (await response.json()) as EvalCaseResult };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unable to fetch eval case result.'
    };
  }
}

export async function createComparison(
  baselineEvalRunId: string,
  candidateEvalRunId: string
): Promise<ComparisonResult> {
  try {
    const response = await fetch(`${getEvalApiBaseUrl()}/api/v1/comparisons`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        baseline_eval_run_id: baselineEvalRunId,
        candidate_eval_run_id: candidateEvalRunId
      }),
      cache: 'no-store'
    });

    if (!response.ok) {
      return { ok: false, error: `eval-api returned HTTP ${response.status}` };
    }

    return { ok: true, comparison: (await response.json()) as ComparisonRecord };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unable to create comparison.'
    };
  }
}

export async function fetchComparison(comparisonId: string): Promise<ComparisonResult> {
  try {
    const response = await fetch(`${getEvalApiBaseUrl()}/api/v1/comparisons/${comparisonId}`, {
      cache: 'no-store'
    });

    if (!response.ok) {
      return { ok: false, error: `eval-api returned HTTP ${response.status}` };
    }

    return { ok: true, comparison: (await response.json()) as ComparisonRecord };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unable to fetch comparison.'
    };
  }
}
