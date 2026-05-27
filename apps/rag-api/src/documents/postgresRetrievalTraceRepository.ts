import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import type {
  CreateRetrievalTraceInput,
  RetrievalTraceChunk,
  RetrievalTraceRecord,
  RetrievalMode
} from './types.js';
import type { RetrievalTraceRepository } from './retrievalTraceRepository.js';

type RetrievalTraceRow = {
  id: string;
  query: string;
  limit_value: number;
  retrieval_mode: RetrievalMode;
  result_count: number;
  duration_ms: number;
  chunks: RetrievalTraceChunk[];
  created_at: Date;
};

export class PostgresRetrievalTraceRepository implements RetrievalTraceRepository {
  constructor(private readonly pool: Pool) {}

  async create(input: CreateRetrievalTraceInput): Promise<RetrievalTraceRecord> {
    const chunks = input.chunks.map<RetrievalTraceChunk>((chunk, index) => ({
      rank: index + 1,
      chunkId: chunk.id,
      documentId: chunk.documentId,
      sourceId: chunk.document.sourceId,
      title: chunk.document.title,
      score: chunk.score,
      chunkIndex: chunk.chunkIndex,
      headingPath: chunk.headingPath
    }));

    const result = await this.pool.query<RetrievalTraceRow>(
      `INSERT INTO rag.retrieval_traces (
        id,
        query,
        limit_value,
        retrieval_mode,
        result_count,
        duration_ms,
        chunks
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, query, limit_value, retrieval_mode, result_count, duration_ms, chunks, created_at`,
      [
        randomUUID(),
        input.query,
        input.limit,
        input.retrievalMode,
        chunks.length,
        input.durationMs,
        JSON.stringify(chunks)
      ]
    );

    return mapRetrievalTraceRow(result.rows[0]);
  }

  async get(traceId: string): Promise<RetrievalTraceRecord | null> {
    const result = await this.pool.query<RetrievalTraceRow>(
      'SELECT id, query, limit_value, retrieval_mode, result_count, duration_ms, chunks, created_at FROM rag.retrieval_traces WHERE id = $1',
      [traceId]
    );

    return result.rows[0] ? mapRetrievalTraceRow(result.rows[0]) : null;
  }
}

function mapRetrievalTraceRow(row: RetrievalTraceRow): RetrievalTraceRecord {
  return {
    id: row.id,
    query: row.query,
    limit: row.limit_value,
    retrievalMode: row.retrieval_mode,
    resultCount: row.result_count,
    durationMs: row.duration_ms,
    chunks: row.chunks,
    createdAt: row.created_at.toISOString()
  };
}
