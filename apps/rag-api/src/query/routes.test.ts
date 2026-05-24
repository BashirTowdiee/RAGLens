import { describe, expect, it } from 'vitest';
import { buildApp } from '../app.js';

const config = {
  NODE_ENV: 'test',
  PORT: 8000,
  DATABASE_URL: 'postgres://raglens:raglens@localhost:5432/raglens',
  DOCUMENT_REPOSITORY: 'memory' as const
};

describe('query routes', () => {
  it('answers with structured citations and trace metadata', async () => {
    const app = buildApp(config);

    await app.inject({
      method: 'POST',
      url: '/api/v1/documents/ingest',
      payload: {
        sourceId: 'query-remote-work-policy',
        title: 'Query Remote Work Policy',
        sourceType: 'markdown',
        version: '1.0.0',
        content: '# Remote Work\n\n## Eligibility\n\nEmployees may work remotely two days per week.'
      }
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/query',
      payload: {
        question: 'How often can employees work remotely?',
        topK: 2
      }
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.answer).toContain('How often can employees work remotely?');
    expect(body.traceId).toEqual(expect.any(String));
    expect(body.latencyMs).toEqual(expect.any(Number));
    expect(body.usage.retrievedChunks).toBeGreaterThan(0);
    expect(body.usage.citedChunks).toBe(body.citations.length);
    expect(body.citations[0]).toMatchObject({
      sourceId: 'query-remote-work-policy',
      title: 'Query Remote Work Policy',
      rank: 1
    });
  });

  it('returns insufficient evidence when there are no indexed chunks', async () => {
    const app = buildApp(config);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/query',
      payload: {
        question: 'What is the refund policy?'
      }
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.answer).toContain('I do not have enough retrieved context');
    expect(body.citations).toEqual([]);
    expect(body.usage).toEqual({ retrievedChunks: 0, citedChunks: 0 });
    expect(body.traceId).toEqual(expect.any(String));
  });

  it('rejects invalid query payloads', async () => {
    const app = buildApp(config);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/query',
      payload: {
        question: '',
        topK: 0
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error).toBe('invalid_query_payload');
  });
});
