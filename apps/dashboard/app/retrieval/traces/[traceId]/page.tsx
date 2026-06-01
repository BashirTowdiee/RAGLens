import Link from 'next/link';
import { fetchRetrievalTrace } from '../../../lib/ragApi';

type RetrievalTracePageProps = {
  params: Promise<{ traceId: string }>;
};

export default async function RetrievalTracePage({ params }: RetrievalTracePageProps) {
  const { traceId } = await params;
  const result = await fetchRetrievalTrace(traceId);

  return !result.ok ? (
    <section className="panel error-panel">
      <h2>Unable to load trace</h2>
      <p>{result.error}</p>
    </section>
  ) : (
    <div className="stack">
      <section className="card">
        <div className="card-header">
          <h2>Trace {result.trace.id}</h2>
          <Link href="/retrieval" className="back-link">← Retrieval</Link>
        </div>
        <div className="card-body">
          <section className="document-summary-grid">
            <article className="panel summary-item"><span>Query</span><strong>{result.trace.query}</strong></article>
            <article className="panel summary-item"><span>Results</span><strong>{result.trace.resultCount} / limit {result.trace.limit}</strong></article>
            <article className="panel summary-item"><span>Duration</span><strong>{result.trace.durationMs}ms</strong></article>
          </section>
        </div>
      </section>
      <section className="stack">
        {result.trace.chunks.map((chunk) => (
          <article key={`${chunk.rank}-${chunk.chunkId}`} className="panel retrieval-result-card">
            <div className="chunk-header"><strong>Rank {chunk.rank}</strong><span>score {formatScore(chunk.score)}</span></div>
            <h2>{chunk.title}</h2>
            <p className="heading-path">{chunk.sourceId} · chunk {chunk.chunkIndex + 1}</p>
            <p className="heading-path">{chunk.headingPath.length > 0 ? chunk.headingPath.join(' / ') : 'No heading'}</p>
            <code>{chunk.chunkId}</code>
          </article>
        ))}
      </section>
    </div>
  );
}

function formatScore(value: number): string {
  return Number.isFinite(value) ? value.toFixed(4) : '0.0000';
}
