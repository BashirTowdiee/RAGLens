import { describe, expect, it } from 'vitest';
import { InMemoryRagConfigRepository } from './ragConfigRepository.js';

describe('InMemoryRagConfigRepository', () => {
  it('lists active configs', async () => {
    const repository = new InMemoryRagConfigRepository();

    const configs = await repository.listActive();

    expect(configs.length).toBeGreaterThanOrEqual(3);
    expect(configs.map((config) => config.id)).toEqual(
      expect.arrayContaining(['deterministic', 'local-balanced', 'cloud-baseline'])
    );
  });

  it('returns a config by id', async () => {
    const repository = new InMemoryRagConfigRepository();

    const config = await repository.getById('local-balanced');

    expect(config).toMatchObject({
      id: 'local-balanced',
      answerProvider: 'ollama',
      answerModel: 'qwen3:8b',
      embeddingProvider: 'ollama',
      embeddingModel: 'nomic-embed-text',
      retrievalMode: 'vector',
      topK: 5,
    });
  });

  it('returns null for unknown configs', async () => {
    const repository = new InMemoryRagConfigRepository();

    await expect(repository.getById('missing')).resolves.toBeNull();
  });
});
