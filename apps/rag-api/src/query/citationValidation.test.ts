import { describe, expect, it } from 'vitest';
import type { RetrievedChunkRecord } from '../documents/types.js';
import type { QueryCitation } from './queryService.js';
import { validateCitations } from './citationValidation.js';

function retrievedChunk(overrides: Partial<RetrievedChunkRecord> = {}): RetrievedChunkRecord {
  return {
    id: 'chunk-1',
    documentId: 'document-1',
    chunkIndex: 0,
    headingPath: ['Remote Work', 'Eligibility'],
    content: 'Employees may work remotely two days per week.',
    tokenCountEstimate: 8,
    contentHash: 'hash-1',
    metadata: {},
    createdAt: '2026-05-25T00:00:00.000Z',
    score: 0.9,
    document: {
      id: 'document-1',
      sourceId: 'remote-work-policy',
      title: 'Remote Work Policy',
      version: '1.0.0'
    },
    ...overrides
  };
}

function citation(overrides: Partial<QueryCitation> = {}): QueryCitation {
  return {
    chunkId: 'chunk-1',
    documentId: 'document-1',
    sourceId: 'remote-work-policy',
    title: 'Remote Work Policy',
    headingPath: ['Remote Work', 'Eligibility'],
    rank: 1,
    score: 0.9,
    ...overrides
  };
}

describe('validateCitations', () => {
  it('passes when every citation maps to a retrieved chunk', () => {
    const result = validateCitations([citation()], [retrievedChunk()]);

    expect(result).toEqual({
      valid: true,
      citationCount: 1,
      retrievedChunkCount: 1,
      issues: []
    });
  });

  it('flags citations that do not map to retrieved chunks', () => {
    const result = validateCitations([citation({ chunkId: 'missing-chunk' })], [retrievedChunk()]);

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual([
      {
        citationIndex: 1,
        chunkId: 'missing-chunk',
        code: 'chunk_not_retrieved',
        message: 'Citation does not map to a retrieved chunk.'
      }
    ]);
  });

  it('flags citations whose document id does not match the retrieved chunk', () => {
    const result = validateCitations(
      [citation({ documentId: 'wrong-document' })],
      [retrievedChunk()]
    );

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual([
      {
        citationIndex: 1,
        chunkId: 'chunk-1',
        code: 'document_mismatch',
        message: 'Citation chunk belongs to a different document than the citation reports.'
      }
    ]);
  });
});
