import type { AppConfig } from '../config.js';
import {
  DeterministicEmbeddingProvider,
  type EmbeddingProvider,
  OllamaEmbeddingProvider
} from './embeddings.js';

export type EmbeddingProviderSelection = {
  provider: 'deterministic' | 'ollama';
  model: string;
};

export function resolveEmbeddingProvider(
  config: Pick<AppConfig, 'EMBEDDING_PROVIDER' | 'EMBEDDING_MODEL' | 'OLLAMA_BASE_URL' | 'EMBEDDING_TIMEOUT_MS'>,
  selection?: EmbeddingProviderSelection
): EmbeddingProvider {
  const provider = selection?.provider ?? config.EMBEDDING_PROVIDER;
  const model = selection?.model ?? config.EMBEDDING_MODEL;

  if (provider === 'deterministic') {
    return new DeterministicEmbeddingProvider();
  }

  return new OllamaEmbeddingProvider({
    baseUrl: config.OLLAMA_BASE_URL,
    model,
    dimensions: 768,
    timeoutMs: config.EMBEDDING_TIMEOUT_MS
  });
}
