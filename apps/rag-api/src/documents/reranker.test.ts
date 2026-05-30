import { describe, expect, it } from 'vitest';
import { DeterministicReranker, NoopReranker } from './reranker.js';

describe('DeterministicReranker', () => {
  it('prioritises heading lexical matches over weak content-only matches', () => {
    const reranker = new DeterministicReranker();

    const headingMatch = reranker.rerank('remote work', {
      headingPath: ['Remote Work'],
      content: 'Equipment setup applies to laptops.'
    });
    const contentMatch = reranker.rerank('remote work', {
      headingPath: ['Equipment'],
      content: 'Remote work applies to eligible employees.'
    });

    expect(headingMatch).toBeGreaterThan(contentMatch);
  });
});

describe('NoopReranker', () => {
  it('returns zero for deterministic fallback wiring', () => {
    const reranker = new NoopReranker();

    expect(
      reranker.rerank('remote work', {
        headingPath: ['Remote Work'],
        content: 'Employees may work remotely.'
      })
    ).toBe(0);
  });
});
