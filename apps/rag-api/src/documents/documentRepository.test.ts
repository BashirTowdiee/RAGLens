import { describe, expect, it } from 'vitest';
import { InMemoryDocumentRepository, keywordScore } from './documentRepository.js';

describe('keywordScore', () => {
  it('scores lexical matches as a fraction of query terms', () => {
    expect(keywordScore('remote work policy', 'Remote employees follow the hybrid work policy.')).toBeCloseTo(1);
    expect(keywordScore('remote work policy', 'Remote employees receive equipment.')).toBeCloseTo(1 / 3);
    expect(keywordScore('remote work policy', 'Catering guidelines apply.')).toBe(0);
  });
});

describe('InMemoryDocumentRepository keyword retrieval', () => {
  it('returns lexical matches ordered by keyword score', async () => {
    const repository = new InMemoryDocumentRepository();
    await repository.ingest({
      sourceId: 'remote-policy',
      title: 'Remote Policy',
      sourceType: 'markdown',
      content: '# Remote Policy\n\n## Work\n\nRemote work policy applies to eligible employees.'
    });
    await repository.ingest({
      sourceId: 'equipment-policy',
      title: 'Equipment Policy',
      sourceType: 'markdown',
      content: '# Equipment Policy\n\n## Devices\n\nEmployees receive laptops and monitors.'
    });

    const results = await repository.searchChunks({
      query: 'remote work policy',
      mode: 'keyword',
      limit: 5
    });

    expect(results).toHaveLength(2);
    expect(results[0].document.sourceId).toBe('remote-policy');
    expect(results[0].score).toBeGreaterThan(results[1].score);
    expect(results.every((result) => result.score > 0)).toBe(true);
  });

  it('returns an empty result set when no lexical terms match', async () => {
    const repository = new InMemoryDocumentRepository();
    await repository.ingest({
      sourceId: 'travel-policy',
      title: 'Travel Policy',
      sourceType: 'markdown',
      content: '# Travel Policy\n\nFlights require approval.'
    });

    const results = await repository.searchChunks({
      query: 'remote equipment',
      mode: 'keyword',
      limit: 5
    });

    expect(results).toEqual([]);
  });
});
