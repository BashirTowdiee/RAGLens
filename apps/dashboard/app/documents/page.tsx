import Link from 'next/link';
import { fetchDocuments, getRagApiDisplayBaseUrl } from '../lib/ragApi';

export default async function DocumentsPage() {
  const result = await fetchDocuments();

  return (
    <div className="stack">
      <section className="card">
        <div className="card-header">
          <h2>Corpus documents</h2>
          <Link href="/documents/upload" className="button">Upload document</Link>
        </div>
        <div className="card-body">
          <p>Data source: <code>{getRagApiDisplayBaseUrl()}/api/v1/documents</code></p>
        </div>
      </section>

      {!result.ok ? (
        <section className="panel error-panel">
          <h2>Unable to load documents</h2>
          <p>{result.error}</p>
        </section>
      ) : result.documents.length === 0 ? (
        <section className="panel empty-panel">
          <h2>No documents indexed yet</h2>
          <p>Ingest or upload documents, then inspect source IDs and chunk counts here.</p>
        </section>
      ) : (
        <section className="stack">
          {result.documents.map((document) => (
            <Link key={document.id} href={`/documents/${document.id}`} className="document-card">
              <span>
                <strong>{document.title}</strong>
                <small>{document.sourceId}</small>
              </span>
              <span className="document-meta">{document.sourceType} · v{document.version} · {document.status}</span>
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}
