import { randomUUID } from 'node:crypto';
import type {
  CreateRetrievalTraceInput,
  RetrievalTraceChunk,
  RetrievalTraceRecord
} from './types.js';

export interface RetrievalTraceRepository {
  create(input: CreateRetrievalTraceInput): Promise<RetrievalTraceRecord>;
  get(traceId: string): Promise<RetrievalTraceRecord | null>;
}

export class InMemoryRetrievalTraceRepository implements RetrievalTraceRepository {
  private readonly traces = new Map<string, RetrievalTraceRecord>();

  async create(input: CreateRetrievalTraceInput): Promise<RetrievalTraceRecord> {
    const trace: RetrievalTraceRecord = {
      id: randomUUID(),
      query: input.query,
      limit: input.limit,
      retrievalMode: input.retrievalMode,
      resultCount: input.chunks.length,
      durationMs: input.durationMs,
      chunks: input.chunks.map<RetrievalTraceChunk>((chunk, index) => ({
        rank: index + 1,
        chunkId: chunk.id,
        documentId: chunk.documentId,
        sourceId: chunk.document.sourceId,
        title: chunk.document.title,
        score: chunk.score,
        originalScore: chunk.originalScore,
        rerankScore: chunk.rerankScore,
        chunkIndex: chunk.chunkIndex,
        headingPath: chunk.headingPath
      })),
      createdAt: new Date().toISOString()
    };

    this.traces.set(trace.id, trace);
    return trace;
  }

  async get(traceId: string): Promise<RetrievalTraceRecord | null> {
    return this.traces.get(traceId) ?? null;
  }
}
