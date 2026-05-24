import { randomUUID } from 'node:crypto';
import type {
  DocumentChunkRecord,
  DocumentRecord,
  IngestDocumentInput,
  IngestDocumentResult,
  RetrievedChunkRecord,
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
    const queryEmbedding = this.embeddingProvider.embedText(input.query);
    const limit = input.limit ?? 5;

    return [...this.chunksByDocumentId.values()]
      .flat()
      .map((chunk) => {
        const document = this.documents.get(chunk.documentId);
        const embedding = this.embeddingsByChunkId.get(chunk.id);

        if (!document || !embedding) {
          return null;
        }

        return {
          ...chunk,
          score: cosineSimilarity(queryEmbedding, embedding),
          document: {
            id: document.id,
            sourceId: document.sourceId,
            title: document.title,
            sourceUri: document.sourceUri,
            version: document.version
          }
        };
      })
      .filter((chunk): chunk is RetrievedChunkRecord => chunk !== null)
      .sort((left, right) => right.score - left.score || left.chunkIndex - right.chunkIndex)
      .slice(0, limit);
  }
}
