import { getEvalApiDisplayBaseUrl } from '../lib/evalApi';
import { getRagApiDisplayBaseUrl } from '../lib/ragApi';

export default function SettingsPage() {
  return (
    <div className="stack">
      <section className="card">
        <div className="card-header">
          <h2>Runtime settings</h2>
        </div>
        <div className="card-body">
          <dl className="metric-grid">
            <div className="metric">
              <dt>Environment</dt>
              <dd>local</dd>
            </div>
            <div className="metric">
              <dt>Boundary</dt>
              <dd>rag-api + eval-api</dd>
            </div>
            <div className="metric">
              <dt>rag-api base URL</dt>
              <dd>
                <code>{getRagApiDisplayBaseUrl()}</code>
              </dd>
            </div>
            <div className="metric">
              <dt>eval-api base URL</dt>
              <dd>
                <code>{getEvalApiDisplayBaseUrl()}</code>
              </dd>
            </div>
          </dl>
        </div>
      </section>
    </div>
  );
}
