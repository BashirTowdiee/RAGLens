import { describe, expect, it } from 'vitest';
import {
  InMemoryDocumentRepository,
  hybridScore,
  keywordScore,
  metadataMatches,
  retrievalMetadataFor
} from './documentRepository.js';

describe('keywordScore', () => {
  it('scores lexical matches as a fraction of query terms', () => {
    expect(keywordScore('remote work policy', 'Remote employees follow the hybrid work policy.')).toBeCloseTo(1);
    expect(keywordScore('remote work policy', 'Remote employees receive equipment.')).toBeCloseTo(1 / 3);
    expect(keywordScore('remote work policy', 'Catering guidelines apply.')).toBe(0);
  });
});

describe('hybridScore', () => {
  it('combines vector and keyword scores with bounded positive weights', () => {
    expect(hybridScore(1, 0)).toBeCloseTo(0.7);
    expect(hybridScore(0, 1)).toBeCloseTo(0.3);
    expect(hybridScore(0.5, 0.5)).toBeCloseTo(0.5);
  });
});

describe('metadataMatches', () => {
  it('matches exact shallow metadata filters', () => {
    expect(metadataMatches({ source: 'policy', version: 2, active: true }, { source: 'policy' })).toBe(true);
    expect(metadataMatches({ source: 'policy', version: 2, active: true }, { version: 2, active: true })).toBe(true);
    expect(metadataMatches({ source: 'policy' }, { source: 'runbook' })).toBe(false);
  });
});

describe('retrievalMetadataFor', () => {
  it('merges document and chunk metadata with chunk metadata taking precedence', () => {
    expect(
      retrievalMetadataFor(
        { metadata: { source: 'policy', region: 'global' } },
        { metadata: { region: 'au', section: 'benefits' } }
      )
    ).toEqual({
      source: 'policy',
      region: 'au',
      section: 'benefits'
    });
  });
});

describe('InMemoryDocumentRepository keyword retrieval', () => {
  it('returns lexical matches ordered by keyword score', async () => {
    const repository = new InMemoryDocumentRepository();
    await repository.ingest({
      sourceId: 'remote-guide',
      title: 'Remote Guide',
      sourceType: 'markdown',
      content: '# Remote Guide\n\n## Work\n\nRemote work applies to eligible employees.'
    });
    await repository.ingest({
      sourceId: 'equipment-guide',
      title: 'Equipment Guide',
      sourceType: 'markdown',
      content: '# Equipment Guide\n\n## Devices\n\nEmployees receive laptops and monitors.'
    });

    const results = await repository.searchChunks({
      query: 'remote work',
      mode: 'keyword',
      limit: 5
    });

    expect(results).toHaveLength(2);
    expect(results[0].document.sourceId).toBe('remote-guide');
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

describe('InMemoryDocumentRepository hybrid retrieval', () => {
  it('combines vector and keyword results into one ranked result set', async () => {
    const repository = new InMemoryDocumentRepository();
    await repository.ingest({
      sourceId: 'remote-guide',
      title: 'Remote Guide',
      sourceType: 'markdown',
      content: '# Remote Guide\n\nRemote work applies to eligible employees.'
    });
    await repository.ingest({
      sourceId: 'equipment-guide',
      title: 'Equipment Guide',
      sourceType: 'markdown',
      content: '# Equipment Guide\n\nEmployees receive laptops and monitors.'
    });

    const keywordResults = await repository.searchChunks({
      query: 'remote work',
      mode: 'keyword',
      limit: 5
    });
    const vectorResults = await repository.searchChunks({
      query: 'remote work',
      mode: 'vector',
      limit: 5
    });
    const hybridResults = await repository.searchChunks({
      query: 'remote work',
      mode: 'hybrid',
      limit: 5
    });

    expect(hybridResults).toHaveLength(vectorResults.length);
    expect(hybridResults[0].document.sourceId).toBe('remote-guide');
    expect(hybridResults[0].score).toBeGreaterThan(keywordResults[0].score * 0.3);
    expect(hybridResults.map((result) => result.document.sourceId)).toEqual(
      expect.arrayContaining(['remote-guide', 'equipment-guide'])
    );
  });
});

describe('InMemoryDocumentRepository metadata filters', () => {
  it('filters retrieval results by document metadata', async () => {
    const repository = new InMemoryDocumentRepository();
    await repository.ingest({
      sourceId: 'au-policy',
      title: 'AU Policy',
      sourceType: 'markdown',
      metadata: { region: 'au', source: 'policy' },
      content: '# Remote Policy\n\nRemote work applies to employees in Australia.'
    });
    await repository.ingest({
      sourceId: 'us-policy',
      title: 'US Policy',
      sourceType: 'markdown',
      metadata: { region: 'us', source: 'policy' },
      content: '# Remote Policy\n\nRemote work applies to employees in the United States.'
    });

    const results = await repository.searchChunks({
      query: 'remote work policy',
      mode: 'hybrid',
      limit: 5,
      metadataFilters: { region: 'au' }
    });

    expect(results).toHaveLength(1);
    expect(results[0].document.sourceId).toBe('au-policy');
  });
});
