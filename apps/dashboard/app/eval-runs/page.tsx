import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createComparison, fetchEvalRuns, getEvalApiDisplayBaseUrl } from '../lib/evalApi';

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

async function createComparisonAction(formData: FormData) {
  'use server';

  const baselineEvalRunId = String(formData.get('baselineEvalRunId') ?? '');
  const candidateEvalRunId = String(formData.get('candidateEvalRunId') ?? '');
  const result = await createComparison(baselineEvalRunId, candidateEvalRunId);

  if (!result.ok) {
    redirect(`/eval-runs?comparisonError=${encodeURIComponent(result.error)}`);
  }

  redirect(`/comparisons/${result.comparison.id}`);
}

type EvalRunsSearchParams = {
  comparisonError?: string;
};

type EvalRunsPageProps = {
  searchParams?: Promise<EvalRunsSearchParams>;
};

export default async function EvalRunsPage({ searchParams }: EvalRunsPageProps) {
  const result = await fetchEvalRuns();
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const comparisonError = resolvedSearchParams.comparisonError;

  return (
    <main style={{ padding: '48px', maxWidth: '1120px', margin: '0 auto' }}>
      <Link href="/" style={{ color: '#475569', textDecoration: 'none' }}>
        ← Dashboard
      </Link>
      <p style={{ marginTop: '32px', marginBottom: 0, color: '#475569', fontWeight: 600 }}>
        Evaluation
      </p>
      <h1 style={{ marginTop: '12px', fontSize: '44px', lineHeight: 1.05 }}>
        Eval runs
      </h1>
      <p style={{ fontSize: '18px', color: '#475569', lineHeight: 1.6 }}>
        Inspect run status, pass rate, case counts, and failure type rollups from{' '}
        <code>{getEvalApiDisplayBaseUrl()}/api/v1/eval-runs</code>.
      </p>

      {!result.ok ? (
        <section className="panel error-panel">
          <h2>Unable to load eval runs</h2>
          <p>{result.error}</p>
          <p>
            Start the platform locally with <code>docker compose up --build</code>, then refresh this page.
          </p>
        </section>
      ) : result.evalRuns.length === 0 ? (
        <section className="panel empty-panel">
          <h2>No eval runs yet</h2>
          <p>
            Create an eval run through eval-api, execute the dataset, then use this view to inspect scoring rollups.
          </p>
        </section>
      ) : (
        <>
          <section className="panel comparison-form-panel">
            <h2>Create comparison</h2>
            <p>
              Compare two runs from the same dataset to inspect metric deltas and improved or regressed cases.
            </p>
            {comparisonError ? (
              <p style={{ color: '#b91c1c' }}>Comparison failed: {comparisonError}</p>
            ) : null}
            <form action={createComparisonAction} className="comparison-form">
              <label>
                Baseline run
                <select name="baselineEvalRunId" required>
                  {result.evalRuns.map((run) => (
                    <option key={run.id} value={run.id}>
                      {run.name || run.id} · {run.dataset_id}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Candidate run
                <select name="candidateEvalRunId" required>
                  {result.evalRuns.map((run) => (
                    <option key={run.id} value={run.id}>
                      {run.name || run.id} · {run.dataset_id}
                    </option>
                  ))}
                </select>
              </label>
              <button type="submit">Create comparison</button>
            </form>
          </section>

          <section style={{ display: 'grid', gap: '16px', marginTop: '32px' }}>
            {result.evalRuns.map((run) => (
              <article key={run.id} className="panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '24px' }}>
                  <div>
                    <h2 style={{ marginTop: 0 }}>{run.name || run.id}</h2>
                    <p style={{ color: '#475569', marginBottom: 0 }}>
                      Dataset <code>{run.dataset_id}</code> · Config <code>{run.rag_config_id}</code>
                    </p>
                  </div>
                  <strong>{run.status}</strong>
                </div>

                <dl className="metric-grid">
                  <div>
                    <dt>Pass rate</dt>
                    <dd>{formatPercent(run.summary.pass_rate)}</dd>
                  </div>
                  <div>
                    <dt>Total cases</dt>
                    <dd>{run.summary.total_cases}</dd>
                  </div>
                  <div>
                    <dt>Passed</dt>
                    <dd>{run.summary.passed_cases}</dd>
                  </div>
                  <div>
                    <dt>Warnings</dt>
                    <dd>{run.summary.warning_cases}</dd>
                  </div>
                  <div>
                    <dt>Errors</dt>
                    <dd>{run.summary.error_cases}</dd>
                  </div>
                  <div>
                    <dt>Judge</dt>
                    <dd>{run.judge_enabled ? 'enabled' : 'disabled'}</dd>
                  </div>
                </dl>

                {Object.keys(run.summary.failure_types).length > 0 ? (
                  <p style={{ color: '#475569' }}>
                    Failure types:{' '}
                    {Object.entries(run.summary.failure_types)
                      .map(([type, count]) => `${type}: ${count}`)
                      .join(', ')}
                  </p>
                ) : null}

                <Link href={`/eval-runs/${run.id}`} className="primary-link">
                  Open run detail
                </Link>
              </article>
            ))}
          </section>
        </>
      )}
    </main>
  );
}
