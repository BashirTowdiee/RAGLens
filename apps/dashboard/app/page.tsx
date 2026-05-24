import Link from 'next/link';

const services = [
  {
    name: 'rag-api',
    description: 'Answers questions, stores query traces, and owns document ingestion.',
    href: process.env.NEXT_PUBLIC_RAG_API_BASE_URL ?? 'http://localhost:8000'
  },
  {
    name: 'eval-api',
    description: 'Runs datasets, scores RAG quality, and reports regressions.',
    href: process.env.NEXT_PUBLIC_EVAL_API_BASE_URL ?? 'http://localhost:8001'
  }
];

export default function HomePage() {
  return (
    <main style={{ padding: '48px', maxWidth: '960px', margin: '0 auto' }}>
      <p style={{ margin: 0, color: '#475569', fontWeight: 600 }}>RAGLens</p>
      <h1 style={{ marginTop: '12px', fontSize: '48px', lineHeight: 1.05 }}>
        RAG evaluation and observability dashboard
      </h1>
      <p style={{ fontSize: '20px', color: '#475569', lineHeight: 1.6 }}>
        The dashboard explains how answers were produced, how evaluation runs scored, and which cases regressed.
      </p>

      <section className="dashboard-actions">
        <article className="panel">
          <h2 style={{ marginTop: 0 }}>Corpus explorer</h2>
          <p style={{ color: '#475569', lineHeight: 1.6 }}>
            Inspect indexed source documents and generated chunks before running retrieval and evaluation workflows.
          </p>
          <Link href="/documents" className="primary-link">
            View documents
          </Link>
        </article>

        <article className="panel">
          <h2 style={{ marginTop: 0 }}>Retrieval inspector</h2>
          <p style={{ color: '#475569', lineHeight: 1.6 }}>
            Run a retrieval-only query and inspect ranked chunks, source metadata, scores, and heading paths.
          </p>
          <Link href="/retrieval" className="primary-link">
            Inspect retrieval
          </Link>
        </article>
      </section>

      <section style={{ display: 'grid', gap: '16px', marginTop: '32px' }}>
        {services.map((service) => (
          <article key={service.name} className="panel">
            <h2 style={{ marginTop: 0 }}>{service.name}</h2>
            <p style={{ color: '#475569' }}>{service.description}</p>
            <code>{service.href}/api/v1/health</code>
          </article>
        ))}
      </section>
    </main>
  );
}
