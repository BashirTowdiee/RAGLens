import Fastify from 'fastify';
import { describe, expect, it } from 'vitest';
import { InMemoryDocumentRepository } from '../documents/documentRepository.js';
import { InMemoryRetrievalTraceRepository } from '../documents/retrievalTraceRepository.js';
import { registerDocumentRoutes } from '../documents/routes.js';
import { QueryService } from './queryService.js';
import { InMemoryQueryTraceRepository } from './queryTraceRepository.js';
import { registerQueryRoutes } from './routes.js';

describe('query retrieval mode tracing', () => {
  it('passes the requested retrieval mode through to the query trace', async () => {
    const app = Fastify({ logger: false });
    const documentRepository = new InMemoryDocumentRepository();
    const retrievalTraceRepository = new InMemoryRetrievalTraceRepository();
    const queryTraceRepository = new InMemoryQueryTraceRepository();
    const queryService = new QueryService(
      documentRepository,
      retrievalTraceRepository,
      queryTraceRepository
    );

    await registerDocumentRoutes(app, documentRepository, retrievalTraceRepository);
    await registerQueryRoutes(app, queryService, queryTraceRepository);

    await app.inject({
      method: 'POST',
      url: '/api/v1/documents/ingest',
      payload: {
        sourceId: 'retrieval-mode-policy',
        title: 'Retrieval Mode Policy',
        sourceType: 'markdown',
        version: '1.0.0',
        content: '# Retrieval Modes\n\n## Hybrid\n\nHybrid retrieval combines vector and keyword matching.'
      }
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/query',
      payload: {
        question: 'How does hybrid retrieval work?',
        topK: 3,
        retrievalMode: 'hybrid'
      }
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();

    const traceResponse = await app.inject({
      method: 'GET',
      url: `/api/v1/queries/${body.traceId}`
    });

    expect(traceResponse.statusCode).toBe(200);
    expect(traceResponse.json().trace.config).toMatchObject({
      topK: 3,
      retrievalMode: 'hybrid'
    });
  });
});
