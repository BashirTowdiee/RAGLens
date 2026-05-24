import Link from 'next/link';
import { fetchDocumentDetail } from '../../lib/ragApi';

type DocumentDetailPageProps = {
  params: Promise<{ documentId: string }>;
};

export default async function DocumentDetailPage({ params }: DocumentDetailPageProps) {
  const { documentId } = await params;
  const result = await fetchDocumentDetail(documentId);

  return (
    <main style={{ padding: '48px', maxWidth: '1120px', margin: '0 auto' }}>
      <Link href="/documents" style={{ color: '#475569', textDecoration: 'none' }}>
        ← Documents
      </Link>

      {!result.ok ? (
        <section className="panel error-panel" style={{ marginTop: '32px' }}>
          <h1>Unable to load document</h1>
          <p>{result.error}</p>
        </section>
      ) : (
        <>
          <p style={{ marginTop: '32px', marginBottom: 0, color: '#475569', fontWeight: 600 }}>
            {result.document.sourceId}
          </p>
          <h1 style={{ marginTop: '12px', fontSize: '44px', lineHeight: 1.05 }}>
            {result.document.title}
          </h1>

          <section className="document-summary-grid">
            <SummaryItem label="Status" value={result.document.status} />
            <SummaryItem label="Source type" value={result.document.sourceType} />
            <SummaryItem label="Version" value={result.document.version} />
            <SummaryItem label="Chunks" value={String(result.chunks.length)} />
            <SummaryItem label="Source URI" value={result.document.sourceUri ?? 'n/a'} />
            <SummaryItem label="Updated" value={formatDate(result.document.updatedAt)} />
          </section>

          <section style={{ marginTop: '32px' }}>
            <h2>Chunks</h2>
            <div style={{ display: 'grid', gap: '16px' }}>
              {result.chunks.map((chunk) => (
                <article key={chunk.id} className="panel">
                  <div className="chunk-header">
                    <strong>Chunk {chunk.chunkIndex + 1}</strong>
                    <span>{chunk.tokenCountEstimate} estimated tokens</span>
                  </div>
                  <p className="heading-path">
                    {chunk.headingPath.length > 0 ? chunk.headingPath.join(' / ') : 'No heading'}
                  </p>
                  <pre className="chunk-content">{chunk.content}</pre>
                </article>
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <article className="panel summary-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('en-AU', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
}
