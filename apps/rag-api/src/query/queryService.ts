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
  constructor(
    private readonly documentRepository: DocumentRepository,
    private readonly retrievalTraceRepository: RetrievalTraceRepository,
    private readonly queryTraceRepository: QueryTraceRepository,
    private readonly answerProvider: AnswerProvider = new DeterministicAnswerProvider(),
    private readonly providerTimeoutMs = 10000,
    private readonly promptContextTokenBudget = 1200
  ) {}

  async answer(input: QueryInput): Promise<QueryResult> {
    const startTime = Date.now();
    const topK = input.topK ?? 5;
    const retrievalMode = input.retrievalMode ?? 'vector';
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
      contextTokenBudget: this.promptContextTokenBudget
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
      maxContextTokens: this.promptContextTokenBudget
    });
    const citations = createCitations(prompt.context);
    const citationValidation = validateCitations(citations, chunks);
    const providerStartTime = Date.now();
    config.packedChunkCount = prompt.context.length;
    config.droppedChunkCount = Math.max(0, chunks.length - prompt.context.length);

    try {
      const providerResult = await withTimeout(
        this.answerProvider.generate({
          question: input.question,
          prompt
        }),
        this.providerTimeoutMs
      );
      const latencyMs = Date.now() - startTime;
      const providerCall: ProviderCallTelemetry = {
        provider: providerResult.provider,
        model: providerResult.model,
        status: 'succeeded',
        latencyMs: Date.now() - providerStartTime,
        promptTokens: null,
        completionTokens: null,
        totalTokens: null,
        estimatedCostUsd: null,
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
