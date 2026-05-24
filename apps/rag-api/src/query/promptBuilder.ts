import type { RetrievedChunkRecord } from '../documents/types.js';

export type QueryPrompt = {
  system: string;
  user: string;
  context: QueryPromptChunk[];
};

export type QueryPromptChunk = {
  citationIndex: number;
  chunkId: string;
  sourceId: string;
  title: string;
  headingPath: string[];
  content: string;
};

export function buildQueryPrompt(question: string, chunks: RetrievedChunkRecord[]): QueryPrompt {
  const context = chunks.map<QueryPromptChunk>((chunk, index) => ({
    citationIndex: index + 1,
    chunkId: chunk.id,
    sourceId: chunk.document.sourceId,
    title: chunk.document.title,
    headingPath: chunk.headingPath,
    content: chunk.content
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
        chunk.content
      ].join('\n');
    })
    .join('\n\n');
}
