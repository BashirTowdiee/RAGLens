import { createHash } from 'node:crypto';

export type MarkdownChunk = {
  chunkIndex: number;
  headingPath: string[];
  content: string;
  tokenCountEstimate: number;
  contentHash: string;
};

const HEADING_PATTERN = /^(#{1,6})\s+(.+)$/;

export function contentHash(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

export function estimateTokenCount(content: string): number {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words * 1.3));
}

export function chunkMarkdown(content: string): MarkdownChunk[] {
  const normalised = content.replace(/\r\n/g, '\n').trim();

  if (!normalised) {
    return [];
  }

  const chunks: Omit<MarkdownChunk, 'chunkIndex' | 'contentHash' | 'tokenCountEstimate'>[] = [];
  const headingStack: string[] = [];
  let currentHeadingPath: string[] = [];
  let currentLines: string[] = [];

  function flushCurrentChunk() {
    const chunkContent = currentLines.join('\n').trim();

    if (!chunkContent) {
      currentLines = [];
      return;
    }

    chunks.push({
      headingPath: currentHeadingPath,
      content: chunkContent
    });
    currentLines = [];
  }

  for (const line of normalised.split('\n')) {
    const headingMatch = HEADING_PATTERN.exec(line.trim());

    if (headingMatch) {
      flushCurrentChunk();

      const level = headingMatch[1].length;
      const heading = headingMatch[2].trim();
      headingStack.length = level - 1;
      headingStack[level - 1] = heading;
      currentHeadingPath = headingStack.filter(Boolean);
      currentLines.push(line.trim());
      continue;
    }

    currentLines.push(line);
  }

  flushCurrentChunk();

  return chunks.map((chunk, index) => ({
    ...chunk,
    chunkIndex: index,
    tokenCountEstimate: estimateTokenCount(chunk.content),
    contentHash: contentHash(chunk.content)
  }));
}
