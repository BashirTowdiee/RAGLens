import { randomUUID } from 'node:crypto';
import type { CitationValidationResult } from './citationValidation.js';
import type { QueryCitation } from './queryService.js';

export type QueryTraceChunkRecord = QueryCitation & {
  traceId: string;
};

export type QueryTraceCitationRecord = QueryCitation & {
  traceId: string;
  citationIndex: number;
};

export type QueryTraceRecord = {
  id: string;
  question: string;
  answer: string;
  provider: string;
  model: string;
  usage: {
    retrievedChunks: number;
    citedChunks: number;
  };
  latencyMs: number;
  citationValidation: CitationValidationResult;
  citations: QueryCitation[];
  createdAt: string;
};

export type CreateQueryTraceInput = {
  id?: string;
  question: string;
  answer: string;
  provider: string;
  model: string;
  usage: {
    retrievedChunks: number;
    citedChunks: number;
  };
  latencyMs: number;
  citationValidation: CitationValidationResult;
  citations: QueryCitation[];
};

export interface QueryTraceRepository {
  create(input: CreateQueryTraceInput): Promise<QueryTraceRecord>;
  get(traceId: string): Promise<QueryTraceRecord | null>;
  list(): Promise<QueryTraceRecord[]>;
  listChunks(traceId: string): Promise<QueryTraceChunkRecord[] | null>;
  listCitations(traceId: string): Promise<QueryTraceCitationRecord[] | null>;
}

export class InMemoryQueryTraceRepository implements QueryTraceRepository {
  private readonly traces = new Map<string, QueryTraceRecord>();

  async create(input: CreateQueryTraceInput): Promise<QueryTraceRecord> {
    const trace: QueryTraceRecord = {
      id: input.id ?? randomUUID(),
      question: input.question,
      answer: input.answer,
      provider: input.provider,
      model: input.model,
      usage: input.usage,
      latencyMs: input.latencyMs,
      citationValidation: input.citationValidation,
      citations: input.citations,
      createdAt: new Date().toISOString()
    };

    this.traces.set(trace.id, trace);
    return trace;
  }

  async get(traceId: string): Promise<QueryTraceRecord | null> {
    return this.traces.get(traceId) ?? null;
  }

  async list(): Promise<QueryTraceRecord[]> {
    return Array.from(this.traces.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async listChunks(traceId: string): Promise<QueryTraceChunkRecord[] | null> {
    const trace = await this.get(traceId);

    if (!trace) {
      return null;
    }

    return trace.citations
      .map((citation) => ({
        ...citation,
        traceId
      }))
      .sort((a, b) => a.rank - b.rank);
  }

  async listCitations(traceId: string): Promise<QueryTraceCitationRecord[] | null> {
    const trace = await this.get(traceId);

    if (!trace) {
      return null;
    }

    return trace.citations.map((citation, index) => ({
      ...citation,
      traceId,
      citationIndex: index + 1
    }));
  }
}
