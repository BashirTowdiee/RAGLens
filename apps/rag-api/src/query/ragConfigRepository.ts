import type { RetrievalMode } from '../documents/types.js';

export type RagConfigRecord = {
  id: string;
  name: string;
  answerProvider: 'deterministic' | 'openai' | 'anthropic' | 'openrouter' | 'ollama';
  answerModel: string;
  embeddingProvider: 'deterministic' | 'ollama';
  embeddingModel: string;
  retrievalMode: RetrievalMode;
  topK: number;
  rerankerProvider: 'deterministic' | 'none';
  promptContextTokenBudget: number;
  active: boolean;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export interface RagConfigRepository {
  listActive(): Promise<RagConfigRecord[]>;
  getById(configId: string): Promise<RagConfigRecord | null>;
}

const now = () => new Date().toISOString();

export function defaultInMemoryRagConfigs(): RagConfigRecord[] {
  const createdAt = now();
  return [
    {
      id: 'deterministic',
      name: 'Deterministic',
      answerProvider: 'deterministic',
      answerModel: 'deterministic-context-preview-v1',
      embeddingProvider: 'ollama',
      embeddingModel: 'nomic-embed-text',
      retrievalMode: 'vector',
      topK: 5,
      rerankerProvider: 'none',
      promptContextTokenBudget: 1200,
      active: true,
      metadata: { preset: 'deterministic' },
      createdAt,
      updatedAt: createdAt
    },
    {
      id: 'local-balanced',
      name: 'Local Balanced (Ollama qwen3:8b)',
      answerProvider: 'ollama',
      answerModel: 'qwen3:8b',
      embeddingProvider: 'ollama',
      embeddingModel: 'nomic-embed-text',
      retrievalMode: 'vector',
      topK: 5,
      rerankerProvider: 'none',
      promptContextTokenBudget: 1200,
      active: true,
      metadata: { preset: 'local-balanced' },
      createdAt,
      updatedAt: createdAt
    },
    {
      id: 'cloud-baseline',
      name: 'Cloud Baseline (OpenAI gpt-4.1-mini)',
      answerProvider: 'openai',
      answerModel: 'gpt-4.1-mini',
      embeddingProvider: 'ollama',
      embeddingModel: 'nomic-embed-text',
      retrievalMode: 'vector',
      topK: 5,
      rerankerProvider: 'none',
      promptContextTokenBudget: 1200,
      active: true,
      metadata: { preset: 'cloud-baseline' },
      createdAt,
      updatedAt: createdAt
    }
  ];
}

export class InMemoryRagConfigRepository implements RagConfigRepository {
  private readonly configs: RagConfigRecord[];

  constructor(configs: RagConfigRecord[] = defaultInMemoryRagConfigs()) {
    this.configs = configs;
  }

  async listActive(): Promise<RagConfigRecord[]> {
    return this.configs.filter((entry) => entry.active);
  }

  async getById(configId: string): Promise<RagConfigRecord | null> {
    return this.configs.find((entry) => entry.id === configId && entry.active) ?? null;
  }
}
