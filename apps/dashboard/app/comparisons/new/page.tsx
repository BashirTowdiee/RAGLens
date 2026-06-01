import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  createComparison,
  createEvalRun,
  executeEvalRun,
  fetchDatasets,
} from '../../lib/evalApi';
import { fetchRagConfigs } from '../../lib/ragApi';

async function createPresetComparisonAction(formData: FormData) {
  'use server';

  const datasetId = String(formData.get('dataset_id') ?? '').trim();
  const baselineConfigId = String(formData.get('baseline_rag_config_id') ?? '').trim();
  const candidateConfigId = String(formData.get('candidate_rag_config_id') ?? '').trim();
  const maxCases = Number(String(formData.get('max_cases') ?? '5'));

  if (!datasetId || !baselineConfigId || !candidateConfigId) {
    redirect('/comparisons/new?error=Dataset%20and%20both%20RAG%20configs%20are%20required.');
  }

  const baselineRun = await createEvalRun({
    dataset_id: datasetId,
    name: `Baseline · ${baselineConfigId}`,
    rag_config_id: baselineConfigId,
    judge_enabled: true,
  });

  if (!baselineRun.ok) {
    redirect(`/comparisons/new?error=${encodeURIComponent(`Baseline run create failed: ${baselineRun.error}`)}`);
  }

  const candidateRun = await createEvalRun({
    dataset_id: datasetId,
    name: `Candidate · ${candidateConfigId}`,
    rag_config_id: candidateConfigId,
    judge_enabled: true,
  });

  if (!candidateRun.ok) {
    redirect(`/comparisons/new?error=${encodeURIComponent(`Candidate run create failed: ${candidateRun.error}`)}`);
  }

  const baselineExecute = await executeEvalRun(baselineRun.evalRun.id, {
    maxCases: Number.isFinite(maxCases) && maxCases > 0 ? maxCases : 5,
  });
  if (!baselineExecute.ok) {
    redirect(`/comparisons/new?error=${encodeURIComponent(`Baseline run execute failed: ${baselineExecute.error}`)}`);
  }

  const candidateExecute = await executeEvalRun(candidateRun.evalRun.id, {
    maxCases: Number.isFinite(maxCases) && maxCases > 0 ? maxCases : 5,
  });
  if (!candidateExecute.ok) {
    redirect(`/comparisons/new?error=${encodeURIComponent(`Candidate run execute failed: ${candidateExecute.error}`)}`);
  }

  const comparison = await createComparison(baselineRun.evalRun.id, candidateRun.evalRun.id);
  if (!comparison.ok) {
    redirect(`/comparisons/new?error=${encodeURIComponent(`Comparison create failed: ${comparison.error}`)}`);
  }

  redirect(`/comparisons/${comparison.comparison.id}`);
}

type ComparisonWizardSearchParams = {
  error?: string;
};

type ComparisonWizardPageProps = {
  searchParams?: Promise<ComparisonWizardSearchParams>;
};

export default async function ComparisonWizardPage({ searchParams }: ComparisonWizardPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const [datasetsResult, ragConfigsResult] = await Promise.all([
    fetchDatasets(),
    fetchRagConfigs(),
  ]);

  return (
    <div className="stack eval-runs-stack comparison-wizard-stack">
      <Link href="/eval-runs" className="back-link">← Eval runs</Link>

      <section className="card comparison-wizard-intro-card">
        <div className="card-header"><h2>Provider comparison wizard</h2></div>
        <div className="card-body">
          <p className="eval-runs-note">
            Create baseline and candidate eval runs from named RAG configs, execute both, then open comparison details.
          </p>
        </div>
      </section>

      {!datasetsResult.ok ? (
        <section className="panel error-panel"><h2>Unable to load datasets</h2><p>{datasetsResult.error}</p></section>
      ) : !ragConfigsResult.ok ? (
        <section className="panel error-panel comparison-wizard-error-panel">
          <h2>Unable to load RAG configs</h2>
          <p>{ragConfigsResult.error}</p>
          <p className="eval-runs-note">
            If this is a fresh environment, apply the latest database migrations, including
            <code>017_rag_configs_and_embedding_cutover</code>.
          </p>
        </section>
      ) : datasetsResult.datasets.length === 0 ? (
        <section className="panel empty-panel"><h2>No datasets available</h2><p>Create a dataset first.</p></section>
      ) : ragConfigsResult.ragConfigs.length < 2 ? (
        <section className="panel empty-panel"><h2>Not enough RAG configs</h2><p>Create at least two active RAG configs.</p></section>
      ) : (
        <section className="card comparison-wizard-form-card">
          <div className="card-header"><h2>Create + execute + compare</h2></div>
          <div className="card-body">
            {resolvedSearchParams.error ? (
              <p className="eval-runs-error">Wizard failed: {resolvedSearchParams.error}</p>
            ) : null}
            <form action={createPresetComparisonAction} className="comparison-form eval-runs-comparison-form comparison-wizard-form">
              <label>
                Dataset
                <select name="dataset_id" required>
                  {datasetsResult.datasets.map((dataset) => (
                    <option key={dataset.id} value={dataset.id}>
                      {dataset.name} · {dataset.version} · {dataset.id}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Baseline RAG config
                <select name="baseline_rag_config_id" required>
                  {ragConfigsResult.ragConfigs.map((config) => (
                    <option key={config.id} value={config.id}>
                      {config.name} · {config.id}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Candidate RAG config
                <select name="candidate_rag_config_id" defaultValue={ragConfigsResult.ragConfigs[1]?.id ?? ragConfigsResult.ragConfigs[0]?.id} required>
                  {ragConfigsResult.ragConfigs.map((config) => (
                    <option key={config.id} value={config.id}>
                      {config.name} · {config.id}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                maxCases
                <input name="max_cases" type="number" min={1} step={1} defaultValue={5} />
              </label>

              <button type="submit">Run comparison wizard</button>
            </form>
          </div>
        </section>
      )}
    </div>
  );
}
