import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AppConfig } from '../config.js';
import { createAnswerProvider } from './providerFactory.js';

const baseConfig: AppConfig = {
  NODE_ENV: 'test',
  PORT: 8000,
  DATABASE_URL: 'postgres://raglens:raglens@localhost:5432/raglens',
  DOCUMENT_REPOSITORY: 'memory',
  ANSWER_PROVIDER: 'deterministic',
  ANSWER_MODEL: undefined,
  ANSWER_INPUT_COST_PER_1M_TOKENS: undefined,
  ANSWER_OUTPUT_COST_PER_1M_TOKENS: undefined,
  ANSWER_PROVIDER_TIMEOUT_MS: 10000,
  PROMPT_CONTEXT_TOKEN_BUDGET: 1200,
  RERANKER_PROVIDER: 'deterministic',
  OPENAI_API_KEY: undefined,
  OPENAI_BASE_URL: 'https://api.openai.com/v1',
  ANTHROPIC_API_KEY: undefined,
  ANTHROPIC_BASE_URL: 'https://api.anthropic.com/v1',
  OPENROUTER_API_KEY: undefined,
  OPENROUTER_BASE_URL: 'https://openrouter.ai/api/v1',
  OLLAMA_BASE_URL: 'http://localhost:11434/v1'
};

function prompt() {
  return {
    system: 'system prompt',
    user: 'user prompt',
    context: []
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('createAnswerProvider', () => {
  it('returns deterministic provider by default', async () => {
    const provider = createAnswerProvider(baseConfig);
    const result = await provider.generate({
      question: 'What is the policy?',
      prompt: prompt()
    });

    expect(result.provider).toBe('deterministic');
    expect(result.model).toBe('deterministic-context-preview-v1');
  });

  it('maps HTTP provider failures to structured retryable errors', async () => {
    const provider = createAnswerProvider({
      ...baseConfig,
      ANSWER_PROVIDER: 'openai',
      OPENAI_API_KEY: 'test-key'
    });

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503
      } as unknown as Response)
    );

    await expect(
      provider.generate({
        question: 'What is the policy?',
        prompt: prompt()
      })
    ).rejects.toMatchObject({
      code: 'provider_unavailable',
      provider: 'openai',
      retryable: true
    });
  });

  it('maps malformed JSON to provider_invalid_response', async () => {
    const provider = createAnswerProvider({
      ...baseConfig,
      ANSWER_PROVIDER: 'ollama'
    });

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => {
          throw new Error('invalid json');
        }
      } as unknown as Response)
    );

    await expect(
      provider.generate({
        question: 'What is the policy?',
        prompt: prompt()
      })
    ).rejects.toMatchObject({
      code: 'provider_invalid_response',
      provider: 'ollama',
      retryable: false
    });
  });

  it('returns anthropic answers when content payload is valid', async () => {
    const provider = createAnswerProvider({
      ...baseConfig,
      ANSWER_PROVIDER: 'anthropic',
      ANTHROPIC_API_KEY: 'anthropic-key'
    });

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          content: [{ text: 'Answer from anthropic.' }]
        })
      } as unknown as Response)
    );

    const result = await provider.generate({
      question: 'What is the policy?',
      prompt: prompt()
    });

    expect(result.provider).toBe('anthropic');
    expect(result.answer).toBe('Answer from anthropic.');
  });

  it('captures usage tokens and estimated cost for openai-compatible responses', async () => {
    const provider = createAnswerProvider({
      ...baseConfig,
      ANSWER_PROVIDER: 'openai',
      OPENAI_API_KEY: 'test-key',
      ANSWER_INPUT_COST_PER_1M_TOKENS: 0.5,
      ANSWER_OUTPUT_COST_PER_1M_TOKENS: 1.5
    });

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { content: 'Answer from provider.' } }],
          usage: {
            prompt_tokens: 2000,
            completion_tokens: 1000,
            total_tokens: 3000
          }
        })
      } as unknown as Response)
    );

    const result = await provider.generate({
      question: 'What is the policy?',
      prompt: prompt()
    });

    expect(result.usage).toEqual({
      promptTokens: 2000,
      completionTokens: 1000,
      totalTokens: 3000,
      estimatedCostUsd: 0.0025
    });
  });
});
