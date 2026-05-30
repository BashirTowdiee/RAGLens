import { randomUUID } from 'node:crypto';
import Fastify from 'fastify';
import type { AppConfig } from './config.js';
import { InMemoryDocumentRepository } from './documents/documentRepository.js';
import { DeterministicReranker, NoopReranker, type Reranker } from './documents/reranker.js';
import { registerDocumentRoutes } from './documents/routes.js';
import {
  createDocumentPool,
  PostgresDocumentRepository
} from './documents/postgresDocumentRepository.js';
import { PostgresRetrievalTraceRepository } from './documents/postgresRetrievalTraceRepository.js';
import { InMemoryRetrievalTraceRepository } from './documents/retrievalTraceRepository.js';
import { PostgresQueryTraceRepository } from './query/postgresQueryTraceRepository.js';
import { QueryService } from './query/queryService.js';
import { InMemoryQueryTraceRepository } from './query/queryTraceRepository.js';
import { registerQueryRoutes } from './query/routes.js';

export const REQUEST_ID_HEADER = 'x-request-id';
export const MAX_REQUEST_ID_LENGTH = 128;

type RuntimeConfig = Omit<
  AppConfig,
  'ANSWER_PROVIDER_TIMEOUT_MS' | 'PROMPT_CONTEXT_TOKEN_BUDGET' | 'RERANKER_PROVIDER'
> & {
  ANSWER_PROVIDER_TIMEOUT_MS?: number;
  PROMPT_CONTEXT_TOKEN_BUDGET?: number;
  RERANKER_PROVIDER?: 'deterministic' | 'none';
};

function resolveRequestId(input: string | string[] | undefined): string {
  const rawValue = Array.isArray(input) ? input[0] : input;
  if (!rawValue) {
    return randomUUID();
  }

  const requestId = rawValue.trim();
  if (!requestId || requestId.length > MAX_REQUEST_ID_LENGTH) {
    return randomUUID();
  }

  return requestId;
}

export function buildApp(config: RuntimeConfig) {
  const app = Fastify({
    logger: config.NODE_ENV !== 'test'
  });
  const reranker = resolveReranker(config.RERANKER_PROVIDER ?? 'deterministic');
  const documentPool =
    config.DOCUMENT_REPOSITORY === 'postgres' ? createDocumentPool(config.DATABASE_URL) : null;
  const documentRepository = documentPool
    ? new PostgresDocumentRepository(documentPool, undefined, reranker)
    : new InMemoryDocumentRepository(undefined, reranker);
  const retrievalTraceRepository = documentPool
    ? new PostgresRetrievalTraceRepository(documentPool)
    : new InMemoryRetrievalTraceRepository();
  const queryTraceRepository = documentPool
    ? new PostgresQueryTraceRepository(documentPool)
    : new InMemoryQueryTraceRepository();
  const queryService = new QueryService(
    documentRepository,
    retrievalTraceRepository,
    queryTraceRepository,
    undefined,
    config.ANSWER_PROVIDER_TIMEOUT_MS ?? 10000,
    config.PROMPT_CONTEXT_TOKEN_BUDGET ?? 1200
  );

  app.decorateRequest('requestId', '');
  app.addHook('onRequest', async (request, reply) => {
    const requestId = resolveRequestId(request.headers[REQUEST_ID_HEADER]);
    request.requestId = requestId;
    reply.header(REQUEST_ID_HEADER, requestId);
  });

  app.get('/api/v1/health', async () => ({
    status: 'ok',
    service: 'rag-api',
    environment: config.NODE_ENV
  }));

  app.register(async (instance) => {
    await registerDocumentRoutes(instance, documentRepository, retrievalTraceRepository);
    await registerQueryRoutes(instance, queryService, queryTraceRepository);
  });

  return app;
}

function resolveReranker(provider: 'deterministic' | 'none'): Reranker {
  if (provider === 'none') {
    return new NoopReranker();
  }

  return new DeterministicReranker();
}

declare module 'fastify' {
  interface FastifyRequest {
    requestId: string;
  }
}
