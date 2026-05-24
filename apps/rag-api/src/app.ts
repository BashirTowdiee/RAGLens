import Fastify from 'fastify';
import type { AppConfig } from './config.js';

export function buildApp(config: AppConfig) {
  const app = Fastify({
    logger: config.NODE_ENV !== 'test'
  });

  app.get('/api/v1/health', async () => ({
    status: 'ok',
    service: 'rag-api',
    environment: config.NODE_ENV
  }));

  return app;
}
