import type { RetrievedChunkRecord } from '../documents/types.js';

export type QueryPrompt = {
  system: string;
  user: string;
  context: QueryPromptChunk[];
};

export type QueryPromptChunk = {
  citationIndex: number;
  chunkId: string;
  documentId: string;
  sourceId: string;
  title: string;
  headingPath: string[];
  content: string;
  score: number;
  originalScore?: number;
  rerankScore?: number;
  tokenCountEstimate: number;
};

export type BuildQueryPromptOptions = {
  maxContextTokens?: number;
};

const DEFAULT_MAX_CONTEXT_TOKENS = 1200;

export function buildQueryPrompt(
  question: string,
  chunks: RetrievedChunkRecord[],
  options: BuildQueryPromptOptions = {}
): QueryPrompt {
  const maxContextTokens = options.maxContextTokens ?? DEFAULT_MAX_CONTEXT_TOKENS;
  const packedChunks = packContextChunks(chunks, maxContextTokens);
  const context = packedChunks.map<QueryPromptChunk>((chunk, index) => ({
    citationIndex: index + 1,
    chunkId: chunk.id,
    documentId: chunk.documentId,
    sourceId: chunk.document.sourceId,
    title: chunk.document.title,
    headingPath: chunk.headingPath,
    content: chunk.content,
    score: chunk.score,
    originalScore: chunk.originalScore,
    rerankScore: chunk.rerankScore,
    tokenCountEstimate: chunk.tokenCountEstimate
  }));

  return {
    system: [
      'You are RAGLens answer generation.',
      'Answer only from the retrieved context.',
      'Cite every factual claim using the provided citation indexes.',
      'Return an insufficient-evidence response when the context does not answer the question.'
    ].join(' '),
    user: [`Question: ${question}`, '', 'Retrieved context:', renderPromptContext(context)].join('\n'),
    context
  };
}

type PackedChunk = Pick<
  RetrievedChunkRecord,
  | 'id'
  | 'documentId'
  | 'headingPath'
  | 'content'
  | 'score'
  | 'originalScore'
  | 'rerankScore'
  | 'tokenCountEstimate'
  | 'document'
>;

export function packContextChunks(
  chunks: RetrievedChunkRecord[],
  maxContextTokens: number
): PackedChunk[] {
  const budget = Math.max(1, Math.floor(maxContextTokens));
  const packed: PackedChunk[] = [];
  let consumedTokens = 0;

  for (const chunk of chunks) {
    const chunkTokens = Math.max(1, chunk.tokenCountEstimate);
    const nextTotal = consumedTokens + chunkTokens;
    const canInclude = packed.length === 0 || nextTotal <= budget;

    if (!canInclude) {
      break;
    }

    packed.push(chunk);
    consumedTokens = nextTotal;
  }

  return packed;
}

function renderPromptContext(context: QueryPromptChunk[]): string {
  if (context.length === 0) {
    return 'No retrieved context.';
  }

  return context
    .map((chunk) => {
      const heading = chunk.headingPath.length > 0 ? chunk.headingPath.join(' / ') : 'No heading';
      return [
        `[${chunk.citationIndex}] ${chunk.title}`,
        `sourceId: ${chunk.sourceId}`,
        `chunkId: ${chunk.chunkId}`,
        `heading: ${heading}`,
        `tokenCountEstimate: ${chunk.tokenCountEstimate}`,
        chunk.content
      ].join('\n');
    })
    .join('\n\n');
}
