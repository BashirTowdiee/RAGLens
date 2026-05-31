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
    <div className="stack eval-runs-stack">
      <Link href="/eval-runs" className="button-ghost">← Eval runs</Link>

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
          <Link href="/datasets" className="button">Open datasets</Link>
        </section>
      ) : (
        <section className="card">
          <div className="card-header"><h2>Create eval run</h2></div>
          <div className="card-body">
            <form action={createEvalRunAction} className="eval-runs-new-form">
              <label>
                Dataset
                <select
                  name="dataset_id"
                  defaultValue={
                    selectedDatasetId && datasetsResult.datasets.some((d) => d.id === selectedDatasetId)
                      ? selectedDatasetId
                      : datasetsResult.datasets[0]?.id
                  }
                  required
                >
                  {datasetsResult.datasets.map((dataset) => (
                    <option key={dataset.id} value={dataset.id}>
                      {dataset.name} · {dataset.version} · {dataset.id}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Name
                <input name="name" placeholder="Smoke run" />
              </label>

              <label>
                rag_config_id
                <input name="rag_config_id" defaultValue="default" required />
              </label>

              <label className="eval-runs-checkbox-row">
                <input name="judge_enabled" type="checkbox" defaultChecked />
                judge_enabled
              </label>

              <button type="submit">Create eval run</button>
            </form>

            {resolvedSearchParams.createError ? (
              <p className="eval-runs-error">Create eval run failed: {resolvedSearchParams.createError}</p>
            ) : null}
          </div>
        </section>
      )}
    </div>
  );
}
