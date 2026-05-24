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
    expect(body.chunks).toHaveLength(2);
    expect(body.chunks[0].score).toBeGreaterThanOrEqual(body.chunks[1].score);
    expect(body.chunks[0].document.sourceId).toBe('remote-work-policy-search');
    expect(body.chunks[0].document.title).toBe('Remote Work Search Policy');
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
