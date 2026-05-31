import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  EvalCaseResult,
  executeEvalRun,
  fetchEvalCaseResults,
  fetchEvalRun,
  getEvalApiBaseUrl
} from '../../lib/evalApi';

type EvalRunDetailPageProps = {
  params: Promise<{ evalRunId: string }>;
  searchParams?: Promise<{ executeError?: string; executeSuccess?: string }>;
};

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatCurrency(value: number): string {
  return `$${value.toFixed(4)}`;
}

function getCaseLabel(result: EvalCaseResult): string {
  if (result.judge_error) {
    return 'judge error';
  }
  if (result.judge?.unsupported_claims.length) {
    return 'unsupported claims';
  }
  if (result.scores.failure_type) {
    return result.scores.failure_type;
  }
  return result.scores.verdict;
}

function getCaseTone(result: EvalCaseResult): string {
  if (result.judge_error || result.scores.verdict === 'error') {
    return '#b91c1c';
  }
  if (result.judge?.verdict === 'warning' || result.scores.verdict === 'warning') {
    return '#a16207';
  }
  if (result.judge?.verdict === 'fail' || result.scores.verdict === 'fail') {
    return '#b91c1c';
  }
  return '#166534';
}

async function executeEvalRunAction(formData: FormData) {
  'use server';

  const evalRunId = String(formData.get('evalRunId') ?? '').trim();
  const maxCasesInput = String(formData.get('maxCases') ?? '').trim();
  const maxCostUsdInput = String(formData.get('maxCostUsd') ?? '').trim();

  if (!evalRunId) {
    redirect('/eval-runs?comparisonError=Missing%20eval%20run%20id.');
  }

  let maxCases: number | undefined;
  if (maxCasesInput) {
    maxCases = Number(maxCasesInput);
    if (!Number.isFinite(maxCases) || maxCases <= 0) {
      redirect(`/eval-runs/${evalRunId}?executeError=${encodeURIComponent('maxCases must be a positive number.')}`);
    }
  }

  let maxCostUsd: number | undefined;
  if (maxCostUsdInput) {
    maxCostUsd = Number(maxCostUsdInput);
    if (!Number.isFinite(maxCostUsd) || maxCostUsd < 0) {
      redirect(`/eval-runs/${evalRunId}?executeError=${encodeURIComponent('maxCostUsd must be zero or positive.')}`);
    }
  }

  const result = await executeEvalRun(evalRunId, { maxCases, maxCostUsd });
  if (!result.ok) {
    redirect(`/eval-runs/${evalRunId}?executeError=${encodeURIComponent(result.error)}`);
  }

  redirect(`/eval-runs/${evalRunId}?executeSuccess=1`);
}

