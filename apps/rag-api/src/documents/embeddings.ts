export type EmbeddingVector = number[];

export interface EmbeddingProvider {
  readonly dimensions: number;
  embedText(text: string): EmbeddingVector;
}

export class DeterministicEmbeddingProvider implements EmbeddingProvider {
  readonly dimensions = 8;

  embedText(text: string): EmbeddingVector {
    const vector = Array.from({ length: this.dimensions }, () => 0);
    const tokens = normaliseText(text).split(' ').filter(Boolean);

    for (const token of tokens) {
      const index = stableHash(token) % this.dimensions;
      vector[index] += 1;
    }

    return normaliseVector(vector);
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
