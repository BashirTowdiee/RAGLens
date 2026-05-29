import { describe, expect, it } from 'vitest';
import { buildApp } from '../app.js';

const config = {
  NODE_ENV: 'test',
  PORT: 8000,
  DATABASE_URL: 'postgres://raglens:raglens@localhost:5432/raglens',
  DOCUMENT_REPOSITORY: 'memory' as const
};

describe('document routes', () => {
  it('ingests markdown and returns document chunks', async () => {
    const app = buildApp(config);

    const ingestResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/documents/ingest',
      payload: {
        sourceId: 'remote-work-policy-test',
        title: 'Remote Work Policy Test',
        sourceType: 'markdown',
        version: '1.0.0',
        content: '# Remote Work Policy\n\n## Eligibility\n\nEmployees may work remotely.',
        metadata: { category: 'policy' }
      }
    });

    expect(ingestResponse.statusCode).toBe(201);
    const ingestBody = ingestResponse.json();
    expect(ingestBody.document.sourceId).toBe('remote-work-policy-test');
    expect(ingestBody.chunks).toHaveLength(2);

    const listResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/documents'
    });

    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json().documents).toHaveLength(1);

    const chunksResponse = await app.inject({
      method: 'GET',
      url: `/api/v1/documents/${ingestBody.document.id}/chunks`
    });

    expect(chunksResponse.statusCode).toBe(200);
    expect(chunksResponse.json().chunks[1].headingPath).toEqual([
      'Remote Work Policy',
      'Eligibility'
    ]);
  });

  it('retrieves ranked chunks for a query with stable source metadata', async () => {
    const app = buildApp(config);

    await app.inject({
      method: 'POST',
      url: '/api/v1/documents/ingest',
      payload: {
        sourceId: 'remote-work-policy-search',
        title: 'Remote Work Search Policy',
        sourceType: 'markdown',
        version: '1.0.0',
        content: '# Remote Work\n\n## Eligibility\n\nEmployees may work remotely two days per week.\n\n## Equipment\n\nEmployees receive laptops and monitors.'
      }
    });

    await app.inject({
      method: 'POST',
      url: '/api/v1/documents/ingest',
      payload: {
        sourceId: 'expense-policy-search',
        title: 'Expense Search Policy',
        sourceType: 'markdown',
        version: '1.0.0',
        content: '# Expense Policy\n\n## Reimbursement\n\nEmployees can claim approved travel expenses.'
      }
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/documents/search?q=remote%20employees&limit=2'
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.query).toBe('remote employees');
    expect(body.traceId).toEqual(expect.any(String));
    expect(body.chunks).toHaveLength(2);
    expect(body.chunks[0].score).toBeGreaterThanOrEqual(body.chunks[1].score);
    expect(body.chunks[0].document.sourceId).toBe('remote-work-policy-search');
    expect(body.chunks[0].document.title).toBe('Remote Work Search Policy');
  });

  it('captures and returns retrieval traces', async () => {
    const app = buildApp(config);

    await app.inject({
      method: 'POST',
      url: '/api/v1/documents/ingest',
      payload: {
        sourceId: 'trace-policy-search',
        title: 'Trace Search Policy',
        sourceType: 'markdown',
        version: '1.0.0',
        content: '# Trace Policy\n\n## Retrieval\n\nRetrieval traces capture query metadata and ranked chunks.'
      }
    });

    const searchResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/documents/search?q=retrieval%20traces&limit=1'
    });

    expect(searchResponse.statusCode).toBe(200);
    const searchBody = searchResponse.json();
    expect(searchBody.traceId).toEqual(expect.any(String));

    const traceResponse = await app.inject({
      method: 'GET',
      url: `/api/v1/retrieval-traces/${searchBody.traceId}`
    });

    expect(traceResponse.statusCode).toBe(200);
    const traceBody = traceResponse.json();
    expect(traceBody.trace.query).toBe('retrieval traces');
    expect(traceBody.trace.limit).toBe(1);
    expect(traceBody.trace.resultCount).toBe(1);
    expect(traceBody.trace.durationMs).toEqual(expect.any(Number));
    expect(traceBody.trace.chunks[0].rank).toBe(1);
    expect(traceBody.trace.chunks[0].sourceId).toBe('trace-policy-search');
  });

  it('applies metadata filters for search routes', async () => {
    const app = buildApp(config);

    await app.inject({
      method: 'POST',
      url: '/api/v1/documents/ingest',
      payload: {
        sourceId: 'trace-policy-au',
        title: 'Trace Search AU Policy',
        sourceType: 'markdown',
        version: '1.0.0',
        metadata: { region: 'au', type: 'policy' },
        content: '# Trace Policy\n\nRetrieval traces capture query metadata and ranked chunks.'
      }
    });

    await app.inject({
      method: 'POST',
      url: '/api/v1/documents/ingest',
      payload: {
        sourceId: 'trace-policy-us',
        title: 'Trace Search US Policy',
        sourceType: 'markdown',
        version: '1.0.0',
        metadata: { region: 'us', type: 'policy' },
        content: '# Trace Policy\n\nRetrieval traces capture query metadata and ranked chunks.'
      }
    });

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/documents/search?q=retrieval%20traces&mode=hybrid&metadataFilters=${encodeURIComponent(
        JSON.stringify({ region: 'au' })
      )}`
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.chunks).toHaveLength(1);
    expect(body.chunks[0].document.sourceId).toBe('trace-policy-au');
  });

  it('rewrites keyword retrieval queries by default and reports retrieval query metadata', async () => {
    const app = buildApp(config);

    await app.inject({
      method: 'POST',
      url: '/api/v1/documents/ingest',
      payload: {
        sourceId: 'pto-policy',
        title: 'PTO Policy',
        sourceType: 'markdown',
        version: '1.0.0',
        content: '# Leave\n\nEmployees can request paid time off leave through HR.'
      }
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/documents/search?q=pto&mode=keyword&limit=1'
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.query).toBe('pto');
    expect(body.queryRewriteEnabled).toBe(true);
    expect(body.retrievalQuery).toBe('pto paid time off leave');
    expect(body.chunks).toHaveLength(1);
    expect(body.chunks[0].document.sourceId).toBe('pto-policy');
  });

  it('supports opt-out for query rewriting on keyword retrieval', async () => {
    const app = buildApp(config);

    await app.inject({
      method: 'POST',
      url: '/api/v1/documents/ingest',
      payload: {
        sourceId: 'pto-policy-no-rewrite',
        title: 'PTO Policy No Rewrite',
        sourceType: 'markdown',
        version: '1.0.0',
        content: '# Leave\n\nEmployees can request paid time off leave through HR.'
      }
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/documents/search?q=pto&mode=keyword&rewriteQuery=false&limit=1'
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.queryRewriteEnabled).toBe(false);
    expect(body.retrievalQuery).toBe('pto');
    expect(body.chunks).toHaveLength(0);
  });

  it('rejects invalid metadata filter query payloads', async () => {
    const app = buildApp(config);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/documents/search?q=retrieval&metadataFilters=not-json'
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error).toBe('invalid_search_query');
  });

  it('returns 404 for missing retrieval traces', async () => {
    const app = buildApp(config);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/retrieval-traces/missing-trace-id'
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error).toBe('retrieval_trace_not_found');
  });

  it('rejects empty retrieval queries', async () => {
    const app = buildApp(config);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/documents/search?q='
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error).toBe('invalid_search_query');
  });

  it('rejects empty document content', async () => {
    const app = buildApp(config);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/documents/ingest',
      payload: {
        sourceId: 'empty-doc',
        title: 'Empty Doc',
        sourceType: 'markdown',
        content: ''
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error).toBe('invalid_document_payload');
  });

  it('returns 404 for missing documents', async () => {
    const app = buildApp(config);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/documents/missing-document-id'
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error).toBe('document_not_found');
  });
});
