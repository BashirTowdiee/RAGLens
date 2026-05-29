import Link from 'next/link';
import { DevToolsClient } from './devtools-client';
import { getEvalApiDisplayBaseUrl } from '../lib/evalApi';
import { getRagApiDisplayBaseUrl } from '../lib/ragApi';

export default function DevToolsPage() {
  return (
    <main style={{ padding: '48px', maxWidth: '1120px', margin: '0 auto' }}>
      <Link href="/" style={{ color: '#475569', textDecoration: 'none' }}>
        ← Dashboard
      </Link>
      <p style={{ marginTop: '32px', marginBottom: 0, color: '#475569', fontWeight: 600 }}>
        Developer tools
      </p>
      <h1 style={{ marginTop: '12px', fontSize: '44px', lineHeight: 1.05 }}>
        Call rag-api and eval-api directly
      </h1>
      <p style={{ fontSize: '18px', color: '#475569', lineHeight: 1.6 }}>
        This page sends requests through a dashboard proxy at <code>/api/devtools</code> so local browser
        CORS rules do not block calls to backend services.
      </p>

      <section className="panel" style={{ marginTop: '24px' }}>
        <h2 style={{ marginTop: 0 }}>Connected services</h2>
        <ul className="devtools-service-list">
          <li>
            <strong>rag-api</strong>: <code>{getRagApiDisplayBaseUrl()}</code>
          </li>
          <li>
            <strong>eval-api</strong>: <code>{getEvalApiDisplayBaseUrl()}</code>
          </li>
        </ul>
        <p style={{ color: '#475569', marginBottom: 0 }}>
          Paths are limited to <code>/api/v1/*</code> for safety and consistency with public API contracts.
        </p>
      </section>

      <DevToolsClient />
    </main>
  );
}
