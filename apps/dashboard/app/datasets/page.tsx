import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createDataset, fetchDatasets, getEvalApiDisplayBaseUrl } from '../lib/evalApi';

async function createDatasetAction(formData: FormData) {
  'use server';

  const name = String(formData.get('name') ?? '').trim();
  const version = String(formData.get('version') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();

  if (!name || !version) {
    redirect('/datasets?createError=Name%20and%20version%20are%20required.');
  }

  const result = await createDataset({ name, version, description });
  if (!result.ok) {
    redirect(`/datasets?createError=${encodeURIComponent(result.error)}`);
  }

  redirect(`/datasets/${result.dataset.id}?created=1`);
}

type DatasetsSearchParams = {
  createError?: string;
};

type DatasetsPageProps = {
  searchParams?: Promise<DatasetsSearchParams>;
};

export default async function DatasetsPage({ searchParams }: DatasetsPageProps) {
  const result = await fetchDatasets();
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const createError = resolvedSearchParams.createError;

  return (
    <main style={{ padding: '48px', maxWidth: '1120px', margin: '0 auto' }}>
      <Link href="/" style={{ color: '#475569', textDecoration: 'none' }}>
        ← Dashboard
      </Link>
      <p style={{ marginTop: '32px', marginBottom: 0, color: '#475569', fontWeight: 600 }}>
        Evaluation
      </p>
      <h1 style={{ marginTop: '12px', fontSize: '44px', lineHeight: 1.05 }}>Datasets</h1>
      <p style={{ fontSize: '18px', color: '#475569', lineHeight: 1.6 }}>
        Create and manage eval datasets from <code>{getEvalApiDisplayBaseUrl()}/api/v1/datasets</code>.
      </p>

      <section className="panel" style={{ marginTop: '24px' }}>
        <h2 style={{ marginTop: 0 }}>Create dataset</h2>
        <form
          action={createDatasetAction}
          className="comparison-form"
          style={{ gridTemplateColumns: 'repeat(3, minmax(200px, 1fr)) auto' }}
        >
          <label>
            Name
            <input name="name" required />
          </label>
          <label>
            Version
            <input name="version" required placeholder="v1" />
          </label>
          <label>
            Description
            <input name="description" placeholder="Optional notes" />
          </label>
          <button type="submit">Create dataset</button>
        </form>
        {createError ? <p style={{ color: '#b91c1c' }}>Create dataset failed: {createError}</p> : null}
      </section>

      {!result.ok ? (
        <section className="panel error-panel" style={{ marginTop: '24px' }}>
          <h2>Unable to load datasets</h2>
          <p>{result.error}</p>
          <p>
            Start the platform locally with <code>docker compose up --build</code>, then refresh this page.
          </p>
        </section>
      ) : result.datasets.length === 0 ? (
        <section className="panel empty-panel" style={{ marginTop: '24px' }}>
          <h2>No datasets yet</h2>
          <p>Create a dataset to start building test cases and eval runs.</p>
        </section>
      ) : (
        <section style={{ display: 'grid', gap: '16px', marginTop: '24px' }}>
          {result.datasets.map((dataset) => (
            <article key={dataset.id} className="panel">
              <h2 style={{ marginTop: 0 }}>{dataset.name}</h2>
              <p style={{ color: '#475569' }}>
                Version <code>{dataset.version}</code> · Status <strong>{dataset.status}</strong>
              </p>
              <p style={{ color: '#475569' }}>{dataset.description || 'No description provided.'}</p>
              <Link href={`/datasets/${dataset.id}`} className="primary-link">
                Open dataset
              </Link>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
