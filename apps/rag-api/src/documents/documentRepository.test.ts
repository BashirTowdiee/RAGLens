import { describe, expect, it } from 'vitest';
import {
  clampRetrievalScore,
  InMemoryDocumentRepository,
  hybridScore,
  keywordScore,
  metadataMatches,
  rerankedScore,
  rerankScore,
  retrievalMetadataFor
} from './documentRepository.js';
import { NoopReranker } from './reranker.js';

const scoreWeightTolerance = 8;

describe('keywordScore', () => {
  it('scores lexical matches as a fraction of query terms', () => {
    expect(
      keywordScore('remote work policy', 'Remote employees follow the hybrid work policy.')
    ).toBeCloseTo(0.75);
    expect(keywordScore('remote work policy', 'Remote employees receive equipment.')).toBeCloseTo(0.25);
    expect(keywordScore('remote work policy', 'Catering guidelines apply.')).toBe(0);
  });

  it('boosts exact phrase matches and dense repeated matches', () => {
    const densePhrase = keywordScore(
      'remote work policy',
      'The remote work policy applies. Remote work policy details are documented.'
    );
    const sparseMatch = keywordScore(
      'remote work policy',
      'Remote guidelines exist and work varies by team under policy references.'
    );

    expect(densePhrase).toBeGreaterThan(sparseMatch);
    expect(densePhrase).toBeCloseTo(0.93);
  });

  it('normalizes duplicate query terms before scoring', () => {
    expect(keywordScore('remote remote remote', 'remote work policy')).toBeCloseTo(0.75);
  });
});

describe('hybridScore', () => {
  it('combines vector and keyword scores with bounded positive weights', () => {
    expect(hybridScore(1, 0)).toBeCloseTo(0.7);
    expect(hybridScore(0, 1)).toBeCloseTo(0.3);
    expect(hybridScore(0.5, 0.5)).toBeCloseTo(0.5);
  });

  it('clamps out-of-range inputs to normalized score bounds', () => {
    expect(hybridScore(2, 2)).toBe(1);
    expect(hybridScore(-2, -2)).toBe(0);
  });
});

describe('rerankScore', () => {
  it('prioritises heading matches while retaining content matches', () => {
    expect(
      rerankScore('remote work', {
        headingPath: ['Remote Work'],
        content: 'Equipment setup applies to laptops.'
      })
    ).toBeGreaterThan(
      rerankScore('remote work', {
        headingPath: ['Equipment'],
        content: 'Remote work applies to eligible employees.'
      })
    );
  });
});

describe('rerankedScore', () => {
  it('combines original and rerank scores with stable weights', () => {
    expect(rerankedScore(1, 0)).toBeCloseTo(0.6);
    expect(rerankedScore(0, 1)).toBeCloseTo(0.4);
    expect(rerankedScore(0.5, 0.5)).toBeCloseTo(0.5);
  });

  it('clamps combined rerank output to normalized bounds', () => {
    expect(rerankedScore(2, 2)).toBe(1);
    expect(rerankedScore(-2, -2)).toBe(0);
  });
});

describe('clampRetrievalScore', () => {
  it('clamps retrieval scores to the 0..1 range', () => {
    expect(clampRetrievalScore(0.4)).toBe(0.4);
    expect(clampRetrievalScore(2)).toBe(1);
    expect(clampRetrievalScore(-2)).toBe(0);
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

  it('returns original and rerank scores for hybrid reranked retrieval', async () => {
    const repository = new InMemoryDocumentRepository();
    await repository.ingest({
      sourceId: 'remote-guide',
      title: 'Remote Guide',
      sourceType: 'markdown',
      content: '# Remote Guide\n\n## Remote Work\n\nEligible employees can use the remote work policy.'
    });
    await repository.ingest({
      sourceId: 'equipment-guide',
      title: 'Equipment Guide',
      sourceType: 'markdown',
      content: '# Equipment Guide\n\n## Devices\n\nEmployees receive laptops and monitors.'
    });

    const results = await repository.searchChunks({
      query: 'remote work',
      mode: 'hybrid_reranked',
      limit: 5
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].document.sourceId).toBe('remote-guide');
    expect(results[0].originalScore).toBeDefined();
    expect(results[0].rerankScore).toBeDefined();
    expect(results[0].score).toBeCloseTo(
      rerankedScore(results[0].originalScore ?? 0, results[0].rerankScore ?? 0),
      scoreWeightTolerance
    );
  });

  it('supports a no-op reranker adapter for deterministic fallback behaviour', async () => {
    const repository = new InMemoryDocumentRepository(undefined, new NoopReranker());
    await repository.ingest({
      sourceId: 'remote-guide',
      title: 'Remote Guide',
      sourceType: 'markdown',
      content: '# Remote Guide\n\n## Remote Work\n\nEligible employees can use the remote work policy.'
    });

    const results = await repository.searchChunks({
      query: 'remote work',
      mode: 'hybrid_reranked',
      limit: 5
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].originalScore).toBeDefined();
    expect(results[0].rerankScore).toBeDefined();
    expect(results[0].rerankScore).toBeCloseTo(results[0].originalScore ?? 0);
    expect(results[0].score).toBeCloseTo(results[0].originalScore ?? 0, scoreWeightTolerance);
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
