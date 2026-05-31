import Link from 'next/link';
import { getEvalApiDisplayBaseUrl } from './lib/evalApi';
import { getRagApiDisplayBaseUrl } from './lib/ragApi';

const services = [
  {
    name: 'rag-api',
    description: 'Answers questions, stores query traces, and owns document ingestion.',
    href: getRagApiDisplayBaseUrl()
  },
  {
    name: 'eval-api',
    description: 'Runs datasets, scores RAG quality, and reports regressions.',
    href: getEvalApiDisplayBaseUrl()
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

        <article className="panel">
          <h2 style={{ marginTop: 0 }}>Datasets</h2>
          <p style={{ color: '#475569', lineHeight: 1.6 }}>
            Build eval datasets and test cases, then use them to create and execute eval runs.
          </p>
          <Link href="/datasets" className="primary-link">
            Manage datasets
          </Link>
        </article>

        <article className="panel">
          <h2 style={{ marginTop: 0 }}>Eval run inspector</h2>
          <p style={{ color: '#475569', lineHeight: 1.6 }}>
            Create and execute eval runs, then review status, pass rate, judge enablement, and failure type rollups.
          </p>
          <Link href="/eval-runs" className="primary-link">
            View eval runs
          </Link>
        </article>

        <article className="panel">
          <h2 style={{ marginTop: 0 }}>Developer tools</h2>
          <p style={{ color: '#475569', lineHeight: 1.6 }}>
            Call any supported <code>/api/v1</code> endpoint in rag-api or eval-api through a same-origin dashboard proxy for debugging and contract validation.
          </p>
          <Link href="/devtools" className="primary-link">
            Open devtools
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
