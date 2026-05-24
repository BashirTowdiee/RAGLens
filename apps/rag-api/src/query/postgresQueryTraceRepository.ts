import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import type { CitationValidationResult } from './citationValidation.js';
import type { QueryCitation } from './queryService.js';
import type {
  CreateQueryTraceInput,
  QueryTraceRecord,
  QueryTraceRepository
} from './queryTraceRepository.js';

type QueryTraceRow = {
  id: string;
  question: string;
  answer: string;
  provider: string;
  model: string;
  usage: QueryTraceRecord['usage'];
  latency_ms: number;
  citation_validation: CitationValidationResult;
  citations: QueryCitation[];
  created_at: Date;
};

export class PostgresQueryTraceRepository implements QueryTraceRepository {
  constructor(private readonly pool: Pool) {}

  async create(input: CreateQueryTraceInput): Promise<QueryTraceRecord> {
    const result = await this.pool.query<QueryTraceRow>(
      `INSERT INTO rag.query_traces (
        id,
        question,
        answer,
        provider,
        model,
        usage,
        latency_ms,
        citation_validation,
        citations
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, question, answer, provider, model, usage, latency_ms, citation_validation, citations, created_at`,
      [
        input.id ?? randomUUID(),
        input.question,
        input.answer,
        input.provider,
        input.model,
        JSON.stringify(input.usage),
        input.latencyMs,
        JSON.stringify(input.citationValidation),
        JSON.stringify(input.citations)
      ]
    );

    return mapQueryTraceRow(result.rows[0]);
  }

  async get(traceId: string): Promise<QueryTraceRecord | null> {
    const result = await this.pool.query<QueryTraceRow>(
      `SELECT id, question, answer, provider, model, usage, latency_ms, citation_validation, citations, created_at
       FROM rag.query_traces
       WHERE id = $1`,
      [traceId]
    );

    return result.rows[0] ? mapQueryTraceRow(result.rows[0]) : null;
  }

  async list(): Promise<QueryTraceRecord[]> {
    const result = await this.pool.query<QueryTraceRow>(
      `SELECT id, question, answer, provider, model, usage, latency_ms, citation_validation, citations, created_at
       FROM rag.query_traces
       ORDER BY created_at DESC`
    );

    return result.rows.map(mapQueryTraceRow);
  }
}

function mapQueryTraceRow(row: QueryTraceRow): QueryTraceRecord {
  return {
    id: row.id,
    question: row.question,
    answer: row.answer,
    provider: row.provider,
    model: row.model,
    usage: row.usage,
    latencyMs: row.latency_ms,
    citationValidation: row.citation_validation,
    citations: row.citations,
    createdAt: row.created_at.toISOString()
  };
}
