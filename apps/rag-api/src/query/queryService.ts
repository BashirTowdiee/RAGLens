import type { DocumentRepository } from '../documents/documentRepository.js';
import type { RetrievalTraceRepository } from '../documents/retrievalTraceRepository.js';
import type { RetrievedChunkRecord } from '../documents/types.js';

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
  traceId: string;
  usage: {
    retrievedChunks: number;
    citedChunks: number;
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
    private readonly retrievalTraceRepository: RetrievalTraceRepository
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

    return {
      answer: citations.length === 0 ? insufficientEvidenceAnswer(input.question) : citedAnswer(input.question, chunks),
      citations,
      traceId: trace.id,
      usage: {
        retrievedChunks: chunks.length,
        citedChunks: citations.length
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

function citedAnswer(question: string, chunks: RetrievedChunkRecord[]): string {
  const contextPreview = chunks
    .slice(0, 2)
    .map((chunk, index) => `[${index + 1}] ${chunk.content}`)
    .join('\n\n');

  return `Based on the retrieved context for "${question}":\n\n${contextPreview}`;
}

function insufficientEvidenceAnswer(question: string): string {
  return `I do not have enough retrieved context to answer "${question}" with evidence.`;
}
