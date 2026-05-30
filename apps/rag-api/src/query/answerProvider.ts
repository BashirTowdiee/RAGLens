import type { QueryPrompt } from './promptBuilder.js';

export type AnswerProviderInput = {
  question: string;
  prompt: QueryPrompt;
};

export type AnswerProviderResult = {
  answer: string;
  provider: string;
  model: string;
  usage?: {
    promptTokens: number | null;
    completionTokens: number | null;
    totalTokens: number | null;
    estimatedCostUsd: number | null;
  };
};

export type AnswerProviderErrorCode = 'provider_unavailable' | 'provider_timeout' | 'provider_invalid_response';

export class AnswerProviderError extends Error {
  constructor(
    public readonly code: AnswerProviderErrorCode,
    message: string,
    public readonly provider = 'unknown',
    public readonly retryable = true
  ) {
    super(message);
    this.name = 'AnswerProviderError';
  }
}

export interface AnswerProvider {
  generate(input: AnswerProviderInput): Promise<AnswerProviderResult>;
}

export class DeterministicAnswerProvider implements AnswerProvider {
  async generate(input: AnswerProviderInput): Promise<AnswerProviderResult> {
    if (input.prompt.context.length === 0) {
      return {
        answer: `I do not have enough retrieved context to answer "${input.question}" with evidence.`,
        provider: 'deterministic',
        model: 'deterministic-context-preview-v1'
      };
    }

    const contextPreview = input.prompt.context
      .slice(0, 2)
      .map((chunk) => `[${chunk.citationIndex}] ${chunk.content}`)
      .join('\n\n');

    return {
      answer: `Based on the retrieved context for "${input.question}":\n\n${contextPreview}`,
      provider: 'deterministic',
      model: 'deterministic-context-preview-v1'
    };
  }
}
