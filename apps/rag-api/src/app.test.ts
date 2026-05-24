import { describe, expect, it } from 'vitest';
import { buildApp } from './app.js';

const config = {
  NODE_ENV: 'test',
  PORT: 8000,
  DATABASE_URL: 'postgres://raglens:raglens@localhost:5432/raglens'
};

describe('rag-api health endpoint', () => {
  it('returns service health', async () => {
    const app = buildApp(config);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/health'
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      status: 'ok',
      service: 'rag-api',
      environment: 'test'
    });
  });
});
