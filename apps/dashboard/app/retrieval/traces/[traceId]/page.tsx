import Link from 'next/link';
import { fetchRetrievalTrace } from '../../../lib/ragApi';

type RetrievalTracePageProps = {
  params: Promise<{ traceId: string }>;
};

export default async function RetrievalTracePage({ params }: RetrievalTracePageProps) {
  const { traceId } = await params;
  const result = await fetchRetrievalTrace(traceId);

  return (
    <main style={{ padding: '48px', maxWidth: '1120px', margin: '0 auto' }}>
      <Link href="/retrieval" style={{ color: '#475569', textDecoration: 'none' }}>
        ← Retrieval inspector
      </Link>
      <p style={{ marginTop: '32px', marginBottom: 0, color: '#475569', fontWeight: 600 }}>
        Retrieval trace
      </p>
      <h1 style={{ marginTop: '12px', fontSize: '44px', lineHeight: 1.05 }}>
        Inspect retrieval trace
      </h1>

      {!result.ok ? (
        <section className="panel error-panel" style={{ marginTop: '32px' }}>
          <h2>Unable to load trace</h2>
          <p>{result.error}</p>
          <p>
            Run a retrieval search first, then open the trace link from the retrieval results page.
          </p>
        </section>
      ) : (
        <>
          <section className="document-summary-grid">
            <article className="panel summary-item">
              <span>Trace ID</span>
              <strong>{result.trace.id}</strong>
            </article>
            <article className="panel summary-item">
              <span>Query</span>
              <strong>{result.trace.query}</strong>
            </article>
            <article className="panel summary-item">
              <span>Results</span>
              <strong>{result.trace.resultCount} / limit {result.trace.limit}</strong>
            </article>
            <article className="panel summary-item">
              <span>Duration</span>
              <strong>{result.trace.durationMs}ms</strong>
            </article>
          </section>

          <section style={{ display: 'grid', gap: '16px', marginTop: '32px' }}>
            {result.trace.chunks.map((chunk) => (
              <article key={`${chunk.rank}-${chunk.chunkId}`} className="panel retrieval-result-card">
                <div className="chunk-header">
                  <strong>Rank {chunk.rank}</strong>
                  <span>score {formatScore(chunk.score)}</span>
                </div>
                <h2>{chunk.title}</h2>
                <p className="heading-path">
                  {chunk.sourceId} · chunk {chunk.chunkIndex + 1}
                </p>
                <p className="heading-path">
                  {chunk.headingPath.length > 0 ? chunk.headingPath.join(' / ') : 'No heading'}
                </p>
                <code>{chunk.chunkId}</code>
              </article>
            ))}
          </section>
        </>
      )}
    </main>
  );
}

function formatScore(value: number): string {
  return Number.isFinite(value) ? value.toFixed(4) : '0.0000';
}
