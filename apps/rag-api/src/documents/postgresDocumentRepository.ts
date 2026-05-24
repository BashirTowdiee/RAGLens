import { randomUUID } from 'node:crypto';
import { Pool, type PoolClient } from 'pg';
import type {
  DocumentChunkRecord,
  DocumentRecord,
  IngestDocumentInput,
  IngestDocumentResult,
  RetrievedChunkRecord,
  SearchChunksInput
} from './types.js';
import { chunkMarkdown, contentHash } from './markdownChunker.js';
import type { DocumentRepository } from './documentRepository.js';
import {
  DeterministicEmbeddingProvider,
  vectorToSql,
  type EmbeddingProvider
} from './embeddings.js';

type DocumentRow = {
  id: string;
  source_id: string;
  title: string;
  source_type: string;
  source_uri: string | null;
  version: string;
  content_hash: string;
  status: 'indexed';
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
};

type ChunkRow = {
  id: string;
  document_id: string;
  chunk_index: number;
  heading_path: string[];
  content: string;
  token_count_estimate: number;
  content_hash: string;
  metadata: Record<string, unknown>;
  created_at: Date;
};

type SearchChunkRow = ChunkRow & {
  score: number;
  source_id: string;
  title: string;
  source_uri: string | null;
  version: string;
};

export class PostgresDocumentRepository implements DocumentRepository {
  constructor(
    private readonly pool: Pool,
    private readonly embeddingProvider: EmbeddingProvider = new DeterministicEmbeddingProvider()
  ) {}

  async ingest(input: IngestDocumentInput): Promise<IngestDocumentResult> {
    const chunks = chunkMarkdown(input.content);

    if (chunks.length === 0) {
      throw new Error('Document content must produce at least one chunk.');
    }

    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const document = await this.upsertDocument(client, input);
      await client.query('DELETE FROM rag.document_chunks WHERE document_id = $1', [document.id]);

      const chunkRecords: DocumentChunkRecord[] = [];
      for (const chunk of chunks) {
        const result = await client.query<ChunkRow>(
          `INSERT INTO rag.document_chunks (
            id,
            document_id,
            chunk_index,
            heading_path,
            content,
            token_count_estimate,
            content_hash,
            embedding,
            metadata
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::vector, $9)
          RETURNING id, document_id, chunk_index, heading_path, content, token_count_estimate, content_hash, metadata, created_at`,
          [
            randomUUID(),
            document.id,
            chunk.chunkIndex,
            chunk.headingPath,
            chunk.content,
            chunk.tokenCountEstimate,
            chunk.contentHash,
            vectorToSql(this.embeddingProvider.embedText(chunk.content)),
            {}
          ]
        );
        chunkRecords.push(mapChunkRow(result.rows[0]));
      }

      await client.query('COMMIT');
      return { document, chunks: chunkRecords };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async listDocuments(): Promise<DocumentRecord[]> {
    const result = await this.pool.query<DocumentRow>(
      'SELECT * FROM rag.documents ORDER BY title ASC, created_at ASC'
    );
    return result.rows.map(mapDocumentRow);
  }

  async getDocument(documentId: string): Promise<DocumentRecord | null> {
    const result = await this.pool.query<DocumentRow>(
      'SELECT * FROM rag.documents WHERE id = $1',
      [documentId]
    );
    return result.rows[0] ? mapDocumentRow(result.rows[0]) : null;
  }

  async listChunks(documentId: string): Promise<DocumentChunkRecord[]> {
    const result = await this.pool.query<ChunkRow>(
      'SELECT id, document_id, chunk_index, heading_path, content, token_count_estimate, content_hash, metadata, created_at FROM rag.document_chunks WHERE document_id = $1 ORDER BY chunk_index ASC',
      [documentId]
    );
    return result.rows.map(mapChunkRow);
  }

  async searchChunks(input: SearchChunksInput): Promise<RetrievedChunkRecord[]> {
    const limit = input.limit ?? 5;
    const queryEmbedding = vectorToSql(this.embeddingProvider.embedText(input.query));
    const result = await this.pool.query<SearchChunkRow>(
      `SELECT
        chunk.id,
        chunk.document_id,
        chunk.chunk_index,
        chunk.heading_path,
        chunk.content,
        chunk.token_count_estimate,
        chunk.content_hash,
        chunk.metadata,
        chunk.created_at,
        document.source_id,
        document.title,
        document.source_uri,
        document.version,
        1 - (chunk.embedding <=> $1::vector) AS score
      FROM rag.document_chunks chunk
      INNER JOIN rag.documents document ON document.id = chunk.document_id
      WHERE chunk.embedding IS NOT NULL
      ORDER BY chunk.embedding <=> $1::vector ASC, chunk.chunk_index ASC
      LIMIT $2`,
      [queryEmbedding, limit]
    );

    return result.rows.map((row) => ({
      ...mapChunkRow(row),
      score: Number(row.score),
      document: {
        id: row.document_id,
        sourceId: row.source_id,
        title: row.title,
        sourceUri: row.source_uri ?? undefined,
        version: row.version
      }
    }));
  }

  private async upsertDocument(
    client: PoolClient,
    input: IngestDocumentInput
  ): Promise<DocumentRecord> {
    const existing = await client.query<DocumentRow>(
      'SELECT * FROM rag.documents WHERE source_id = $1',
      [input.sourceId]
    );
    const existingId = existing.rows[0]?.id ?? randomUUID();

    const result = await client.query<DocumentRow>(
      `INSERT INTO rag.documents (
        id,
        source_id,
        title,
        source_type,
        source_uri,
        version,
        content_hash,
        metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (source_id)
      DO UPDATE SET
        title = EXCLUDED.title,
        source_type = EXCLUDED.source_type,
        source_uri = EXCLUDED.source_uri,
        version = EXCLUDED.version,
        content_hash = EXCLUDED.content_hash,
        metadata = EXCLUDED.metadata,
        updated_at = now()
      RETURNING *`,
      [
        existingId,
        input.sourceId,
        input.title,
        input.sourceType,
        input.sourceUri ?? null,
        input.version ?? '1',
        contentHash(input.content),
        input.metadata ?? {}
      ]
    );

    return mapDocumentRow(result.rows[0]);
  }
}

export function createDocumentPool(databaseUrl: string): Pool {
  return new Pool({ connectionString: databaseUrl });
}

function mapDocumentRow(row: DocumentRow): DocumentRecord {
  return {
    id: row.id,
    sourceId: row.source_id,
    title: row.title,
    sourceType: row.source_type,
    sourceUri: row.source_uri ?? undefined,
    version: row.version,
    contentHash: row.content_hash,
    status: row.status,
    metadata: row.metadata,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString()
  };
}

function mapChunkRow(row: ChunkRow): DocumentChunkRecord {
  return {
    id: row.id,
    documentId: row.document_id,
    chunkIndex: row.chunk_index,
    headingPath: row.heading_path,
    content: row.content,
    tokenCountEstimate: row.token_count_estimate,
    contentHash: row.content_hash,
    metadata: row.metadata,
    createdAt: row.created_at.toISOString()
  };
}
