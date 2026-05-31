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
    <div className="stack datasets-stack">
      <section className="card">
        <div className="card-header">
          <h2>Create dataset</h2>
        </div>
        <div className="card-body">
        <p className="datasets-note">
          Create and manage eval datasets from <code>{getEvalApiDisplayBaseUrl()}/api/v1/datasets</code>.
        </p>
        <form
          action={createDatasetAction}
          className="comparison-form datasets-create-form"
          id="create-dataset"
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
        {createError ? <p className="datasets-error">Create dataset failed: {createError}</p> : null}
        </div>
      </section>

      {!result.ok ? (
        <section className="panel error-panel">
          <h2>Unable to load datasets</h2>
          <p>{result.error}</p>
          <p>
            Start the platform locally with <code>docker compose up --build</code>, then refresh this page.
          </p>
        </section>
      ) : result.datasets.length === 0 ? (
        <section className="panel empty-panel">
          <h2>No datasets yet</h2>
          <p>Create a dataset to start building test cases and eval runs.</p>
        </section>
      ) : (
        <section className="datasets-list">
          {result.datasets.map((dataset) => (
            <article key={dataset.id} className="card">
              <div className="card-body datasets-item">
                <h3>{dataset.name}</h3>
                <p className="datasets-meta">
                  Version <span className="pill neutral">{dataset.version}</span> · Status <strong>{dataset.status}</strong>
                </p>
                <p className="datasets-note">{dataset.description || 'No description provided.'}</p>
              <Link href={`/datasets/${dataset.id}`} className="button">
                Open dataset
              </Link>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
