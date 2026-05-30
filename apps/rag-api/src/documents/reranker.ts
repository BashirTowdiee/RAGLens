export type RerankCandidate = {
  content: string;
  headingPath: string[];
};

export interface Reranker {
  kind: 'deterministic' | 'none';
  rerank(query: string, candidate: RerankCandidate): number;
}

export class DeterministicReranker implements Reranker {
  readonly kind = 'deterministic' as const;

  rerank(query: string, candidate: RerankCandidate): number {
    const headingScore = keywordScore(query, candidate.headingPath.join(' '));
    const contentScore = keywordScore(query, candidate.content);
    return Math.max(headingScore, contentScore * 0.5);
  }
}

export class NoopReranker implements Reranker {
  readonly kind = 'none' as const;

  rerank(query: string, candidate: RerankCandidate): number {
    void query;
    void candidate;
    return 0;
  }
}

function keywordScore(query: string, content: string): number {
  const queryTerms = uniqueTerms(query);
  if (queryTerms.length === 0) {
    return 0;
  }

  const contentTerms = normalisedTerms(content);
  if (contentTerms.length === 0) {
    return 0;
  }

  const termFrequencies = new Map<string, number>();
  for (const term of contentTerms) {
    termFrequencies.set(term, (termFrequencies.get(term) ?? 0) + 1);
  }

  const matchedTerms = queryTerms.filter((term) => termFrequencies.has(term));
  const baseCoverage = matchedTerms.length / queryTerms.length;

  if (matchedTerms.length === 0) {
    return 0;
  }

  const densityBonus = densityScore(termFrequencies, matchedTerms);
  const phraseBonus = phraseMatchBonus(query, content);

  return clampScore(baseCoverage * 0.75 + densityBonus + phraseBonus);
}

function densityScore(termFrequencies: Map<string, number>, matchedTerms: string[]): number {
  const totalFrequency = matchedTerms.reduce(
    (sum, term) => sum + (termFrequencies.get(term) ?? 0),
    0
  );
  const averageFrequency = totalFrequency / matchedTerms.length;
  const extraDensity = Math.max(averageFrequency - 1, 0);
  return Math.min(extraDensity * 0.08, 0.15);
}

function phraseMatchBonus(query: string, content: string): number {
  const normalizedQuery = normaliseText(query);
  const normalizedContent = normaliseText(content);
  if (!normalizedQuery || !normalizedContent) {
    return 0;
  }

  return normalizedContent.includes(normalizedQuery) ? 0.1 : 0;
}

function normaliseText(value: string): string {
  return normalisedTerms(value).join(' ');
}

function uniqueTerms(value: string): string[] {
  return [...new Set(normalisedTerms(value))];
}

function clampScore(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function normalisedTerms(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/u)
    .filter(Boolean);
}
