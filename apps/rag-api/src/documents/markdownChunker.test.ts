import { describe, expect, it } from 'vitest';
import { chunkMarkdown } from './markdownChunker.js';

describe('chunkMarkdown', () => {
  it('creates heading-aware chunks', () => {
    const chunks = chunkMarkdown(`# Policy\n\nIntro text.\n\n## Eligibility\n\nPermanent employees qualify.\n\n## Equipment\n\nLaptops are provided.`);

    expect(chunks).toHaveLength(3);
    expect(chunks[0]).toMatchObject({
      chunkIndex: 0,
      headingPath: ['Policy']
    });
    expect(chunks[1]).toMatchObject({
      chunkIndex: 1,
      headingPath: ['Policy', 'Eligibility']
    });
    expect(chunks[2]).toMatchObject({
      chunkIndex: 2,
      headingPath: ['Policy', 'Equipment']
    });
  });

  it('returns no chunks for empty markdown', () => {
    expect(chunkMarkdown('   \n\n  ')).toEqual([]);
  });
});
