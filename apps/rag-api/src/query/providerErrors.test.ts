import Fastify from 'fastify';
import { describe, expect, it } from 'vitest';
import { InMemoryDocumentRepository } from '../documents/documentRepository.js';
import { InMemoryRetrievalTraceRepository } from '../documents/retrievalTraceRepository.js';
import { registerDocumentRoutes } from '../documents/routes.js';
import { AnswerProviderError, type AnswerProvider } from './answerProvider.js';
import { QueryService } from './queryService.js';
import { InMemoryQueryTraceRepository } from './queryTraceRepository.js';
import { InMemoryRagConfigRepository } from './ragConfigRepository.js';
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

const usageProvider: AnswerProvider = {
  async generate(input) {
    return {
      answer: `Answer for ${input.question}`,
      provider: 'usage-provider',
      model: 'usage-model-v1',
      usage: {
        promptTokens: 1200,
        completionTokens: 300,
        totalTokens: 1500,
        estimatedCostUsd: 0.0012
      }
    };
  }
};

describe('query provider error handling', () => {
  it('returns a structured provider failure response and persists a failed trace', async () => {
    const app = Fastify({ logger: false });
    const documentRepository = new InMemoryDocumentRepository();
    const traceRepository = new InMemoryRetrievalTraceRepository();
    const queryTraceRepository = new InMemoryQueryTraceRepository();
    const ragConfigRepository = new InMemoryRagConfigRepository();
    const queryService = new QueryService(
      documentRepository,
      traceRepository,
      queryTraceRepository,
      failingProvider
    );

    await registerDocumentRoutes(app, documentRepository, traceRepository);
    await registerQueryRoutes(app, queryService, queryTraceRepository, ragConfigRepository);

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
      headers: {
        'x-request-id': 'request-123'
      },
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
      traceId: expect.any(String),
      requestId: 'request-123'
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
      promptVersion: 'query-prompt-v1',
      config: {
        topK: 5,
        retrievalMode: 'vector'
      },
      usage: {
        retrievedChunks: expect.any(Number),
        citedChunks: 0
      },
      citations: [],
      providerCall: {
        provider: 'test-provider',
        model: 'unknown',
        status: 'failed',
        latencyMs: expect.any(Number),
        promptTokens: null,
        completionTokens: null,
        totalTokens: null,
        estimatedCostUsd: null,
        errorCode: 'provider_timeout'
      },
      error: {
        code: 'provider_timeout',
        message: 'The answer provider timed out.',
        provider: 'test-provider',
        retryable: true
      }
    });
  });

  it('persists provider usage and estimated cost when available', async () => {
    const app = Fastify({ logger: false });
    const documentRepository = new InMemoryDocumentRepository();
    const traceRepository = new InMemoryRetrievalTraceRepository();
    const queryTraceRepository = new InMemoryQueryTraceRepository();
    const ragConfigRepository = new InMemoryRagConfigRepository();
    const queryService = new QueryService(
      documentRepository,
      traceRepository,
      queryTraceRepository,
      usageProvider
    );

    await registerDocumentRoutes(app, documentRepository, traceRepository);
    await registerQueryRoutes(app, queryService, queryTraceRepository, ragConfigRepository);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/query',
      payload: {
        question: 'How are usage costs tracked?'
      }
    });

    expect(response.statusCode).toBe(200);
    const traceResponse = await app.inject({
      method: 'GET',
      url: `/api/v1/queries/${response.json().traceId}`
    });

    expect(traceResponse.statusCode).toBe(200);
    expect(traceResponse.json().trace.providerCall).toMatchObject({
      provider: 'usage-provider',
      model: 'usage-model-v1',
      promptTokens: 1200,
      completionTokens: 300,
      totalTokens: 1500,
      estimatedCostUsd: 0.0012
    });
  });
});
