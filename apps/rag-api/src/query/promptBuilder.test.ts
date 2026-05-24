import { describe, expect, it } from 'vitest';
import type { RetrievedChunkRecord } from '../documents/types.js';
import { buildQueryPrompt } from './promptBuilder.js';

function chunk(overrides: Partial<RetrievedChunkRecord> = {}): RetrievedChunkRecord {
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
    score: 0.95,
    document: {
      id: 'document-1',
      sourceId: 'remote-work-policy',
      title: 'Remote Work Policy',
      version: '1.0.0'
    },
    ...overrides
  };
}

describe('buildQueryPrompt', () => {
  it('renders retrieved chunks with citation indexes and source metadata', () => {
    const prompt = buildQueryPrompt('How often can employees work remotely?', [chunk()]);

    expect(prompt.system).toContain('Answer only from the retrieved context');
    expect(prompt.context).toEqual([
      {
        citationIndex: 1,
        chunkId: 'chunk-1',
        sourceId: 'remote-work-policy',
        title: 'Remote Work Policy',
        headingPath: ['Remote Work', 'Eligibility'],
        content: 'Employees may work remotely two days per week.'
      }
    ]);
    expect(prompt.user).toContain('Question: How often can employees work remotely?');
    expect(prompt.user).toContain('[1] Remote Work Policy');
    expect(prompt.user).toContain('sourceId: remote-work-policy');
    expect(prompt.user).toContain('chunkId: chunk-1');
    expect(prompt.user).toContain('heading: Remote Work / Eligibility');
  });

  it('renders an explicit no-context prompt when retrieval returns no chunks', () => {
    const prompt = buildQueryPrompt('What is the refund policy?', []);

    expect(prompt.context).toEqual([]);
    expect(prompt.user).toContain('No retrieved context.');
  });
});
