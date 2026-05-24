import { resolve } from 'node:path';
import { loadConfig } from '../config.js';
import {
  createDocumentPool,
  PostgresDocumentRepository
} from './postgresDocumentRepository.js';
import { loadSeedDocuments } from './seedCorpus.js';

const config = loadConfig();
const pool = createDocumentPool(config.DATABASE_URL);
const repository = new PostgresDocumentRepository(pool);
const seedRoot = resolve(process.cwd(), '../../infra/seed/documents');

try {
  const documents = await loadSeedDocuments(seedRoot);

  for (const document of documents) {
    await repository.ingest(document);
  }

  console.log(`Seeded ${documents.length} documents.`);
} finally {
  await pool.end();
}
