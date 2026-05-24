import Fastify from 'fastify';
import { describe, expect, it } from 'vitest';
import { InMemoryDocumentRepository } from '../documents/documentRepository.js';
import { InMemoryRetrievalTraceRepository } from '../documents/retrievalTraceRepository.js';
import { registerDocumentRoutes } from '../documents/routes.js';
import { AnswerProviderError, type AnswerProvider } from './answerProvider.js';
import { QueryService } from './queryService.js';
import { InMemoryQueryTraceRepository } from './queryTraceRepository.js';
import { registerQueryRoutes } from './routes.js';

const failingProvider: AnswerProvider = {
  async generate() {
    throw new AnswerProviderError(
      'provider_timeout',
      'The answer provider timed out.',
      'test-provider',
      true
    );
  }
};

describe('query provider error handling', () => {
  it('returns a structured provider failure response and persists a failed trace', async () => {
    const app = Fastify({ logger: false });
    const documentRepository = new InMemoryDocumentRepository();
    const traceRepository = new InMemoryRetrievalTraceRepository();
    const queryTraceRepository = new InMemoryQueryTraceRepository();
    const queryService = new QueryService(
      documentRepository,
      traceRepository,
      queryTraceRepository,
      failingProvider
    );

    await registerDocumentRoutes(app, documentRepository, traceRepository);
    await registerQueryRoutes(app, queryService, queryTraceRepository);

    await app.inject({
      method: 'POST',
      url: '/api/v1/documents/ingest',
      payload: {
        sourceId: 'provider-error-policy',
        title: 'Provider Error Policy',
        sourceType: 'markdown',
        version: '1.0.0',
        content: '# Provider Errors\n\n## Timeout\n\nProvider failures must return structured errors.'
      }
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/query',
      payload: {
        question: 'How are provider failures returned?'
      }
    });

    expect(response.statusCode).toBe(502);
    const body = response.json();
    expect(body).toMatchObject({
      error: 'answer_provider_failed',
      code: 'provider_timeout',
      message: 'The answer provider timed out.',
      provider: 'test-provider',
      retryable: true,
      traceId: expect.any(String)
    });

    const traceResponse = await app.inject({
      method: 'GET',
      url: `/api/v1/queries/${body.traceId}`
    });

    expect(traceResponse.statusCode).toBe(200);
    expect(traceResponse.json().trace).toMatchObject({
      id: body.traceId,
      status: 'failed',
      question: 'How are provider failures returned?',
      answer: '',
      provider: 'test-provider',
      model: 'unknown',
      usage: {
        retrievedChunks: expect.any(Number),
        citedChunks: 0
      },
      citations: [],
      error: {
        code: 'provider_timeout',
        message: 'The answer provider timed out.',
        provider: 'test-provider',
        retryable: true
      }
    });
  });
});
