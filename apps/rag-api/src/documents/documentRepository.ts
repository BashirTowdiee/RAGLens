import { randomUUID } from 'node:crypto';
import type {
  DocumentChunkRecord,
  DocumentRecord,
  IngestDocumentInput,
  IngestDocumentResult,
  MetadataFilters,
  RetrievedChunkRecord,
  RetrievalMode,
  SearchChunksInput
} from './types.js';
import { chunkMarkdown, contentHash } from './markdownChunker.js';
import {
  cosineSimilarity,
  DeterministicEmbeddingProvider,
  type EmbeddingProvider,
  type EmbeddingVector
} from './embeddings.js';
import {
  DeterministicReranker,
  type Reranker
} from './reranker.js';

const defaultReranker = new DeterministicReranker();

export interface DocumentRepository {
  ingest(input: IngestDocumentInput): Promise<IngestDocumentResult>;
  listDocuments(): Promise<DocumentRecord[]>;
  getDocument(documentId: string): Promise<DocumentRecord | null>;
  listChunks(documentId: string): Promise<DocumentChunkRecord[]>;
  searchChunks(input: SearchChunksInput): Promise<RetrievedChunkRecord[]>;
}

export class InMemoryDocumentRepository implements DocumentRepository {
  private readonly documents = new Map<string, DocumentRecord>();
  private readonly chunksByDocumentId = new Map<string, DocumentChunkRecord[]>();
  private readonly embeddingsByChunkId = new Map<string, EmbeddingVector>();

  constructor(
    private readonly embeddingProvider: EmbeddingProvider = new DeterministicEmbeddingProvider(),
    private readonly reranker: Reranker = new DeterministicReranker()
  ) {}

  async ingest(input: IngestDocumentInput): Promise<IngestDocumentResult> {
    const chunks = chunkMarkdown(input.content);

    if (chunks.length === 0) {
      throw new Error('Document content must produce at least one chunk.');
    }

    const existing = [...this.documents.values()].find(
      (document) => document.sourceId === input.sourceId
    );
    const now = new Date().toISOString();
    const document: DocumentRecord = {
      id: existing?.id ?? randomUUID(),
      sourceId: input.sourceId,
      title: input.title,
      sourceType: input.sourceType,
      sourceUri: input.sourceUri,
      version: input.version ?? '1',
      contentHash: contentHash(input.content),
      status: 'indexed',
      metadata: input.metadata ?? {},
      createdAt: existing?.createdAt ?? now,
      updatedAt: now
    };

    for (const existingChunk of this.chunksByDocumentId.get(document.id) ?? []) {
      this.embeddingsByChunkId.delete(existingChunk.id);
    }

    const chunkRecords: DocumentChunkRecord[] = [];
    for (const chunk of chunks) {
      const chunkRecord: DocumentChunkRecord = {
        id: randomUUID(),
        documentId: document.id,
        chunkIndex: chunk.chunkIndex,
        headingPath: chunk.headingPath,
        content: chunk.content,
        tokenCountEstimate: chunk.tokenCountEstimate,
        contentHash: chunk.contentHash,
        metadata: {},
        createdAt: now
      };

      this.embeddingsByChunkId.set(
        chunkRecord.id,
        await this.embeddingProvider.embedText(chunkRecord.content)
      );
      chunkRecords.push(chunkRecord);
    }

    this.documents.set(document.id, document);
    this.chunksByDocumentId.set(document.id, chunkRecords);

    return { document, chunks: chunkRecords };
  }

  async listDocuments(): Promise<DocumentRecord[]> {
    return [...this.documents.values()].sort((left, right) =>
      left.title.localeCompare(right.title)
    );
  }

  async getDocument(documentId: string): Promise<DocumentRecord | null> {
    return this.documents.get(documentId) ?? null;
  }

  async listChunks(documentId: string): Promise<DocumentChunkRecord[]> {
    return this.chunksByDocumentId.get(documentId) ?? [];
  }

  async searchChunks(input: SearchChunksInput): Promise<RetrievedChunkRecord[]> {
    const limit = input.limit ?? 5;
    const mode = input.mode ?? 'vector';
    const retrievedChunks: RetrievedChunkRecord[] = [];

    for (const chunk of [...this.chunksByDocumentId.values()].flat()) {
      const document = this.documents.get(chunk.documentId);
      if (!document) {
        continue;
      }

      if (!metadataMatches(retrievalMetadataFor(document, chunk), input.metadataFilters)) {
        continue;
      }

      const score = await scoreChunkForMode({
        chunk,
        query: input.query,
        mode,
        embedding: this.embeddingsByChunkId.get(chunk.id),
        embeddingProvider: this.embeddingProvider,
        reranker: this.reranker
      });

      if (score.score <= 0) {
        continue;
      }

      retrievedChunks.push({
        ...chunk,
        score: score.score,
        originalScore: score.originalScore,
        rerankScore: score.rerankScore,
        document: {
          id: document.id,
          sourceId: document.sourceId,
          title: document.title,
          sourceUri: document.sourceUri,
          version: document.version
        }
      });
    }

    return retrievedChunks
      .sort((left, right) => right.score - left.score || left.chunkIndex - right.chunkIndex)
      .slice(0, limit);
  }
}

