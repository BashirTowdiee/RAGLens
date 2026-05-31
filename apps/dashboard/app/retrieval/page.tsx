import Link from 'next/link';
import { fetchRetrievalResults, getRagApiDisplayBaseUrl } from '../lib/ragApi';

type RetrievalPageProps = {
  searchParams: Promise<{ q?: string; limit?: string }>;
};

export default async function RetrievalPage({ searchParams }: RetrievalPageProps) {
  const params = await searchParams;
  const query = params.q ?? '';
  const limit = parseLimit(params.limit);
  const result = await fetchRetrievalResults(query, limit);

  return (
    <div className="stack">
      <section className="card">
        <div className="card-header"><h2>Retrieval inspector</h2></div>
        <div className="card-body">
          <p>Run retrieval-only query against <code>{getRagApiDisplayBaseUrl()}/api/v1/documents/search</code>.</p>
          <form className="retrieval-form" action="/retrieval">
            <label>Query<input name="q" type="search" placeholder="remote work eligibility" defaultValue={query} /></label>
            <label>Limit<input name="limit" type="number" min="1" max="20" defaultValue={limit} /></label>
            <button type="submit">Search</button>
          </form>
        </div>
      </section>

      {!query.trim() ? (
        <section className="panel empty-panel"><h2>Enter a query to inspect retrieval</h2></section>
      ) : !result.ok ? (
        <section className="panel error-panel"><h2>Unable to run retrieval</h2><p>{result.error}</p></section>
      ) : result.chunks.length === 0 ? (
        <section className="panel empty-panel"><h2>No chunks returned</h2></section>
      ) : (
        <>
          {result.traceId ? (
            <section className="panel trace-summary-card">
              <div><h2>Retrieval trace captured</h2><p className="heading-path">Trace ID: {result.traceId}</p></div>
              <Link href={`/retrieval/traces/${result.traceId}`} className="button">Inspect trace</Link>
            </section>
          ) : null}
          <section className="stack">
            {result.chunks.map((chunk, index) => (
              <article key={chunk.id} className="panel retrieval-result-card">
                <div className="chunk-header"><strong>Rank {index + 1}</strong><span>score {formatScore(chunk.score)}</span></div>
                <h2>{chunk.document.title}</h2>
                <p className="heading-path">{chunk.document.sourceId} · v{chunk.document.version} · chunk {chunk.chunkIndex + 1}</p>
                <p className="heading-path">{chunk.headingPath.length > 0 ? chunk.headingPath.join(' / ') : 'No heading'}</p>
                <pre className="chunk-content">{chunk.content}</pre>
              </article>
            ))}
          </section>
        </>
      )}
    </div>
  );
}

function parseLimit(value?: string): number {
  const parsed = Number(value ?? 5);
  if (!Number.isInteger(parsed)) return 5;
  return Math.min(Math.max(parsed, 1), 20);
}

function formatScore(value: number): string {
  return Number.isFinite(value) ? value.toFixed(4) : '0.0000';
}
