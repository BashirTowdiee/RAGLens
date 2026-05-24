import Fastify from 'fastify';
import type { AppConfig } from './config.js';
import { InMemoryDocumentRepository } from './documents/documentRepository.js';
import { registerDocumentRoutes } from './documents/routes.js';
import {
  createDocumentPool,
  PostgresDocumentRepository
} from './documents/postgresDocumentRepository.js';

export function buildApp(config: AppConfig) {
  const app = Fastify({
    logger: config.NODE_ENV !== 'test'
  });
  const documentRepository =
    config.DOCUMENT_REPOSITORY === 'postgres'
      ? new PostgresDocumentRepository(createDocumentPool(config.DATABASE_URL))
      : new InMemoryDocumentRepository();

  app.get('/api/v1/health', async () => ({
    status: 'ok',
    service: 'rag-api',
    environment: config.NODE_ENV
  }));

  app.register(async (instance) => {
    await registerDocumentRoutes(instance, documentRepository);
  });

  return app;
}
