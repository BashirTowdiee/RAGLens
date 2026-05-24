import { readdir, readFile } from 'node:fs/promises';
import { basename, join, relative } from 'node:path';
import type { IngestDocumentInput } from './types.js';

export type SeedDocument = IngestDocumentInput;

export async function loadSeedDocuments(rootDir: string): Promise<SeedDocument[]> {
  const markdownPaths = await collectMarkdownFiles(rootDir);

  const documents = await Promise.all(
    markdownPaths.map(async (path) => {
      const content = await readFile(path, 'utf-8');
      const relativePath = relative(rootDir, path).replaceAll('\\', '/');
      const sourceId = basename(path, '.md');
      const title = extractTitle(content) ?? titleFromSourceId(sourceId);

      return {
        sourceId,
        title,
        sourceType: 'markdown' as const,
        sourceUri: relativePath,
        version: '1',
        content,
        metadata: {
          seed: true,
          relativePath
        }
      };
    })
  );

  return documents.sort((left, right) => left.sourceId.localeCompare(right.sourceId));
}

async function collectMarkdownFiles(rootDir: string): Promise<string[]> {
  const entries = await readdir(rootDir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const path = join(rootDir, entry.name);

      if (entry.isDirectory()) {
        return collectMarkdownFiles(path);
      }

      if (entry.isFile() && entry.name.endsWith('.md') && entry.name !== 'README.md') {
        return [path];
      }

      return [];
    })
  );

  return files.flat();
}

function extractTitle(content: string): string | null {
  const firstHeading = content
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.startsWith('# '));

  return firstHeading?.replace(/^#\s+/, '').trim() ?? null;
}

function titleFromSourceId(sourceId: string): string {
  return sourceId
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