type ScoreChunkInput = {
  chunk: DocumentChunkRecord;
  query: string;
  mode: RetrievalMode;
  embedding?: EmbeddingVector;
  embeddingProvider: EmbeddingProvider;
  reranker: Reranker;
};

export type RetrievalScore = {
  score: number;
  originalScore?: number;
  rerankScore?: number;
};

export async function scoreChunkForMode(input: ScoreChunkInput): Promise<RetrievalScore> {
  const keyword = keywordScore(input.query, input.chunk.content);

  if (input.mode === 'keyword') {
    return { score: clampScore(keyword) };
  }

  const vector = input.embedding
    ? cosineSimilarity(await input.embeddingProvider.embedText(input.query), input.embedding)
    : 0;
  const normalizedVector = clampScore(vector);

  if (input.mode === 'hybrid' || input.mode === 'hybrid_reranked') {
    const originalScore = hybridScore(normalizedVector, keyword);

    if (input.mode === 'hybrid') {
      return { score: originalScore };
    }

    const rerankScoreValue =
      input.reranker.kind === 'none'
        ? originalScore
        : input.reranker.rerank(input.query, input.chunk);

    return {
      score: rerankedScore(originalScore, rerankScoreValue),
      originalScore,
      rerankScore: rerankScoreValue
    };
  }

  return { score: normalizedVector };
}

export function hybridScore(vectorScore: number, keywordScoreValue: number): number {
  const safeVectorScore = clampScore(vectorScore);
  const safeKeywordScore = clampScore(keywordScoreValue);
  return clampScore(safeVectorScore * 0.7 + safeKeywordScore * 0.3);
}

export function rerankScore(query: string, chunk: Pick<DocumentChunkRecord, 'content' | 'headingPath'>): number {
  return defaultReranker.rerank(query, chunk);
}

export function rerankedScore(originalScore: number, rerankScoreValue: number): number {
  return clampScore(clampScore(originalScore) * 0.6 + clampScore(rerankScoreValue) * 0.4);
}

export function keywordScore(query: string, content: string): number {
  const queryTerms = uniqueTerms(query);
  if (queryTerms.length === 0) {
    return 0;
  }

  const contentTerms = normalisedTerms(content);
  if (contentTerms.length === 0) {
    return 0;
  }

  const termFrequencies = new Map<string, number>();
  for (const term of contentTerms) {
    termFrequencies.set(term, (termFrequencies.get(term) ?? 0) + 1);
  }

  const matchedTerms = queryTerms.filter((term) => termFrequencies.has(term));
  const baseCoverage = matchedTerms.length / queryTerms.length;

  if (matchedTerms.length === 0) {
    return 0;
  }

  const densityBonus = densityScore(termFrequencies, matchedTerms);
  const phraseBonus = phraseMatchBonus(query, content);

  return clampScore(baseCoverage * 0.75 + densityBonus + phraseBonus);
}

function densityScore(termFrequencies: Map<string, number>, matchedTerms: string[]): number {
  const totalFrequency = matchedTerms.reduce(
    (sum, term) => sum + (termFrequencies.get(term) ?? 0),
    0
  );
  const averageFrequency = totalFrequency / matchedTerms.length;
  const extraDensity = Math.max(averageFrequency - 1, 0);
  return Math.min(extraDensity * 0.08, 0.15);
}

function phraseMatchBonus(query: string, content: string): number {
  const normalizedQuery = normaliseText(query);
  const normalizedContent = normaliseText(content);
  if (!normalizedQuery || !normalizedContent) {
    return 0;
  }

  return normalizedContent.includes(normalizedQuery) ? 0.1 : 0;
}

function normaliseText(value: string): string {
  return normalisedTerms(value).join(' ');
}

function uniqueTerms(value: string): string[] {
  return [...new Set(normalisedTerms(value))];
}

export function clampRetrievalScore(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function clampScore(value: number): number {
  return clampRetrievalScore(value);
}

export function retrievalMetadataFor(
  document: Pick<DocumentRecord, 'metadata'>,
  chunk: Pick<DocumentChunkRecord, 'metadata'>
): Record<string, unknown> {
  return {
    ...document.metadata,
    ...chunk.metadata
  };
}

export function metadataMatches(
  metadata: Record<string, unknown>,
  filters?: MetadataFilters
): boolean {
  if (!filters || Object.keys(filters).length === 0) {
    return true;
  }

  return Object.entries(filters).every(([key, expectedValue]) => metadata[key] === expectedValue);
}

function normalisedTerms(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/u)
    .filter(Boolean);
}
