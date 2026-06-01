import { describe, expect, it, vi } from 'vitest';
import {
  OllamaEmbeddingProvider,
} from './embeddings.js';

describe('OllamaEmbeddingProvider', () => {
  it('maps valid embedding responses', async () => {
    const provider = new OllamaEmbeddingProvider({
      baseUrl: 'http://localhost:11434/v1',
      model: 'nomic-embed-text',
      dimensions: 3,
      timeoutMs: 1000,
    });

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ data: [{ embedding: [0.1, 0.2, 0.3] }] }),
      } as unknown as Response)
    );

    const vector = await provider.embedText('hello world');
    expect(vector).toEqual([0.1, 0.2, 0.3]);
  });

  it('maps timeout aborts to embedding_provider_timeout', async () => {
    const provider = new OllamaEmbeddingProvider({
      baseUrl: 'http://localhost:11434/v1',
      model: 'nomic-embed-text',
      dimensions: 3,
      timeoutMs: 1000,
    });

    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(Object.assign(new Error('aborted'), { name: 'AbortError' }))
    );

    await expect(provider.embedText('hello world')).rejects.toMatchObject({
      code: 'embedding_provider_timeout',
      provider: 'ollama',
      retryable: true,
    });
  });

  it('maps malformed payloads to embedding_provider_invalid_response', async () => {
    const provider = new OllamaEmbeddingProvider({
      baseUrl: 'http://localhost:11434/v1',
      model: 'nomic-embed-text',
      dimensions: 3,
      timeoutMs: 1000,
    });

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ data: [{ embedding: ['bad', 'data'] }] }),
      } as unknown as Response)
    );

    await expect(provider.embedText('hello world')).rejects.toMatchObject({
      code: 'embedding_provider_invalid_response',
      provider: 'ollama',
      retryable: false,
    });
  });

  it('rejects unexpected vector dimensions', async () => {
    const provider = new OllamaEmbeddingProvider({
      baseUrl: 'http://localhost:11434/v1',
      model: 'nomic-embed-text',
      dimensions: 4,
      timeoutMs: 1000,
    });

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ data: [{ embedding: [0.1, 0.2, 0.3] }] }),
      } as unknown as Response)
    );

    await expect(provider.embedText('hello world')).rejects.toMatchObject({
      code: 'embedding_provider_invalid_response',
      provider: 'ollama',
      retryable: false,
    });
  });
});
