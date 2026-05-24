import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Pool } from 'pg';
import { applyMigrations } from '../test/applyMigrations.js';
import { PostgresDocumentRepository } from './postgresDocumentRepository.js';

const databaseUrl = process.env.TEST_DATABASE_URL;

const runWhenPostgresAvailable = databaseUrl ? describe : describe.skip;

runWhenPostgresAvailable('PostgresDocumentRepository integration', () => {
  let pool: Pool;
  let repository: PostgresDocumentRepository;

  beforeAll(async () => {
    pool = new Pool({ connectionString: databaseUrl });
    await applyMigrations(pool);
    await pool.query('TRUNCATE rag.document_chunks, rag.documents RESTART IDENTITY CASCADE');
    repository = new PostgresDocumentRepository(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  it('persists documents and chunks in Postgres', async () => {
    const result = await repository.ingest({
      sourceId: 'integration-policy',
      title: 'Integration Policy',
      sourceType: 'markdown',
      sourceUri: 'policies/integration-policy.md',
      version: '1.0.0',
      content: '# Integration Policy\n\n## Eligibility\n\nEmployees qualify.\n\n## Equipment\n\nLaptops are provided.',
      metadata: { category: 'policy' }
    });

    expect(result.document.sourceId).toBe('integration-policy');
    expect(result.chunks).toHaveLength(3);

    const documents = await repository.listDocuments();
    expect(documents).toHaveLength(1);
    expect(documents[0].metadata).toEqual({ category: 'policy' });

    const chunks = await repository.listChunks(result.document.id);
    expect(chunks.map((chunk) => chunk.headingPath)).toEqual([
      ['Integration Policy'],
      ['Integration Policy', 'Eligibility'],
      ['Integration Policy', 'Equipment']
    ]);
  });

  it('replaces chunks when a source document is re-ingested', async () => {
    const first = await repository.ingest({
      sourceId: 'replace-policy',
      title: 'Replace Policy',
      sourceType: 'markdown',
      content: '# Replace Policy\n\n## First\n\nOld content.'
    });

    const second = await repository.ingest({
      sourceId: 'replace-policy',
      title: 'Replace Policy',
      sourceType: 'markdown',
      content: '# Replace Policy\n\n## Second\n\nNew content.'
    });

    expect(second.document.id).toBe(first.document.id);

    const chunks = await repository.listChunks(second.document.id);
    expect(chunks).toHaveLength(2);
    expect(chunks[1].headingPath).toEqual(['Replace Policy', 'Second']);
  });
});
