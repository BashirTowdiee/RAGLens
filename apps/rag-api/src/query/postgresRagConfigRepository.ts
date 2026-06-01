import type { Pool } from 'pg';
import type { RetrievalMode } from '../documents/types.js';
import {
  defaultInMemoryRagConfigs,
  type RagConfigRecord,
  type RagConfigRepository
} from './ragConfigRepository.js';

type RagConfigRow = {
  id: string;
  name: string;
  answer_provider: RagConfigRecord['answerProvider'];
  answer_model: string;
  embedding_provider: RagConfigRecord['embeddingProvider'];
  embedding_model: string;
  retrieval_mode: RetrievalMode;
  top_k: number;
  reranker_provider: RagConfigRecord['rerankerProvider'];
  prompt_context_token_budget: number;
  active: boolean;
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
};

export class PostgresRagConfigRepository implements RagConfigRepository {
  private readonly fallbackConfigs = defaultInMemoryRagConfigs();

  constructor(private readonly pool: Pool) {}

  async listActive(): Promise<RagConfigRecord[]> {
    try {
      const result = await this.pool.query<RagConfigRow>(
        `SELECT
          id,
          name,
          answer_provider,
          answer_model,
          embedding_provider,
          embedding_model,
          retrieval_mode,
          top_k,
          reranker_provider,
          prompt_context_token_budget,
          active,
          metadata,
          created_at,
          updated_at
        FROM rag.rag_configs
        WHERE active = true
        ORDER BY name ASC`
      );

      return result.rows.map(mapRagConfigRow);
    } catch (error) {
      if (isUndefinedTableError(error)) {
        return this.fallbackConfigs.filter((entry) => entry.active);
      }

      throw error;
    }
  }

  async getById(configId: string): Promise<RagConfigRecord | null> {
    try {
      const result = await this.pool.query<RagConfigRow>(
        `SELECT
          id,
          name,
          answer_provider,
          answer_model,
          embedding_provider,
          embedding_model,
          retrieval_mode,
          top_k,
          reranker_provider,
          prompt_context_token_budget,
          active,
          metadata,
          created_at,
          updated_at
        FROM rag.rag_configs
        WHERE id = $1 AND active = true`,
        [configId]
      );

      return result.rows[0] ? mapRagConfigRow(result.rows[0]) : null;
    } catch (error) {
      if (isUndefinedTableError(error)) {
        return this.fallbackConfigs.find((entry) => entry.id === configId && entry.active) ?? null;
      }

      throw error;
    }
  }
}

function mapRagConfigRow(row: RagConfigRow): RagConfigRecord {
  return {
    id: row.id,
    name: row.name,
    answerProvider: row.answer_provider,
    answerModel: row.answer_model,
    embeddingProvider: row.embedding_provider,
    embeddingModel: row.embedding_model,
    retrievalMode: row.retrieval_mode,
    topK: row.top_k,
    rerankerProvider: row.reranker_provider,
    promptContextTokenBudget: row.prompt_context_token_budget,
    active: row.active,
    metadata: row.metadata ?? {},
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString()
  };
}

function isUndefinedTableError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as { code?: unknown };
  return candidate.code === '42P01';
}
