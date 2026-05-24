import Link from 'next/link';
import { fetchRetrievalResults, getRagApiBaseUrl } from '../lib/ragApi';

type RetrievalPageProps = {
  searchParams: Promise<{ q?: string; limit?: string }>;
};

export default async function RetrievalPage({ searchParams }: RetrievalPageProps) {
  const params = await searchParams;
  const query = params.q ?? '';
  const limit = parseLimit(params.limit);
  const result = await fetchRetrievalResults(query, limit);

  return (
    <main style={{ padding: '48px', maxWidth: '1120px', margin: '0 auto' }}>
      <Link href="/" style={{ color: '#475569', textDecoration: 'none' }}>
        ← Dashboard
      </Link>
      <p style={{ marginTop: '32px', marginBottom: 0, color: '#475569', fontWeight: 600 }}>
        Retrieval
      </p>
      <h1 style={{ marginTop: '12px', fontSize: '44px', lineHeight: 1.05 }}>
        Inspect ranked chunks
      </h1>
      <p style={{ fontSize: '18px', color: '#475569', lineHeight: 1.6 }}>
        Run a retrieval-only query against <code>{getRagApiBaseUrl()}/api/v1/documents/search</code> and inspect the ranked source chunks before answer generation exists.
      </p>

      <form className="retrieval-form" action="/retrieval">
        <label>
          Query
          <input
            name="q"
            type="search"
            placeholder="remote work eligibility"
            defaultValue={query}
          />
        </label>
        <label>
          Limit
          <input name="limit" type="number" min="1" max="20" defaultValue={limit} />
        </label>
        <button type="submit">Search</button>
      </form>

      {!query.trim() ? (
        <section className="panel empty-panel" style={{ marginTop: '32px' }}>
          <h2>Enter a query to inspect retrieval</h2>
          <p>
            Seed documents first, then use this page to inspect ranked chunks, source IDs, scores, heading paths, and content previews.
          </p>
        </section>
      ) : !result.ok ? (
        <section className="panel error-panel" style={{ marginTop: '32px' }}>
          <h2>Unable to run retrieval</h2>
          <p>{result.error}</p>
          <p>
            Start the platform locally with <code>docker compose up --build</code>, seed documents, then refresh this page.
          </p>
        </section>
      ) : result.chunks.length === 0 ? (
        <section className="panel empty-panel" style={{ marginTop: '32px' }}>
          <h2>No chunks returned</h2>
          <p>
            Check that documents have been ingested and that chunk embeddings exist for the active document repository.
          </p>
        </section>
      ) : (
        <section style={{ display: 'grid', gap: '16px', marginTop: '32px' }}>
          {result.chunks.map((chunk, index) => (
            <article key={chunk.id} className="panel retrieval-result-card">
              <div className="chunk-header">
                <strong>Rank {index + 1}</strong>
                <span>score {formatScore(chunk.score)}</span>
              </div>
              <h2>{chunk.document.title}</h2>
              <p className="heading-path">
                {chunk.document.sourceId} · v{chunk.document.version} · chunk {chunk.chunkIndex + 1}
              </p>
              <p className="heading-path">
                {chunk.headingPath.length > 0 ? chunk.headingPath.join(' / ') : 'No heading'}
              </p>
              <pre className="chunk-content">{chunk.content}</pre>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}

function parseLimit(value?: string): number {
  const parsed = Number(value ?? 5);

  if (!Number.isInteger(parsed)) {
    return 5;
  }

  return Math.min(Math.max(parsed, 1), 20);
}

function formatScore(value: number): string {
  return Number.isFinite(value) ? value.toFixed(4) : '0.0000';
}
