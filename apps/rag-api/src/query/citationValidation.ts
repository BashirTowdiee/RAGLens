import type { RetrievedChunkRecord } from '../documents/types.js';
import type { QueryCitation } from './queryService.js';

export type CitationValidationIssue = {
  citationIndex: number;
  chunkId: string;
  code: 'chunk_not_retrieved' | 'document_mismatch';
  message: string;
};

export type CitationValidationResult = {
  valid: boolean;
  citationCount: number;
  retrievedChunkCount: number;
  issues: CitationValidationIssue[];
};

export function validateCitations(
  citations: QueryCitation[],
  retrievedChunks: RetrievedChunkRecord[]
): CitationValidationResult {
  const retrievedByChunkId = new Map(retrievedChunks.map((chunk) => [chunk.id, chunk]));
  const issues = citations.flatMap<CitationValidationIssue>((citation, index) => {
    const retrievedChunk = retrievedByChunkId.get(citation.chunkId);

    if (!retrievedChunk) {
      return [
        {
          citationIndex: index + 1,
          chunkId: citation.chunkId,
          code: 'chunk_not_retrieved',
          message: 'Citation does not map to a retrieved chunk.'
        }
      ];
    }

    if (retrievedChunk.documentId !== citation.documentId) {
      return [
        {
          citationIndex: index + 1,
          chunkId: citation.chunkId,
          code: 'document_mismatch',
          message: 'Citation chunk belongs to a different document than the citation reports.'
        }
      ];
    }

    return [];
  });

  return {
    valid: issues.length === 0,
    citationCount: citations.length,
    retrievedChunkCount: retrievedChunks.length,
    issues
  };
}
