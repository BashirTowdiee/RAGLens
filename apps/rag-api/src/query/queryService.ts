import type { DocumentRepository } from '../documents/documentRepository.js';
import type { RetrievalTraceRepository } from '../documents/retrievalTraceRepository.js';
import type { RetrievedChunkRecord } from '../documents/types.js';
import {
  DeterministicAnswerProvider,
  type AnswerProvider
} from './answerProvider.js';
import { validateCitations, type CitationValidationResult } from './citationValidation.js';
import { buildQueryPrompt } from './promptBuilder.js';

export type QueryCitation = {
  chunkId: string;
  documentId: string;
  sourceId: string;
  title: string;
  headingPath: string[];
  rank: number;
  score: number;
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
};

export class QueryService {
  constructor(
    private readonly documentRepository: DocumentRepository,
    private readonly retrievalTraceRepository: RetrievalTraceRepository,
    private readonly answerProvider: AnswerProvider = new DeterministicAnswerProvider()
  ) {}

  async answer(input: QueryInput): Promise<QueryResult> {
    const startTime = Date.now();
    const topK = input.topK ?? 5;
    const chunks = await this.documentRepository.searchChunks({
      query: input.question,
      limit: topK
    });
    const trace = await this.retrievalTraceRepository.create({
      query: input.question,
      limit: topK,
      durationMs: Date.now() - startTime,
      chunks
    });
    const citations = createCitations(chunks);
    const citationValidation = validateCitations(citations, chunks);
    const prompt = buildQueryPrompt(input.question, chunks);
    const providerResult = await this.answerProvider.generate({
      question: input.question,
      prompt
    });

    return {
      answer: providerResult.answer,
      citations,
      citationValidation,
      traceId: trace.id,
      usage: {
        retrievedChunks: chunks.length,
        citedChunks: citations.length,
        provider: providerResult.provider,
        model: providerResult.model
      },
      latencyMs: Date.now() - startTime
    };
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
    score: chunk.score
  }));
}
