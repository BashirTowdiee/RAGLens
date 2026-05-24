import { randomUUID } from 'node:crypto';
import type {
  DocumentChunkRecord,
  DocumentRecord,
  IngestDocumentInput,
  IngestDocumentResult
} from './types.js';
import { chunkMarkdown, contentHash } from './markdownChunker.js';

export interface DocumentRepository {
  ingest(input: IngestDocumentInput): Promise<IngestDocumentResult>;
  listDocuments(): Promise<DocumentRecord[]>;
  getDocument(documentId: string): Promise<DocumentRecord | null>;
  listChunks(documentId: string): Promise<DocumentChunkRecord[]>;
}

export class InMemoryDocumentRepository implements DocumentRepository {
  private readonly documents = new Map<string, DocumentRecord>();
  private readonly chunksByDocumentId = new Map<string, DocumentChunkRecord[]>();

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

    const chunkRecords = chunks.map<DocumentChunkRecord>((chunk) => ({
      id: randomUUID(),
      documentId: document.id,
      chunkIndex: chunk.chunkIndex,
      headingPath: chunk.headingPath,
      content: chunk.content,
      tokenCountEstimate: chunk.tokenCountEstimate,
      contentHash: chunk.contentHash,
      metadata: {},
      createdAt: now
    }));

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
}
