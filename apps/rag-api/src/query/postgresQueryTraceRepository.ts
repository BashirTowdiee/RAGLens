import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import type { CitationValidationResult } from './citationValidation.js';
import type { QueryCitation } from './queryService.js';
import type {
  CreateQueryTraceInput,
  ProviderCallTelemetry,
  QueryTraceChunkRecord,
  QueryTraceCitationRecord,
  QueryTraceError,
  QueryTraceRecord,
  QueryTraceRepository,
  QueryTraceStatus
} from './queryTraceRepository.js';

type QueryTraceRow = {
  id: string;
  status: QueryTraceStatus;
  question: string;
  answer: string;
  provider: string;
  model: string;
  usage: QueryTraceRecord['usage'];
  latency_ms: number;
  citation_validation: CitationValidationResult;
  citations: QueryCitation[];
  provider_call: ProviderCallTelemetry | null;
  error: QueryTraceError | null;
  created_at: Date;
};

export class PostgresQueryTraceRepository implements QueryTraceRepository {
  constructor(private readonly pool: Pool) {}

  async create(input: CreateQueryTraceInput): Promise<QueryTraceRecord> {
    const result = await this.pool.query<QueryTraceRow>(
      `INSERT INTO rag.query_traces (
        id,
        status,
        question,
        answer,
        provider,
        model,
        usage,
        latency_ms,
        citation_validation,
        citations,
        provider_call,
        error
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id, status, question, answer, provider, model, usage, latency_ms, citation_validation, citations, provider_call, error, created_at`,
      [
        input.id ?? randomUUID(),
        input.status ?? 'succeeded',
        input.question,
        input.answer,
        input.provider,
        input.model,
        JSON.stringify(input.usage),
        input.latencyMs,
        JSON.stringify(input.citationValidation),
        JSON.stringify(input.citations),
        input.providerCall ? JSON.stringify(input.providerCall) : null,
        input.error ? JSON.stringify(input.error) : null
      ]
    );

    return mapQueryTraceRow(result.rows[0]);
  }

  async get(traceId: string): Promise<QueryTraceRecord | null> {
    const result = await this.pool.query<QueryTraceRow>(
      `SELECT id, status, question, answer, provider, model, usage, latency_ms, citation_validation, citations, provider_call, error, created_at
       FROM rag.query_traces
       WHERE id = $1`,
      [traceId]
    );

    return result.rows[0] ? mapQueryTraceRow(result.rows[0]) : null;
  }

  async list(): Promise<QueryTraceRecord[]> {
    const result = await this.pool.query<QueryTraceRow>(
      `SELECT id, status, question, answer, provider, model, usage, latency_ms, citation_validation, citations, provider_call, error, created_at
       FROM rag.query_traces
       ORDER BY created_at DESC`
    );

    return result.rows.map(mapQueryTraceRow);
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

function mapQueryTraceRow(row: QueryTraceRow): QueryTraceRecord {
  return {
    id: row.id,
    status: row.status,
    question: row.question,
    answer: row.answer,
    provider: row.provider,
    model: row.model,
    usage: row.usage,
    latencyMs: row.latency_ms,
    citationValidation: row.citation_validation,
    citations: row.citations,
    providerCall: row.provider_call,
    error: row.error,
    createdAt: row.created_at.toISOString()
  };
}
