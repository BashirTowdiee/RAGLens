import Link from 'next/link';
import { fetchDatasets, fetchEvalRuns, getEvalApiDisplayBaseUrl } from './lib/evalApi';
import { fetchDocuments, getRagApiDisplayBaseUrl } from './lib/ragApi';

export default async function HomePage() {
  const [documentsResult, evalRunsResult, datasetsResult] = await Promise.all([
    fetchDocuments(),
    fetchEvalRuns(),
    fetchDatasets()
  ]);

  const latestRun = evalRunsResult.ok ? evalRunsResult.evalRuns[0] : undefined;

  return (
    <div className="stack">
      <section className="card">
        <div className="card-header">
          <h2>Overview</h2>
          <span className="pill blue">observability cockpit</span>
        </div>
        <div className="card-body">
          <p>
            Inspect corpus quality, retrieval behaviour, eval outcomes, and operational API boundaries from one
            persistent workspace.
          </p>
        </div>
      </section>

      <section className="grid-2 overview-cards">
        <article className="card">
          <div className="card-header"><h2>Corpus status</h2></div>
          <div className="card-body">
            <div className="metric-grid">
              <div className="metric"><dt>Documents</dt><dd>{documentsResult.ok ? documentsResult.documents.length : 'n/a'}</dd></div>
              <div className="metric"><dt>Datasets</dt><dd>{datasetsResult.ok ? datasetsResult.datasets.length : 'n/a'}</dd></div>
            </div>
            <Link href="/documents" className="button">Open documents</Link>
          </div>
        </article>

        <article className="card">
          <div className="card-header"><h2>Retrieval status</h2></div>
          <div className="card-body">
            <p>Run retrieval-only checks and trace ranked chunk behaviour before generation and scoring.</p>
            <Link href="/retrieval" className="button">Open retrieval</Link>
          </div>
        </article>

        <article className="card">
          <div className="card-header"><h2>Evaluation status</h2></div>
          <div className="card-body">
            <div className="metric-grid">
              <div className="metric"><dt>Eval runs</dt><dd>{evalRunsResult.ok ? evalRunsResult.evalRuns.length : 'n/a'}</dd></div>
              <div className="metric"><dt>Latest run</dt><dd>{latestRun ? latestRun.status : 'none'}</dd></div>
            </div>
            <Link href="/eval-runs" className="button">Open eval runs</Link>
          </div>
        </article>

        <article className="card">
          <div className="card-header"><h2>Devtools status</h2></div>
          <div className="card-body">
            <p>Use only for low-level API inspection and contract debugging.</p>
            <Link href="/devtools" className="button-secondary">Open devtools</Link>
          </div>
        </article>
      </section>

      <section className="card">
        <div className="card-header"><h2>Connected services</h2></div>
        <div className="card-body">
          <div className="stack">
            <span><strong>rag-api:</strong> <code>{getRagApiDisplayBaseUrl()}</code></span>
            <span><strong>eval-api:</strong> <code>{getEvalApiDisplayBaseUrl()}</code></span>
          </div>
        </div>
      </section>
    </div>
  );
}
