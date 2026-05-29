'use client';

import { FormEvent, useMemo, useState } from 'react';

type BackendService = 'rag' | 'eval';
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

type Preset = {
  label: string;
  service: BackendService;
  method: HttpMethod;
  path: string;
  queryString?: string;
  body?: string;
};

const presets: Preset[] = [
  { label: 'RAG health', service: 'rag', method: 'GET', path: '/api/v1/health' },
  { label: 'RAG list documents', service: 'rag', method: 'GET', path: '/api/v1/documents' },
  {
    label: 'RAG search chunks',
    service: 'rag',
    method: 'GET',
    path: '/api/v1/documents/search',
    queryString: 'q=remote%20work&limit=5&mode=hybrid'
  },
  {
    label: 'RAG query',
    service: 'rag',
    method: 'POST',
    path: '/api/v1/query',
    body: '{\n  "question": "How often can employees work remotely?",\n  "retrievalMode": "hybrid"\n}'
  },
  { label: 'RAG list query traces', service: 'rag', method: 'GET', path: '/api/v1/queries' },
  { label: 'Eval health', service: 'eval', method: 'GET', path: '/api/v1/health' },
  { label: 'Eval list runs', service: 'eval', method: 'GET', path: '/api/v1/eval-runs' },
  {
    label: 'Eval create run',
    service: 'eval',
    method: 'POST',
    path: '/api/v1/eval-runs',
    body: '{\n  "dataset_id": "replace-with-dataset-id",\n  "name": "Devtools run",\n  "rag_config_id": "default",\n  "judge_enabled": true\n}'
  },
  {
    label: 'Eval execute run',
    service: 'eval',
    method: 'POST',
    path: '/api/v1/eval-runs/replace-with-eval-run-id/execute',
    queryString: 'maxCases=5'
  },
  {
    label: 'Eval CI evaluate',
    service: 'eval',
    method: 'POST',
    path: '/api/v1/ci/evaluate',
    body: '{\n  "eval_run_id": "replace-with-eval-run-id",\n  "preset": "deterministic-smoke"\n}'
  }
];

export function DevToolsClient() {
  const [service, setService] = useState<BackendService>('rag');
  const [method, setMethod] = useState<HttpMethod>('GET');
  const [path, setPath] = useState('/api/v1/health');
  const [queryString, setQueryString] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [responseText, setResponseText] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const methodSupportsBody = useMemo(() => method !== 'GET', [method]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setResponseText('');

    let parsedBody: unknown;
    if (methodSupportsBody && bodyText.trim()) {
      try {
        parsedBody = JSON.parse(bodyText);
      } catch {
        setError('Body must be valid JSON for non-GET requests.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/devtools', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          service,
          method,
          path,
          queryString,
          body: parsedBody
        })
      });
      const payload = await response.json();
      setResponseText(JSON.stringify(payload, null, 2));
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Unable to submit request to devtools proxy.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function applyPreset(label: string) {
    const preset = presets.find((entry) => entry.label === label);
    if (!preset) {
      return;
    }

    setService(preset.service);
    setMethod(preset.method);
    setPath(preset.path);
    setQueryString(preset.queryString ?? '');
    setBodyText(preset.body ?? '');
    setError('');
  }

  return (
    <>
      <section className="panel" style={{ marginTop: '32px' }}>
        <h2 style={{ marginTop: 0 }}>Request presets</h2>
        <p style={{ color: '#475569' }}>
          Load a preset, adjust identifiers (dataset/eval run IDs), and send the request.
        </p>
        <div className="devtools-preset-grid">
          {presets.map((preset) => (
            <button
              key={preset.label}
              className="devtools-preset-button"
              onClick={() => applyPreset(preset.label)}
              type="button"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </section>

      <section className="panel" style={{ marginTop: '24px' }}>
        <h2 style={{ marginTop: 0 }}>Request builder</h2>
        <form className="devtools-form" onSubmit={onSubmit}>
          <label>
            Service
            <select value={service} onChange={(event) => setService(event.target.value as BackendService)}>
              <option value="rag">rag-api</option>
              <option value="eval">eval-api</option>
            </select>
          </label>

          <label>
            Method
            <select value={method} onChange={(event) => setMethod(event.target.value as HttpMethod)}>
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="PATCH">PATCH</option>
              <option value="DELETE">DELETE</option>
            </select>
          </label>

          <label className="devtools-path-label">
            Path
            <input
              value={path}
              onChange={(event) => setPath(event.target.value)}
              placeholder="/api/v1/..."
              required
            />
          </label>

          <label className="devtools-path-label">
            Query string (optional)
            <input
              value={queryString}
              onChange={(event) => setQueryString(event.target.value)}
              placeholder="q=remote%20work&limit=5"
            />
          </label>

          <label className="devtools-body-label">
            JSON body
            <textarea
              value={bodyText}
              onChange={(event) => setBodyText(event.target.value)}
              placeholder='{\n  "key": "value"\n}'
              disabled={!methodSupportsBody}
            />
          </label>

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Sending...' : 'Send request'}
          </button>
        </form>

        {error ? <p style={{ color: '#b91c1c' }}>{error}</p> : null}
      </section>

      <section className="panel" style={{ marginTop: '24px' }}>
        <h2 style={{ marginTop: 0 }}>Response</h2>
        {responseText ? (
          <pre className="devtools-response">{responseText}</pre>
        ) : (
          <p style={{ color: '#475569' }}>Send a request to inspect the backend response.</p>
        )}
      </section>
    </>
  );
}
