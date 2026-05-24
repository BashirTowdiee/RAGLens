import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { loadSeedDocuments } from './seedCorpus.js';

describe('loadSeedDocuments', () => {
  it('loads markdown seed documents with stable source metadata', async () => {
    const root = await mkdtemp(join(tmpdir(), 'raglens-seed-'));
    const policies = join(root, 'policies');
    await mkdir(policies);
    await writeFile(join(root, 'README.md'), '# Ignore me');
    await writeFile(
      join(policies, 'remote-work-policy.md'),
      '# Remote Work Policy\n\n## Eligibility\n\nEmployees may work remotely.'
    );

    const documents = await loadSeedDocuments(root);

    expect(documents).toHaveLength(1);
    expect(documents[0]).toMatchObject({
      sourceId: 'remote-work-policy',
      title: 'Remote Work Policy',
      sourceType: 'markdown',
      sourceUri: 'policies/remote-work-policy.md',
      metadata: {
        seed: true,
        relativePath: 'policies/remote-work-policy.md'
      }
    });
  });

  it('falls back to a title generated from source ID', async () => {
    const root = await mkdtemp(join(tmpdir(), 'raglens-seed-'));
    await writeFile(join(root, 'known-issues.md'), 'No heading in this document.');

    const documents = await loadSeedDocuments(root);

    expect(documents[0].title).toBe('Known Issues');
  });
});
