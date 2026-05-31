import Link from 'next/link';
import { fetchDocumentDetail } from '../../lib/ragApi';

type DocumentDetailPageProps = {
  params: Promise<{ documentId: string }>;
};

export default async function DocumentDetailPage({ params }: DocumentDetailPageProps) {
  const { documentId } = await params;
  const result = await fetchDocumentDetail(documentId);

  return !result.ok ? (
    <section className="panel error-panel">
      <h2>Unable to load document</h2>
      <p>{result.error}</p>
    </section>
  ) : (
    <div className="stack">
      <section className="card">
        <div className="card-header">
          <h2>{result.document.title}</h2>
          <Link href="/documents" className="button-secondary">Back to documents</Link>
        </div>
        <div className="card-body">
          <p>{result.document.sourceId}</p>
          <section className="document-summary-grid">
            <SummaryItem label="Status" value={result.document.status} />
            <SummaryItem label="Source type" value={result.document.sourceType} />
            <SummaryItem label="Version" value={result.document.version} />
            <SummaryItem label="Chunks" value={String(result.chunks.length)} />
            <SummaryItem label="Source URI" value={result.document.sourceUri ?? 'n/a'} />
            <SummaryItem label="Updated" value={formatDate(result.document.updatedAt)} />
          </section>
        </div>
      </section>

      <section className="stack">
        {result.chunks.map((chunk) => (
          <article key={chunk.id} className="panel">
            <div className="chunk-header">
              <strong>Chunk {chunk.chunkIndex + 1}</strong>
              <span>{chunk.tokenCountEstimate} estimated tokens</span>
            </div>
            <p className="heading-path">{chunk.headingPath.length > 0 ? chunk.headingPath.join(' / ') : 'No heading'}</p>
            <pre className="chunk-content">{chunk.content}</pre>
          </article>
        ))}
      </section>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return <article className="panel summary-item"><span>{label}</span><strong>{value}</strong></article>;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' });
}
