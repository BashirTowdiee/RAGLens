import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  createDatasetTestCase,
  fetchDataset,
  fetchDatasetTestCases,
  getEvalApiBaseUrl,
  getEvalApiDisplayBaseUrl
} from '../../lib/evalApi';

async function createDatasetTestCaseAction(formData: FormData) {
  'use server';

  const datasetId = String(formData.get('datasetId') ?? '').trim();
  const question = String(formData.get('question') ?? '').trim();
  const expectedAnswer = String(formData.get('expected_answer') ?? '').trim();
  const referenceCitationsRaw = String(formData.get('reference_citations') ?? '');

  if (!datasetId || !question || !expectedAnswer) {
    redirect(
      `/datasets/${datasetId}?createTestCaseError=${encodeURIComponent(
        'Question and expected answer are required.'
      )}`
    );
  }

  const referenceCitations = referenceCitationsRaw
    .split('\n')
    .map((citation) => citation.trim())
    .filter(Boolean);

  const result = await createDatasetTestCase(datasetId, {
    question,
    expected_answer: expectedAnswer,
    reference_citations: referenceCitations
  });

  if (!result.ok) {
    redirect(`/datasets/${datasetId}?createTestCaseError=${encodeURIComponent(result.error)}`);
  }

  redirect(`/datasets/${datasetId}?testCaseCreated=1`);
}

type DatasetDetailSearchParams = {
  createTestCaseError?: string;
  created?: string;
  testCaseCreated?: string;
};

type DatasetDetailPageProps = {
  params: Promise<{ datasetId: string }>;
  searchParams?: Promise<DatasetDetailSearchParams>;
};

export default async function DatasetDetailPage({ params, searchParams }: DatasetDetailPageProps) {
  const { datasetId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const [datasetResult, testCaseResult] = await Promise.all([
    fetchDataset(datasetId),
    fetchDatasetTestCases(datasetId)
  ]);

  return (
    <div className="stack datasets-stack">
      <Link href="/datasets" className="button-ghost">
        ← Datasets
      </Link>

      {!datasetResult.ok ? (
        <section className="panel error-panel">
          <h1>Unable to load dataset</h1>
          <p>{datasetResult.error}</p>
          <p>
            Expected endpoint: <code>{getEvalApiBaseUrl()}/api/v1/datasets/{datasetId}</code>
          </p>
        </section>
      ) : (
        <>
          <section className="card">
            <div className="card-header">
              <h2>{datasetResult.dataset.name}</h2>
              <Link
                href={`/eval-runs/new?datasetId=${encodeURIComponent(datasetId)}`}
                className="button"
              >
                Create eval run
              </Link>
            </div>
            <div className="card-body">
              <p className="datasets-meta">
                Version <span className="pill neutral">{datasetResult.dataset.version}</span> · Status{' '}
                <strong>{datasetResult.dataset.status}</strong>
              </p>
              <p className="datasets-note">{datasetResult.dataset.description || 'No description provided.'}</p>
            </div>
          </section>

          {resolvedSearchParams.created ? (
            <section className="panel datasets-success">
              <p>Dataset created successfully.</p>
            </section>
          ) : null}

          {resolvedSearchParams.testCaseCreated ? (
            <section className="panel datasets-success">
              <p>Test case created successfully.</p>
            </section>
          ) : null}

          <section className="card">
            <div className="card-header">
              <h2>Add test case</h2>
            </div>
            <div className="card-body">
            <form action={createDatasetTestCaseAction} className="datasets-testcase-form">
              <input type="hidden" name="datasetId" value={datasetId} />
              <label>
                Question
                <textarea name="question" required rows={3} />
              </label>
              <label>
                Expected answer
                <textarea name="expected_answer" required rows={4} />
              </label>
              <label>
                Reference citations (one per line)
                <textarea name="reference_citations" rows={4} />
              </label>
              <button type="submit">Add test case</button>
            </form>
            {resolvedSearchParams.createTestCaseError ? (
              <p className="datasets-error">
                Create test case failed: {resolvedSearchParams.createTestCaseError}
              </p>
            ) : null}
            </div>
          </section>

          <section className="card">
            <div className="card-header">
              <h2>Test cases</h2>
            </div>
            <div className="card-body">
            <p className="datasets-note">
              Data source: <code>{getEvalApiDisplayBaseUrl()}/api/v1/datasets/{datasetId}/test-cases</code>
            </p>
            {!testCaseResult.ok ? (
              <p className="datasets-error">Unable to load test cases: {testCaseResult.error}</p>
            ) : testCaseResult.testCases.length === 0 ? (
              <p className="datasets-note">No test cases yet.</p>
            ) : (
              <div className="datasets-case-list">
                {testCaseResult.testCases.map((testCase) => (
                  <article key={testCase.id} className="datasets-case-item">
                    <p>
                      <strong>Q:</strong> {testCase.question}
                    </p>
                    <p>
                      <strong>Expected:</strong> {testCase.expected_answer}
                    </p>
                    <p>
                      <strong>Reference citations:</strong>{' '}
                      {testCase.reference_citations.length > 0
                        ? testCase.reference_citations.join(', ')
                        : 'none'}
                    </p>
                  </article>
                ))}
              </div>
            )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
