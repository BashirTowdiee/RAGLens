export type EmbeddingVector = number[];

export type EmbeddingProviderErrorCode =
  | 'embedding_provider_unavailable'
  | 'embedding_provider_timeout'
  | 'embedding_provider_invalid_response';

export class EmbeddingProviderError extends Error {
  constructor(
    public readonly code: EmbeddingProviderErrorCode,
    message: string,
    public readonly provider = 'unknown',
    public readonly retryable = true
  ) {
    super(message);
    this.name = 'EmbeddingProviderError';
  }
}

export interface EmbeddingProvider {
  readonly provider: string;
  readonly model: string;
  readonly dimensions: number;
  embedText(text: string): Promise<EmbeddingVector>;
}

export class DeterministicEmbeddingProvider implements EmbeddingProvider {
  readonly provider = 'deterministic';
  readonly model = 'deterministic-8d';
  readonly dimensions = 8;

  async embedText(text: string): Promise<EmbeddingVector> {
    const vector = Array.from({ length: this.dimensions }, () => 0);
    const tokens = normaliseText(text).split(' ').filter(Boolean);

    for (const token of tokens) {
      const index = stableHash(token) % this.dimensions;
      vector[index] += 1;
    }

    return normaliseVector(vector);
  }
}

export type OllamaEmbeddingProviderOptions = {
  baseUrl: string;
  model: string;
  dimensions?: number;
  timeoutMs?: number;
};

export class OllamaEmbeddingProvider implements EmbeddingProvider {
  readonly provider = 'ollama';
  readonly dimensions: number;

  constructor(
    private readonly options: OllamaEmbeddingProviderOptions
  ) {
    this.dimensions = options.dimensions ?? 768;
  }

  get model(): string {
    return this.options.model;
  }

  async embedText(text: string): Promise<EmbeddingVector> {
    const timeoutMs = this.options.timeoutMs ?? 10000;
    const timeoutController = new AbortController();
    const timeoutHandle = setTimeout(() => timeoutController.abort(), timeoutMs);

    let response: Response;
    try {
      response = await fetch(`${this.options.baseUrl.replace(/\/$/, '')}/embeddings`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ model: this.options.model, input: text }),
        signal: timeoutController.signal
      });
    } catch (error) {
      clearTimeout(timeoutHandle);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new EmbeddingProviderError(
          'embedding_provider_timeout',
          `Embedding provider timed out after ${timeoutMs}ms.`,
          this.provider,
          true
        );
      }

      const message = error instanceof Error ? error.message : 'Embedding provider is unavailable.';
      throw new EmbeddingProviderError(
        'embedding_provider_unavailable',
        message,
        this.provider,
        true
      );
    } finally {
      clearTimeout(timeoutHandle);
    }

    if (!response.ok) {
      const retryable = response.status === 408 || response.status === 429 || response.status >= 500;
      throw new EmbeddingProviderError(
        retryable ? 'embedding_provider_unavailable' : 'embedding_provider_invalid_response',
        `Embedding provider returned HTTP ${response.status}.`,
        this.provider,
        retryable
      );
    }

    const body = (await response.json().catch(() => null)) as
      | { data?: Array<{ embedding?: unknown }> }
      | null;
    const vector = body?.data?.[0]?.embedding;

    if (!Array.isArray(vector) || vector.some((value) => typeof value !== 'number')) {
      throw new EmbeddingProviderError(
        'embedding_provider_invalid_response',
        'Embedding provider returned an invalid embedding vector.',
        this.provider,
        false
      );
    }

    if (vector.length !== this.dimensions) {
      throw new EmbeddingProviderError(
        'embedding_provider_invalid_response',
        `Embedding vector dimension mismatch: expected ${this.dimensions}, received ${vector.length}.`,
        this.provider,
        false
      );
    }

    return vector;
  }
}

export function cosineSimilarity(left: EmbeddingVector, right: EmbeddingVector): number {
  if (left.length !== right.length) {
    throw new Error('Embedding vectors must have the same dimensions.');
  }

  const dotProduct = left.reduce((sum, value, index) => sum + value * right[index], 0);
  const leftMagnitude = Math.sqrt(left.reduce((sum, value) => sum + value * value, 0));
  const rightMagnitude = Math.sqrt(right.reduce((sum, value) => sum + value * value, 0));

  if (leftMagnitude === 0 || rightMagnitude === 0) {
    return 0;
  }

  return dotProduct / (leftMagnitude * rightMagnitude);
}

export function vectorToSql(vector: EmbeddingVector): string {
  return `[${vector.map((value) => Number(value.toFixed(6))).join(',')}]`;
}

function normaliseText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stableHash(value: string): number {
  let hash = 0;

  for (const character of value) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }

  return hash;
}

function normaliseVector(vector: EmbeddingVector): EmbeddingVector {
  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));

  if (magnitude === 0) {
    return vector;
  }

  return vector.map((value) => value / magnitude);
}