export default async function EvalRunDetailPage({ params, searchParams }: EvalRunDetailPageProps) {
  const { evalRunId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const [runResult, caseResults] = await Promise.all([
    fetchEvalRun(evalRunId),
    fetchEvalCaseResults(evalRunId)
  ]);

  return (
    <main style={{ padding: '48px', maxWidth: '1120px', margin: '0 auto' }}>
      <Link href="/eval-runs" style={{ color: '#475569', textDecoration: 'none' }}>
        ← Eval runs
      </Link>
      <p style={{ marginTop: '32px', marginBottom: 0, color: '#475569', fontWeight: 600 }}>
        Evaluation detail
      </p>

      {!runResult.ok ? (
        <section className="panel error-panel">
          <h1>Unable to load eval run</h1>
          <p>{runResult.error}</p>
          <p>
            Expected endpoint: <code>{getEvalApiBaseUrl()}/api/v1/eval-runs/{evalRunId}</code>
          </p>
        </section>
      ) : (
        <>
          <h1 style={{ marginTop: '12px', fontSize: '44px', lineHeight: 1.05 }}>
            {runResult.evalRun.name || runResult.evalRun.id}
          </h1>
          <p style={{ fontSize: '18px', color: '#475569', lineHeight: 1.6 }}>
            Dataset <code>{runResult.evalRun.dataset_id}</code> · Config{' '}
            <code>{runResult.evalRun.rag_config_id}</code> · Status{' '}
            <strong>{runResult.evalRun.status}</strong>
          </p>

          <section className="panel" style={{ marginBottom: '24px' }}>
            <h2 style={{ marginTop: 0 }}>Execute run</h2>
            <form action={executeEvalRunAction} className="comparison-form" style={{ gridTemplateColumns: 'repeat(2, minmax(200px, 1fr)) auto' }}>
              <input type="hidden" name="evalRunId" value={evalRunId} />
              <label>
                maxCases
                <input name="maxCases" type="number" min={1} step={1} defaultValue={5} />
              </label>
              <label>
                maxCostUsd (optional)
                <input name="maxCostUsd" type="number" min={0} step="0.0001" placeholder="0.01" />
              </label>
              <button type="submit">Execute run</button>
            </form>
            {resolvedSearchParams.executeError ? (
              <p style={{ color: '#b91c1c' }}>
                Execute eval run failed: {resolvedSearchParams.executeError}
              </p>
            ) : null}
            {resolvedSearchParams.executeSuccess ? (
              <p style={{ color: '#166534' }}>Eval run executed successfully.</p>
            ) : null}
          </section>

          <section className="panel">
            <dl className="metric-grid">
              <div>
                <dt>Pass rate</dt>
                <dd>{formatPercent(runResult.evalRun.summary.pass_rate)}</dd>
              </div>
              <div>
                <dt>Total cases</dt>
                <dd>{runResult.evalRun.summary.total_cases}</dd>
              </div>
              <div>
                <dt>Passed</dt>
                <dd>{runResult.evalRun.summary.passed_cases}</dd>
              </div>
              <div>
                <dt>Warnings</dt>
                <dd>{runResult.evalRun.summary.warning_cases}</dd>
              </div>
              <div>
                <dt>Errors</dt>
                <dd>{runResult.evalRun.summary.error_cases}</dd>
              </div>
              <div>
                <dt>Judge</dt>
                <dd>{runResult.evalRun.judge_enabled ? 'enabled' : 'disabled'}</dd>
              </div>
            </dl>
          </section>

          {!caseResults.ok ? (
            <section className="panel error-panel">
              <h2>Unable to load case results</h2>
              <p>{caseResults.error}</p>
            </section>
          ) : caseResults.results.length === 0 ? (
            <section className="panel empty-panel">
              <h2>No case results yet</h2>
              <p>Execute this eval run to inspect case-level answers, citations, and judge notes.</p>
            </section>
          ) : (
            <section style={{ display: 'grid', gap: '16px', marginTop: '32px' }}>
              <h2>Case results</h2>
              {caseResults.results.map((result) => (
                <article key={result.id} className="panel">
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '24px' }}>
                    <div>
                      <h3 style={{ marginTop: 0 }}>{result.question || result.test_case_id}</h3>
                      <p style={{ color: '#475569' }}>
                        Status <strong>{result.status}</strong> · Verdict{' '}
                        <strong>{result.scores.verdict}</strong> · Failure{' '}
                        <strong style={{ color: getCaseTone(result) }}>{getCaseLabel(result)}</strong>
                      </p>
                    </div>
                    <div style={{ color: '#475569', textAlign: 'right' }}>
                      <div>{result.latency_ms}ms</div>
                      <div>{formatCurrency(result.cost_usd)}</div>
                    </div>
                  </div>

                  <dl className="metric-grid">
                    <div>
                      <dt>Hit@5</dt>
                      <dd>{result.scores.retrieval.hit_at_5 ? 'yes' : 'no'}</dd>
                    </div>
                    <div>
                      <dt>Recall@10</dt>
                      <dd>{formatPercent(result.scores.retrieval.recall_at_10)}</dd>
                    </div>
                    <div>
                      <dt>Citation validity</dt>
                      <dd>{formatPercent(result.scores.citations.citation_validity)}</dd>
                    </div>
                    <div>
                      <dt>Citations</dt>
                      <dd>{result.scores.citations.citation_count}</dd>
                    </div>
                  </dl>

                  {result.answer || result.expected_answer ? (
                    <div className="answer-grid">
                      <section>
                        <h4>Expected answer</h4>
                        <p>{result.expected_answer || 'No expected answer recorded.'}</p>
                      </section>
                      <section>
                        <h4>Generated answer</h4>
                        <p>{result.answer || 'No generated answer recorded.'}</p>
                      </section>
                    </div>
                  ) : null}

                  {result.scores.retrieval.missing_expected_sources.length > 0 ? (
                    <p style={{ color: '#b91c1c' }}>
                      Missing expected sources:{' '}
                      {result.scores.retrieval.missing_expected_sources.join(', ')}
                    </p>
                  ) : null}

                  {result.error_message ? (
                    <p style={{ color: '#b91c1c' }}>Execution error: {result.error_message}</p>
                  ) : null}

                  {result.judge_error ? (
                    <p style={{ color: '#b91c1c' }}>Judge error: {result.judge_error}</p>
                  ) : null}

                  {result.judge ? (
                    <section className="judge-panel">
                      <h4>Judge notes</h4>
                      <p>{result.judge.rationale}</p>
                      {result.judge.unsupported_claims.length > 0 ? (
                        <p>Unsupported claims: {result.judge.unsupported_claims.join(', ')}</p>
                      ) : null}
                      {result.judge.missing_important_points.length > 0 ? (
                        <p>
                          Missing important points:{' '}
                          {result.judge.missing_important_points.join(', ')}
                        </p>
                      ) : null}
                    </section>
                  ) : null}

                  <Link
                    href={`/eval-runs/${evalRunId}/results/${result.id}`}
                    className="secondary-link"
                  >
                    Open case detail
                  </Link>
                </article>
              ))}
            </section>
          )}
        </>
      )}
    </main>
  );
}
