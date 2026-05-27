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
    private readonly embeddingProvider: EmbeddingProvider = new DeterministicEmbeddingProvider()
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

    const chunkRecords = chunks.map<DocumentChunkRecord>((chunk) => {
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
        this.embeddingProvider.embedText(chunkRecord.content)
      );

      return chunkRecord;
    });

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

      const score = scoreChunkForMode({
        chunk,
        query: input.query,
        mode,
        embedding: this.embeddingsByChunkId.get(chunk.id),
        embeddingProvider: this.embeddingProvider
      });

      if (score <= 0) {
        continue;
      }

      retrievedChunks.push({
        ...chunk,
        score,
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
};

export function scoreChunkForMode(input: ScoreChunkInput): number {
  const keyword = keywordScore(input.query, input.chunk.content);

  if (input.mode === 'keyword') {
    return keyword;
  }

  const vector = input.embedding
    ? cosineSimilarity(input.embeddingProvider.embedText(input.query), input.embedding)
    : 0;

  if (input.mode === 'hybrid') {
    return hybridScore(vector, keyword);
  }

  return vector;
}

export function hybridScore(vectorScore: number, keywordScoreValue: number): number {
  const safeVectorScore = Math.max(vectorScore, 0);
  const safeKeywordScore = Math.max(keywordScoreValue, 0);
  return safeVectorScore * 0.7 + safeKeywordScore * 0.3;
}

export function keywordScore(query: string, content: string): number {
  const queryTerms = normalisedTerms(query);
  if (queryTerms.length === 0) {
    return 0;
  }

  const contentTerms = normalisedTerms(content);
  if (contentTerms.length === 0) {
    return 0;
  }

  const contentTermSet = new Set(contentTerms);
  const matchedTerms = queryTerms.filter((term) => contentTermSet.has(term));

  return matchedTerms.length / queryTerms.length;
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
