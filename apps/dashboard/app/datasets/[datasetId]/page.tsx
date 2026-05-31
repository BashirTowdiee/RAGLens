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
    <main style={{ padding: '48px', maxWidth: '1120px', margin: '0 auto' }}>
      <Link href="/datasets" style={{ color: '#475569', textDecoration: 'none' }}>
        ← Datasets
      </Link>
      <p style={{ marginTop: '32px', marginBottom: 0, color: '#475569', fontWeight: 600 }}>
        Evaluation dataset
      </p>

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
          <h1 style={{ marginTop: '12px', fontSize: '44px', lineHeight: 1.05 }}>
            {datasetResult.dataset.name}
          </h1>
          <p style={{ fontSize: '18px', color: '#475569', lineHeight: 1.6 }}>
            Version <code>{datasetResult.dataset.version}</code> · Status{' '}
            <strong>{datasetResult.dataset.status}</strong>
          </p>
          <p style={{ color: '#475569' }}>
            {datasetResult.dataset.description || 'No description provided.'}
          </p>

          {resolvedSearchParams.created ? (
            <section
              className="panel"
              style={{ marginTop: '16px', borderColor: '#86efac', background: '#f0fdf4' }}
            >
              <p style={{ margin: 0, color: '#166534' }}>Dataset created successfully.</p>
            </section>
          ) : null}

          {resolvedSearchParams.testCaseCreated ? (
            <section
              className="panel"
              style={{ marginTop: '16px', borderColor: '#86efac', background: '#f0fdf4' }}
            >
              <p style={{ margin: 0, color: '#166534' }}>Test case created successfully.</p>
            </section>
          ) : null}

          <section className="panel" style={{ marginTop: '24px' }}>
            <h2 style={{ marginTop: 0 }}>Add test case</h2>
            <form action={createDatasetTestCaseAction} style={{ display: 'grid', gap: '16px' }}>
              <input type="hidden" name="datasetId" value={datasetId} />
              <label style={{ color: '#475569', display: 'grid', fontWeight: 700, gap: '8px' }}>
                Question
                <textarea
                  name="question"
                  required
                  rows={3}
                  style={{
                    border: '1px solid #cbd5e1',
                    borderRadius: '12px',
                    font: 'inherit',
                    padding: '12px 14px'
                  }}
                />
              </label>
              <label style={{ color: '#475569', display: 'grid', fontWeight: 700, gap: '8px' }}>
                Expected answer
                <textarea
                  name="expected_answer"
                  required
                  rows={4}
                  style={{
                    border: '1px solid #cbd5e1',
                    borderRadius: '12px',
                    font: 'inherit',
                    padding: '12px 14px'
                  }}
                />
              </label>
              <label style={{ color: '#475569', display: 'grid', fontWeight: 700, gap: '8px' }}>
                Reference citations (one per line)
                <textarea
                  name="reference_citations"
                  rows={4}
                  style={{
                    border: '1px solid #cbd5e1',
                    borderRadius: '12px',
                    font: 'inherit',
                    padding: '12px 14px'
                  }}
                />
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
                Add test case
              </button>
            </form>
            {resolvedSearchParams.createTestCaseError ? (
              <p style={{ color: '#b91c1c' }}>
                Create test case failed: {resolvedSearchParams.createTestCaseError}
              </p>
            ) : null}
          </section>

          <section className="panel" style={{ marginTop: '24px' }}>
            <h2 style={{ marginTop: 0 }}>Test cases</h2>
            <p style={{ color: '#475569' }}>
              Data source: <code>{getEvalApiDisplayBaseUrl()}/api/v1/datasets/{datasetId}/test-cases</code>
            </p>
            {!testCaseResult.ok ? (
              <p style={{ color: '#b91c1c' }}>Unable to load test cases: {testCaseResult.error}</p>
            ) : testCaseResult.testCases.length === 0 ? (
              <p style={{ color: '#475569' }}>No test cases yet.</p>
            ) : (
              <div style={{ display: 'grid', gap: '12px' }}>
                {testCaseResult.testCases.map((testCase) => (
                  <article
                    key={testCase.id}
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '16px'
                    }}
                  >
                    <p style={{ marginTop: 0, marginBottom: '8px' }}>
                      <strong>Q:</strong> {testCase.question}
                    </p>
                    <p style={{ marginTop: 0, marginBottom: '8px', color: '#334155' }}>
                      <strong>Expected:</strong> {testCase.expected_answer}
                    </p>
                    <p style={{ marginTop: 0, marginBottom: 0, color: '#475569' }}>
                      <strong>Reference citations:</strong>{' '}
                      {testCase.reference_citations.length > 0
                        ? testCase.reference_citations.join(', ')
                        : 'none'}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section style={{ marginTop: '24px' }}>
            <Link
              href={`/eval-runs/new?datasetId=${encodeURIComponent(datasetId)}`}
              className="primary-link"
            >
              Create eval run for this dataset
            </Link>
          </section>
        </>
      )}
    </main>
  );
}
