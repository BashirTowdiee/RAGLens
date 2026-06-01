import type { DocumentRepository } from '../documents/documentRepository.js';
import { resolveRetrievalQuery } from '../documents/queryRewrite.js';
import type { RetrievalTraceRepository } from '../documents/retrievalTraceRepository.js';
import type { MetadataFilters, RetrievalMode } from '../documents/types.js';
import {
  AnswerProviderError,
  DeterministicAnswerProvider,
  type AnswerProvider
} from './answerProvider.js';
import { validateCitations, type CitationValidationResult } from './citationValidation.js';
import { buildQueryPrompt, type QueryPromptChunk } from './promptBuilder.js';
import type {
  ProviderCallTelemetry,
  QueryTraceConfig,
  QueryTraceRepository
} from './queryTraceRepository.js';
import type { RagConfigRecord } from './ragConfigRepository.js';

const QUERY_PROMPT_VERSION = 'query-prompt-v1';

export type QueryCitation = {
  chunkId: string;
  documentId: string;
  sourceId: string;
  title: string;
  headingPath: string[];
  rank: number;
  score: number;
  originalScore?: number;
  rerankScore?: number;
};

export type QueryResult = {
  answer: string;
  citations: QueryCitation[];
  citationValidation: CitationValidationResult;
  traceId: string;
  retrievalQuery: string;
  queryRewriteEnabled: boolean;
  usage: {
    retrievedChunks: number;
    citedChunks: number;
    provider: string;
    model: string;
  };
  latencyMs: number;
};

export type QueryInput = {
  question: string;
  topK?: number;
  retrievalMode?: RetrievalMode;
  rewriteQuery?: boolean;
  metadataFilters?: MetadataFilters;
  ragConfig?: RagConfigRecord | null;
};

export class QueryProviderFailure extends Error {
  constructor(
    public readonly providerError: AnswerProviderError,
    public readonly traceId: string
  ) {
    super(providerError.message);
    this.name = 'QueryProviderFailure';
  }
}

export class QueryService {
  private readonly resolveProviderTimeoutMs: () => number;
  private readonly resolvePromptContextTokenBudget: () => number;

  constructor(
    private readonly documentRepository: DocumentRepository,
    private readonly retrievalTraceRepository: RetrievalTraceRepository,
    private readonly queryTraceRepository: QueryTraceRepository,
    private readonly answerProvider: AnswerProvider = new DeterministicAnswerProvider(),
    providerTimeoutMs: number | (() => number) = 10000,
    promptContextTokenBudget: number | (() => number) = 1200,
    private readonly answerProviderResolver?: (
      ragConfig: RagConfigRecord | null
    ) => AnswerProvider
  ) {
    this.resolveProviderTimeoutMs =
      typeof providerTimeoutMs === 'function' ? providerTimeoutMs : () => providerTimeoutMs;
    this.resolvePromptContextTokenBudget =
      typeof promptContextTokenBudget === 'function'
        ? promptContextTokenBudget
        : () => promptContextTokenBudget;
  }

