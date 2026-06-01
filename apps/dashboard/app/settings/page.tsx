import { fetchRagConfigs } from '../lib/ragApi';
import { SettingsClient } from './settings-client';

export default async function SettingsPage() {
  const ragConfigsResult = await fetchRagConfigs();
  return (
    <div className="stack settings-page-stack">
      <SettingsClient />

      {!ragConfigsResult.ok ? (
        <section className="panel error-panel">
          <h2>Unable to load active RAG configs</h2>
          <p>{ragConfigsResult.error}</p>
        </section>
      ) : (
        <section className="card">
          <div className="card-header">
            <h2>Active rag configs</h2>
          </div>
          <div className="card-body settings-stack">
            <p className="datasets-note">
              Per-request runtime behavior in query/eval flows is selected by `ragConfigId`.
            </p>
            <div className="settings-config-grid">
              {ragConfigsResult.ragConfigs.map((config) => (
                <article key={config.id} className="metric">
                  <strong>{config.name}</strong>
                  <p>{config.id}</p>
                  <small>
                    {config.answerProvider}/{config.answerModel} · embed {config.embeddingModel} ·{' '}
                    {config.retrievalMode}
                  </small>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
