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

export type EvalRunsResult =
  | { ok: true; evalRuns: EvalRunRecord[] }
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
