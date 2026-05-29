import type { DocumentRepository } from '../documents/documentRepository.js';
import type { RetrievalTraceRepository } from '../documents/retrievalTraceRepository.js';
import type { RetrievedChunkRecord, RetrievalMode } from '../documents/types.js';
import {
  AnswerProviderError,
  DeterministicAnswerProvider,
  type AnswerProvider
} from './answerProvider.js';
import { validateCitations, type CitationValidationResult } from './citationValidation.js';
import { buildQueryPrompt } from './promptBuilder.js';
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
    private readonly providerTimeoutMs = 10000
  ) {}

  async answer(input: QueryInput): Promise<QueryResult> {
    const startTime = Date.now();
    const topK = input.topK ?? 5;
    const retrievalMode = input.retrievalMode ?? 'vector';
    const config: QueryTraceConfig = {
      topK,
      retrievalMode
    };
    const chunks = await this.documentRepository.searchChunks({
      query: input.question,
      limit: topK,
      mode: retrievalMode
    });
    await this.retrievalTraceRepository.create({
      query: input.question,
      limit: topK,
      retrievalMode,
      durationMs: Date.now() - startTime,
      chunks
    });
    const citations = createCitations(chunks);
    const citationValidation = validateCitations(citations, chunks);
    const prompt = buildQueryPrompt(input.question, chunks);
    const providerStartTime = Date.now();

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

function createCitations(chunks: RetrievedChunkRecord[]): QueryCitation[] {
  return chunks.map<QueryCitation>((chunk, index) => ({
    chunkId: chunk.id,
    documentId: chunk.documentId,
    sourceId: chunk.document.sourceId,
    title: chunk.document.title,
    headingPath: chunk.headingPath,
    rank: index + 1,
    score: chunk.score,
    originalScore: chunk.originalScore,
    rerankScore: chunk.rerankScore
  }));
}