  async answer(input: QueryInput): Promise<QueryResult> {
    const startTime = Date.now();
    const topK = input.topK ?? input.ragConfig?.topK ?? 5;
    const retrievalMode = input.retrievalMode ?? input.ragConfig?.retrievalMode ?? 'vector';
    const contextTokenBudget =
      input.ragConfig?.promptContextTokenBudget ?? this.resolvePromptContextTokenBudget();
    const { retrievalQuery, queryRewriteEnabled } = resolveRetrievalQuery({
      query: input.question,
      retrievalMode,
      rewriteQuery: input.rewriteQuery
    });
    const config: QueryTraceConfig = {
      topK,
      retrievalMode,
      metadataFilters: input.metadataFilters,
      queryRewriteEnabled,
      retrievalQuery,
      contextTokenBudget,
      ragConfigId: input.ragConfig?.id,
      ragConfigName: input.ragConfig?.name,
      answerProvider: input.ragConfig?.answerProvider,
      answerModel: input.ragConfig?.answerModel,
      embeddingProvider: input.ragConfig?.embeddingProvider,
      embeddingModel: input.ragConfig?.embeddingModel
    };
    const chunks = await this.documentRepository.searchChunks({
      query: retrievalQuery,
      limit: topK,
      mode: retrievalMode,
      metadataFilters: input.metadataFilters
    });
    await this.retrievalTraceRepository.create({
      query: retrievalQuery,
      limit: topK,
      retrievalMode,
      durationMs: Date.now() - startTime,
      chunks
    });
    const prompt = buildQueryPrompt(input.question, chunks, {
      maxContextTokens: contextTokenBudget
    });
    const citations = createCitations(prompt.context);
    const citationValidation = validateCitations(citations, chunks);
    const providerStartTime = Date.now();
    config.packedChunkCount = prompt.context.length;
    config.droppedChunkCount = Math.max(0, chunks.length - prompt.context.length);

    const selectedProvider = this.answerProviderResolver
      ? this.answerProviderResolver(input.ragConfig ?? null)
      : this.answerProvider;

    try {
      const providerResult = await withTimeout(
        selectedProvider.generate({
          question: input.question,
          prompt
        }),
        this.resolveProviderTimeoutMs()
      );
      const latencyMs = Date.now() - startTime;
      const providerCall: ProviderCallTelemetry = {
        provider: providerResult.provider,
        model: providerResult.model,
        status: 'succeeded',
        latencyMs: Date.now() - providerStartTime,
        promptTokens: providerResult.usage?.promptTokens ?? null,
        completionTokens: providerResult.usage?.completionTokens ?? null,
        totalTokens: providerResult.usage?.totalTokens ?? null,
        estimatedCostUsd: providerResult.usage?.estimatedCostUsd ?? null,
        errorCode: null
      };
      const usage = {
        retrievedChunks: chunks.length,
        citedChunks: citations.length,
        provider: providerResult.provider,
        model: providerResult.model
      };
      const queryTrace = await this.queryTraceRepository.create({
        question: input.question,
        answer: providerResult.answer,
        provider: providerResult.provider,
        model: providerResult.model,
        promptVersion: QUERY_PROMPT_VERSION,
        config,
        usage: {
          retrievedChunks: usage.retrievedChunks,
          citedChunks: usage.citedChunks
        },
        latencyMs,
        citationValidation,
        citations,
        providerCall
      });

      return {
        answer: providerResult.answer,
        citations,
        citationValidation,
        traceId: queryTrace.id,
        retrievalQuery,
        queryRewriteEnabled,
        usage,
        latencyMs
      };
    } catch (error) {
      const providerError = toProviderError(error);
      if (providerError) {
        const providerCall: ProviderCallTelemetry = {
          provider: providerError.provider,
          model: 'unknown',
          status: 'failed',
          latencyMs: Date.now() - providerStartTime,
          promptTokens: null,
          completionTokens: null,
          totalTokens: null,
          estimatedCostUsd: null,
          errorCode: providerError.code
        };
        const queryTrace = await this.queryTraceRepository.create({
          status: 'failed',
          question: input.question,
          answer: '',
          provider: providerError.provider,
          model: 'unknown',
          promptVersion: QUERY_PROMPT_VERSION,
          config,
          usage: {
            retrievedChunks: chunks.length,
            citedChunks: 0
          },
          latencyMs: Date.now() - startTime,
          citationValidation,
          citations: [],
          providerCall,
          error: {
            code: providerError.code,
            message: providerError.message,
            provider: providerError.provider,
            retryable: providerError.retryable
          }
        });

        throw new QueryProviderFailure(providerError, queryTrace.id);
      }

      throw error;
    }
  }
}

function toProviderError(error: unknown): AnswerProviderError | null {
  if (error instanceof AnswerProviderError) {
    return error;
  }

  if (error instanceof Error && error.message === 'answer_provider_timeout') {
    return new AnswerProviderError(
      'provider_timeout',
      'The answer provider timed out.',
      'unknown',
      true
    );
  }

  if (error instanceof Error) {
    return new AnswerProviderError('provider_unavailable', error.message, 'unknown', true);
  }

  return new AnswerProviderError(
    'provider_unavailable',
    'The answer provider is unavailable.',
    'unknown',
    true
  );
}

async function withTimeout<T>(operation: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<T>((_, reject) => {
        timeoutHandle = setTimeout(() => reject(new Error('answer_provider_timeout')), timeoutMs);
      })
    ]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}

function createCitations(chunks: QueryPromptChunk[]): QueryCitation[] {
  return chunks.map<QueryCitation>((chunk) => ({
    chunkId: chunk.chunkId,
    documentId: chunk.documentId,
    sourceId: chunk.sourceId,
    title: chunk.title,
    headingPath: chunk.headingPath,
    rank: chunk.citationIndex,
    score: chunk.score,
    originalScore: chunk.originalScore,
    rerankScore: chunk.rerankScore
  }));
}
