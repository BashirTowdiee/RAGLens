import Link from 'next/link';
import {
  ComparisonCase,
  MetricDelta,
  fetchComparison,
  getEvalApiBaseUrl
} from '../../lib/evalApi';

type ComparisonPageProps = {
  params: Promise<{ comparisonId: string }>;
};

function formatMetricValue(metric: string, value: number): string {
  if (metric.toLowerCase().includes('cost')) return `$${value.toFixed(4)}`;
  if (metric.toLowerCase().includes('latency')) return `${Math.round(value)}ms`;
  if (Math.abs(value) <= 1) return `${Math.round(value * 100)}%`;
  return value.toFixed(2);
}

function formatDelta(delta: MetricDelta): string {
  const formatted = formatMetricValue(delta.metric, Math.abs(delta.delta));
  if (delta.delta > 0) return `+${formatted}`;
  if (delta.delta < 0) return `-${formatted}`;
  return formatted;
}

function getDeltaTone(delta: number): string {
  if (delta > 0) return 'green';
  if (delta < 0) return 'red';
  return 'neutral';
}

function titleCaseMetric(metric: string): string {
  return metric.replace(/([A-Z])/g, ' $1').replace(/^./, (character) => character.toUpperCase());
}

function CaseGroup({
  title,
  cases,
  baselineRunId,
  candidateRunId
}: {
  title: string;
  cases: ComparisonCase[];
  baselineRunId: string;
  candidateRunId: string;
}) {
  return (
    <section className="panel comparison-case-group">
      <h2>{title}</h2>
      {cases.length === 0 ? (
        <p className="eval-runs-note">No cases in this group.</p>
      ) : (
        <div className="stack">
          {cases.map((comparisonCase) => (
            <article key={comparisonCase.test_case_id} className="comparison-case-card">
              <h3>{comparisonCase.test_case_id}</h3>
              <p className="eval-runs-note">
                Baseline <strong>{comparisonCase.baseline_verdict ?? 'missing'}</strong> · Candidate{' '}
                <strong>{comparisonCase.candidate_verdict ?? 'missing'}</strong>
              </p>
              <div className="toolbar">
                {comparisonCase.baseline_result_id ? (
                  <Link
                    href={`/eval-runs/${baselineRunId}/results/${comparisonCase.baseline_result_id}`}
                    className="button-secondary"
                  >
                    Baseline case
                  </Link>
                ) : null}
                {comparisonCase.candidate_result_id ? (
                  <Link
                    href={`/eval-runs/${candidateRunId}/results/${comparisonCase.candidate_result_id}`}
                    className="button-secondary"
                  >
                    Candidate case
                  </Link>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default async function ComparisonPage({ params }: ComparisonPageProps) {
  const { comparisonId } = await params;
  const result = await fetchComparison(comparisonId);

  return (
    <div className="stack eval-runs-stack">
      <Link href="/eval-runs" className="button-ghost">← Eval runs</Link>

      {!result.ok ? (
        <section className="panel error-panel">
          <h1>Unable to load comparison</h1>
          <p>{result.error}</p>
          <p>Expected endpoint: <code>{getEvalApiBaseUrl()}/api/v1/comparisons/{comparisonId}</code></p>
        </section>
      ) : (
        <>
          <section className="card">
            <div className="card-header">
              <h2>
                {result.comparison.baseline_run.name || result.comparison.baseline_run.id} vs{' '}
                {result.comparison.candidate_run.name || result.comparison.candidate_run.id}
              </h2>
            </div>
            <div className="card-body">
              <p className="eval-runs-note">
                Dataset <code>{result.comparison.dataset_id}</code> · Status <strong>{result.comparison.status}</strong>
              </p>
            </div>
          </section>

          <section className="answer-grid">
            <section>
              <h2>Baseline</h2>
              <p>{result.comparison.baseline_run.name || result.comparison.baseline_run.id}</p>
              <p>
                Pass rate <strong>{Math.round(result.comparison.baseline_run.summary.pass_rate * 100)}%</strong>
              </p>
              <Link href={`/eval-runs/${result.comparison.baseline_run.id}`} className="button-secondary">Open baseline run</Link>
            </section>
            <section>
              <h2>Candidate</h2>
              <p>{result.comparison.candidate_run.name || result.comparison.candidate_run.id}</p>
              <p>
                Pass rate <strong>{Math.round(result.comparison.candidate_run.summary.pass_rate * 100)}%</strong>
              </p>
              <Link href={`/eval-runs/${result.comparison.candidate_run.id}`} className="button-secondary">Open candidate run</Link>
            </section>
          </section>

          <section className="card">
            <div className="card-header"><h2>Metric deltas</h2></div>
            <div className="card-body">
              <dl className="metric-grid">
                {result.comparison.metric_deltas.map((delta) => (
                  <div key={delta.metric}>
                    <dt>{titleCaseMetric(delta.metric)}</dt>
                    <dd><span className={`pill ${getDeltaTone(delta.delta)}`}>{formatDelta(delta)}</span></dd>
                    <small>
                      {formatMetricValue(delta.metric, delta.baseline)} → {formatMetricValue(delta.metric, delta.candidate)}
                    </small>
                  </div>
                ))}
              </dl>
            </div>
          </section>

          <section className="comparison-case-grid">
            <CaseGroup title="Improved cases" cases={result.comparison.improved_cases} baselineRunId={result.comparison.baseline_run.id} candidateRunId={result.comparison.candidate_run.id} />
            <CaseGroup title="Regressed cases" cases={result.comparison.regressed_cases} baselineRunId={result.comparison.baseline_run.id} candidateRunId={result.comparison.candidate_run.id} />
            <CaseGroup title="Unchanged cases" cases={result.comparison.unchanged_cases} baselineRunId={result.comparison.baseline_run.id} candidateRunId={result.comparison.candidate_run.id} />
            <CaseGroup title="Missing baseline cases" cases={result.comparison.missing_baseline_cases} baselineRunId={result.comparison.baseline_run.id} candidateRunId={result.comparison.candidate_run.id} />
            <CaseGroup title="Missing candidate cases" cases={result.comparison.missing_candidate_cases} baselineRunId={result.comparison.baseline_run.id} candidateRunId={result.comparison.candidate_run.id} />
          </section>
        </>
      )}
    </div>
  );
}
