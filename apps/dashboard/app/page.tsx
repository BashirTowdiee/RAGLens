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
        The dashboard will explain how answers were produced, how evaluation runs scored, and which cases regressed.
      </p>

      <section style={{ display: 'grid', gap: '16px', marginTop: '32px' }}>
        {services.map((service) => (
          <article
            key={service.name}
            style={{
              background: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '24px'
            }}
          >
            <h2 style={{ marginTop: 0 }}>{service.name}</h2>
            <p style={{ color: '#475569' }}>{service.description}</p>
            <code>{service.href}/api/v1/health</code>
          </article>
        ))}
      </section>
    </main>
  );
}
