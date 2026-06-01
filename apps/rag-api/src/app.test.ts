import { describe, expect, it } from 'vitest';
import { buildApp } from './app.js';

const config = {
  NODE_ENV: 'test',
  PORT: 8000,
  DATABASE_URL: 'postgres://raglens:raglens@localhost:5432/raglens',
  DOCUMENT_REPOSITORY: 'memory' as const
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

  it('returns runtime config sections with request id header', async () => {
    const app = buildApp(config);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/runtime-config',
      headers: {
        'x-request-id': 'runtime-config-request'
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['x-request-id']).toBe('runtime-config-request');
    const body = response.json();
    expect(body.service).toBe('rag-api');
    expect(body.persistence).toBe('in-memory');
    expect(body.restartRequired).toBe(false);
    expect(Array.isArray(body.sections)).toBe(true);
    expect(body.sections.length).toBeGreaterThan(0);
  });

  it('updates runtime config values for subsequent calls', async () => {
    const app = buildApp(config);

    const updateResponse = await app.inject({
      method: 'PUT',
      url: '/api/v1/runtime-config',
      payload: {
        plainValues: {
          ANSWER_PROVIDER: 'ollama',
          ANSWER_MODEL: 'qwen3:8b',
          PROMPT_CONTEXT_TOKEN_BUDGET: '1400'
        }
      }
    });

    expect(updateResponse.statusCode).toBe(200);
    const updateBody = updateResponse.json();
    const ragSection = updateBody.sections.find((section: { id: string }) => section.id === 'rag-query-runtime');
    expect(ragSection).toBeDefined();
    const answerProviderField = ragSection.fields.find((field: { key: string }) => field.key === 'ANSWER_PROVIDER');
    const answerModelField = ragSection.fields.find((field: { key: string }) => field.key === 'ANSWER_MODEL');
    expect(answerProviderField.value).toBe('ollama');
    expect(answerModelField.value).toBe('qwen3:8b');
  });
});
