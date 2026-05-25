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

export type EvalRunsResult =
  | { ok: true; evalRuns: EvalRunRecord[] }
  | { ok: false; error: string };

export type EvalRunResult =
  | { ok: true; evalRun: EvalRunRecord }
  | { ok: false; error: string };

export type EvalCaseResultsResult =
  | { ok: true; results: EvalCaseResult[] }
  | { ok: false; error: string };

export function getEvalApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_EVAL_API_BASE_URL ?? 'http://localhost:8001';
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
