import { DevToolsClient } from './devtools-client';
import { getEvalApiDisplayBaseUrl } from '../lib/evalApi';
import { getRagApiDisplayBaseUrl } from '../lib/ragApi';

export default function DevToolsPage() {
  return (
    <div className="stack devtools-stack">
      <section className="card">
        <div className="card-header">
          <h2>Call rag-api and eval-api directly</h2>
        </div>
        <div className="card-body">
          <p className="devtools-intro">
            This page sends requests through a dashboard proxy at <code>/api/devtools</code> so local browser
            CORS rules do not block calls to backend services.
          </p>
        </div>
      </section>

      <section className="card">
        <div className="card-header">
          <h2>Connected services</h2>
        </div>
        <div className="card-body">
        <ul className="devtools-service-list">
          <li>
            <strong>rag-api</strong>: <code>{getRagApiDisplayBaseUrl()}</code>
          </li>
          <li>
            <strong>eval-api</strong>: <code>{getEvalApiDisplayBaseUrl()}</code>
          </li>
        </ul>
        <p className="devtools-note">
          Paths are limited to <code>/api/v1/*</code> for safety and consistency with public API contracts.
        </p>
        </div>
      </section>

      <DevToolsClient />
    </div>
  );
}
