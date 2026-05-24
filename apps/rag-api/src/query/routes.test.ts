import { describe, expect, it } from 'vitest';
import { buildApp } from '../app.js';

const config = {
  NODE_ENV: 'test',
  PORT: 8000,
  DATABASE_URL: 'postgres://raglens:raglens@localhost:5432/raglens',
  DOCUMENT_REPOSITORY: 'memory' as const
};

describe('query routes', () => {
  it('answers with structured citations, provider metadata, and citation validation', async () => {
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
    expect(body.usage.provider).toBe('deterministic');
    expect(body.usage.model).toBe('deterministic-context-preview-v1');
    expect(body.citationValidation).toEqual({
      valid: true,
      citationCount: body.citations.length,
      retrievedChunkCount: body.usage.retrievedChunks,
      issues: []
    });
    expect(body.citations[0]).toMatchObject({
      sourceId: 'query-remote-work-policy',
      title: 'Query Remote Work Policy',
      rank: 1
    });
  });

  it('persists successful query traces and fetches them by id', async () => {
    const app = buildApp(config);

    await app.inject({
      method: 'POST',
      url: '/api/v1/documents/ingest',
      payload: {
        sourceId: 'query-trace-policy',
        title: 'Query Trace Policy',
        sourceType: 'markdown',
        version: '1.0.0',
        content: '# Query Traces\n\n## Persistence\n\nSuccessful query traces are persisted for audit review.'
      }
    });

    const queryResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/query',
      payload: {
        question: 'What are query traces used for?'
      }
    });

    expect(queryResponse.statusCode).toBe(200);
    const queryBody = queryResponse.json();

    const traceResponse = await app.inject({
      method: 'GET',
      url: `/api/v1/queries/${queryBody.traceId}`
    });

    expect(traceResponse.statusCode).toBe(200);
    expect(traceResponse.json().trace).toMatchObject({
      id: queryBody.traceId,
      question: 'What are query traces used for?',
      answer: queryBody.answer,
      provider: 'deterministic',
      model: 'deterministic-context-preview-v1',
      usage: {
        retrievedChunks: queryBody.usage.retrievedChunks,
        citedChunks: queryBody.usage.citedChunks
      },
      citationValidation: queryBody.citationValidation,
      citations: queryBody.citations
    });
  });

  it('lists persisted query traces newest first', async () => {
    const app = buildApp(config);

    await app.inject({
      method: 'POST',
      url: '/api/v1/query',
      payload: {
        question: 'First question?'
      }
    });
    await app.inject({
      method: 'POST',
      url: '/api/v1/query',
      payload: {
        question: 'Second question?'
      }
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/queries'
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().traces.map((trace: { question: string }) => trace.question)).toEqual([
      'Second question?',
      'First question?'
    ]);
  });

  it('returns not found for missing query traces', async () => {
    const app = buildApp(config);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/queries/missing-trace'
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: 'query_trace_not_found',
      message: 'Query trace was not found.'
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
    expect(body.citationValidation).toEqual({
      valid: true,
      citationCount: 0,
      retrievedChunkCount: 0,
      issues: []
    });
    expect(body.usage).toEqual({
      retrievedChunks: 0,
      citedChunks: 0,
      provider: 'deterministic',
      model: 'deterministic-context-preview-v1'
    });
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
