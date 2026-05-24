import Fastify from 'fastify';
import type { AppConfig } from './config.js';
import { InMemoryDocumentRepository } from './documents/documentRepository.js';
import { registerDocumentRoutes } from './documents/routes.js';
import {
  createDocumentPool,
  PostgresDocumentRepository
} from './documents/postgresDocumentRepository.js';
import { PostgresRetrievalTraceRepository } from './documents/postgresRetrievalTraceRepository.js';
import { InMemoryRetrievalTraceRepository } from './documents/retrievalTraceRepository.js';
import { QueryService } from './query/queryService.js';
import { registerQueryRoutes } from './query/routes.js';

export function buildApp(config: AppConfig) {
  const app = Fastify({
    logger: config.NODE_ENV !== 'test'
  });
  const documentPool =
    config.DOCUMENT_REPOSITORY === 'postgres' ? createDocumentPool(config.DATABASE_URL) : null;
  const documentRepository = documentPool
    ? new PostgresDocumentRepository(documentPool)
    : new InMemoryDocumentRepository();
  const retrievalTraceRepository = documentPool
    ? new PostgresRetrievalTraceRepository(documentPool)
    : new InMemoryRetrievalTraceRepository();
  const queryService = new QueryService(documentRepository, retrievalTraceRepository);

  app.get('/api/v1/health', async () => ({
    status: 'ok',
    service: 'rag-api',
    environment: config.NODE_ENV
  }));

  app.register(async (instance) => {
    await registerDocumentRoutes(instance, documentRepository, retrievalTraceRepository);
    await registerQueryRoutes(instance, queryService);
  });

  return app;
}
