import { describe, expect, it } from 'vitest';
import { PostgresRagConfigRepository } from './postgresRagConfigRepository.js';

type QueryResult = {
  rows: unknown[];
};

describe('PostgresRagConfigRepository', () => {
  it('falls back to in-memory defaults when rag_configs table is missing', async () => {
    const pool = {
      query: async () => {
        const error = new Error('relation does not exist') as Error & { code: string };
        error.code = '42P01';
        throw error;
      }
    } as unknown as { query: () => Promise<QueryResult> };

    const repository = new PostgresRagConfigRepository(pool as never);
    const configs = await repository.listActive();

    expect(configs.map((config) => config.id)).toEqual(
      expect.arrayContaining(['deterministic', 'local-balanced', 'cloud-baseline'])
    );
  });

  it('falls back by id when rag_configs table is missing', async () => {
    const pool = {
      query: async () => {
        const error = new Error('relation does not exist') as Error & { code: string };
        error.code = '42P01';
        throw error;
      }
    } as unknown as { query: () => Promise<QueryResult> };

    const repository = new PostgresRagConfigRepository(pool as never);
    const config = await repository.getById('local-balanced');

    expect(config?.id).toBe('local-balanced');
    expect(config?.answerProvider).toBe('ollama');
  });
});
