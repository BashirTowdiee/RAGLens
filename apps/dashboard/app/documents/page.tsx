import Link from 'next/link';
import { fetchDocuments, getRagApiDisplayBaseUrl } from '../lib/ragApi';

export default async function DocumentsPage() {
  const result = await fetchDocuments();

  return (
    <main style={{ padding: '48px', maxWidth: '1120px', margin: '0 auto' }}>
      <Link href="/" style={{ color: '#475569', textDecoration: 'none' }}>
        ← Dashboard
      </Link>
      <p style={{ marginTop: '32px', marginBottom: 0, color: '#475569', fontWeight: 600 }}>
        Corpus
      </p>
      <h1 style={{ marginTop: '12px', fontSize: '44px', lineHeight: 1.05 }}>
        Documents
      </h1>
      <p style={{ fontSize: '18px', color: '#475569', lineHeight: 1.6 }}>
        Inspect indexed documents and drill into generated chunks. Data is loaded from{' '}
        <code>{getRagApiDisplayBaseUrl()}/api/v1/documents</code>.
      </p>

      {!result.ok ? (
        <section className="panel error-panel">
          <h2>Unable to load documents</h2>
          <p>{result.error}</p>
          <p>
            Start the platform locally with <code>docker compose up --build</code>, then refresh this page.
          </p>
        </section>
      ) : result.documents.length === 0 ? (
        <section className="panel empty-panel">
          <h2>No documents indexed yet</h2>
          <p>
            Ingest seed documents through rag-api, then use this view to verify source IDs, document status,
            and chunk counts.
          </p>
        </section>
      ) : (
        <section style={{ display: 'grid', gap: '16px', marginTop: '32px' }}>
          {result.documents.map((document) => (
            <Link
              key={document.id}
              href={`/documents/${document.id}`}
              className="document-card"
            >
              <span>
                <strong>{document.title}</strong>
                <small>{document.sourceId}</small>
              </span>
              <span className="document-meta">
                {document.sourceType} · v{document.version} · {document.status}
              </span>
            </Link>
          ))}
        </section>
      )}
    </main>
  );
}
