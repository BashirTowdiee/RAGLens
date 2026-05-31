import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createEvalRun, fetchDatasets } from '../../lib/evalApi';

async function createEvalRunAction(formData: FormData) {
  'use server';

  const datasetId = String(formData.get('dataset_id') ?? '').trim();
  const name = String(formData.get('name') ?? '').trim();
  const ragConfigId = String(formData.get('rag_config_id') ?? '').trim() || 'default';
  const judgeEnabled = formData.get('judge_enabled') === 'on';

  if (!datasetId) {
    redirect('/eval-runs/new?createError=Dataset%20is%20required.');
  }

  const result = await createEvalRun({
    dataset_id: datasetId,
    name,
    rag_config_id: ragConfigId,
    judge_enabled: judgeEnabled
  });

  if (!result.ok) {
    redirect(`/eval-runs/new?createError=${encodeURIComponent(result.error)}`);
  }

  redirect(`/eval-runs/${result.evalRun.id}`);
}

type EvalRunNewSearchParams = {
  createError?: string;
  datasetId?: string;
};

type EvalRunNewPageProps = {
  searchParams?: Promise<EvalRunNewSearchParams>;
};

export default async function EvalRunNewPage({ searchParams }: EvalRunNewPageProps) {
  const datasetsResult = await fetchDatasets();
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const selectedDatasetId = resolvedSearchParams.datasetId;

  return (
    <main style={{ padding: '48px', maxWidth: '960px', margin: '0 auto' }}>
      <Link href="/eval-runs" style={{ color: '#475569', textDecoration: 'none' }}>
        ← Eval runs
      </Link>
      <p style={{ marginTop: '32px', marginBottom: 0, color: '#475569', fontWeight: 600 }}>
        Evaluation
      </p>
      <h1 style={{ marginTop: '12px', fontSize: '44px', lineHeight: 1.05 }}>Create eval run</h1>

      {!datasetsResult.ok ? (
        <section className="panel error-panel">
          <h2>Unable to load datasets</h2>
          <p>{datasetsResult.error}</p>
          <p>Check that eval-api is running, then refresh.</p>
        </section>
      ) : datasetsResult.datasets.length === 0 ? (
        <section className="panel empty-panel">
          <h2>No datasets available</h2>
          <p>Create a dataset before creating eval runs.</p>
          <Link href="/datasets" className="primary-link">
            Open datasets
          </Link>
        </section>
      ) : (
        <section className="panel">
          <form action={createEvalRunAction} style={{ display: 'grid', gap: '16px' }}>
            <label style={{ color: '#475569', display: 'grid', fontWeight: 700, gap: '8px' }}>
              Dataset
              <select
                name="dataset_id"
                defaultValue={
                  selectedDatasetId && datasetsResult.datasets.some((d) => d.id === selectedDatasetId)
                    ? selectedDatasetId
                    : datasetsResult.datasets[0]?.id
                }
                required
                style={{
                  border: '1px solid #cbd5e1',
                  borderRadius: '12px',
                  color: '#0f172a',
                  font: 'inherit',
                  padding: '12px 14px'
                }}
              >
                {datasetsResult.datasets.map((dataset) => (
                  <option key={dataset.id} value={dataset.id}>
                    {dataset.name} · {dataset.version} · {dataset.id}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ color: '#475569', display: 'grid', fontWeight: 700, gap: '8px' }}>
              Name
              <input
                name="name"
                placeholder="Smoke run"
                style={{
                  border: '1px solid #cbd5e1',
                  borderRadius: '12px',
                  color: '#0f172a',
                  font: 'inherit',
                  padding: '12px 14px'
                }}
              />
            </label>

            <label style={{ color: '#475569', display: 'grid', fontWeight: 700, gap: '8px' }}>
              rag_config_id
              <input
                name="rag_config_id"
                defaultValue="default"
                required
                style={{
                  border: '1px solid #cbd5e1',
                  borderRadius: '12px',
                  color: '#0f172a',
                  font: 'inherit',
                  padding: '12px 14px'
                }}
              />
            </label>

            <label
              style={{
                color: '#475569',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: 700
              }}
            >
              <input name="judge_enabled" type="checkbox" defaultChecked />
              judge_enabled
            </label>

            <button
              type="submit"
              style={{
                background: '#0f172a',
                border: 0,
                borderRadius: '12px',
                color: 'white',
                cursor: 'pointer',
                font: 'inherit',
                fontWeight: 700,
                padding: '13px 18px',
                width: 'fit-content'
              }}
            >
              Create eval run
            </button>
          </form>

          {resolvedSearchParams.createError ? (
            <p style={{ color: '#b91c1c' }}>Create eval run failed: {resolvedSearchParams.createError}</p>
          ) : null}
        </section>
      )}
    </main>
  );
}
