import Link from 'next/link';
import { EvalCaseResult, fetchEvalCaseResult, getEvalApiBaseUrl } from '../../../../lib/evalApi';

type EvalCaseDetailPageProps = {
  params: Promise<{ evalRunId: string; caseResultId: string }>;
};

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatCurrency(value: number): string {
  return `$${value.toFixed(4)}`;
}

function joinList(items: string[]): string {
  return items.length ? items.join(', ') : 'None recorded';
}

function getExpectedSources(result: EvalCaseResult): string[] {
  return [...result.scores.retrieval.retrieved_expected_sources, ...result.scores.retrieval.missing_expected_sources];
}

function getCaseLabel(result: EvalCaseResult): string {
  if (result.judge_error) return 'judge error';
  if (result.judge?.unsupported_claims.length) return 'unsupported claims';
  if (result.scores.failure_type) return result.scores.failure_type;
  return result.scores.verdict;
}

export default async function EvalCaseDetailPage({ params }: EvalCaseDetailPageProps) {
  const { evalRunId, caseResultId } = await params;
  const result = await fetchEvalCaseResult(evalRunId, caseResultId);

  return (
    <div className="stack eval-runs-stack">
      <Link href={`/eval-runs/${evalRunId}`} className="button-ghost">← Eval run detail</Link>

      {!result.ok ? (
        <section className="panel error-panel">
          <h1>Unable to load case result</h1>
          <p>{result.error}</p>
          <p>
            Expected endpoint: <code>{getEvalApiBaseUrl()}/api/v1/eval-runs/{evalRunId}/results/{caseResultId}</code>
          </p>
        </section>
      ) : (
        <>
          <section className="card">
            <div className="card-header"><h2>{result.result.question || result.result.test_case_id}</h2></div>
            <div className="card-body">
              <p className="eval-runs-note">
                Status <strong>{result.result.status}</strong> · Verdict <strong>{result.result.scores.verdict}</strong> · Failure{' '}
                <strong>{getCaseLabel(result.result)}</strong>
              </p>
            </div>
          </section>

          <section className="card">
            <div className="card-body">
              <dl className="metric-grid">
                <div><dt>Latency</dt><dd>{result.result.latency_ms}ms</dd></div>
                <div><dt>Cost</dt><dd>{formatCurrency(result.result.cost_usd)}</dd></div>
                <div><dt>Hit@5</dt><dd>{result.result.scores.retrieval.hit_at_5 ? 'yes' : 'no'}</dd></div>
                <div><dt>Recall@10</dt><dd>{formatPercent(result.result.scores.retrieval.recall_at_10)}</dd></div>
                <div><dt>Citation validity</dt><dd>{formatPercent(result.result.scores.citations.citation_validity)}</dd></div>
                <div><dt>Citations</dt><dd>{result.result.scores.citations.citation_count}</dd></div>
              </dl>
            </div>
          </section>

          <section className="answer-grid">
            <section><h2>Expected answer</h2><p>{result.result.expected_answer || 'No expected answer recorded.'}</p></section>
            <section><h2>Generated answer</h2><p>{result.result.answer || 'No generated answer recorded.'}</p></section>
          </section>

          <section className="source-comparison-grid">
            <article className="panel"><h2>Expected sources</h2><p>{joinList(getExpectedSources(result.result))}</p></article>
            <article className="panel"><h2>Retrieved expected sources</h2><p>{joinList(result.result.scores.retrieval.retrieved_expected_sources)}</p></article>
            <article className="panel error-panel"><h2>Missing expected sources</h2><p>{joinList(result.result.scores.retrieval.missing_expected_sources)}</p></article>
            <article className="panel error-panel"><h2>Invalid citations</h2><p>{joinList(result.result.scores.citations.invalid_citations)}</p></article>
          </section>

          {result.result.error_message ? <section className="panel error-panel"><h2>Provider error</h2><p>{result.result.error_message}</p></section> : null}
          {result.result.judge_error ? <section className="panel error-panel"><h2>Judge error</h2><p>{result.result.judge_error}</p></section> : null}

          {result.result.judge ? (
            <section className="judge-panel">
              <h2>Judge notes</h2>
              <dl className="metric-grid">
                <div><dt>Groundedness</dt><dd>{formatPercent(result.result.judge.scores.groundedness)}</dd></div>
                <div><dt>Correctness</dt><dd>{formatPercent(result.result.judge.scores.correctness)}</dd></div>
                <div><dt>Completeness</dt><dd>{formatPercent(result.result.judge.scores.completeness)}</dd></div>
                <div><dt>Citation support</dt><dd>{formatPercent(result.result.judge.scores.citation_support)}</dd></div>
              </dl>
              <p>{result.result.judge.rationale}</p>
              <p>Unsupported claims: {joinList(result.result.judge.unsupported_claims)}</p>
              <p>Missing important points: {joinList(result.result.judge.missing_important_points)}</p>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
