const QUERY_REWRITE_EXPANSIONS: Record<string, string[]> = {
  pto: ['paid', 'time', 'off', 'leave'],
  wfh: ['remote', 'work', 'home'],
  vpn: ['virtual', 'private', 'network'],
  mfa: ['multi', 'factor', 'authentication'],
  sso: ['single', 'sign', 'on']
};

export function rewriteSearchQuery(query: string): string {
  const terms = normalisedTerms(query);
  const rewrittenTerms: string[] = [];

  for (const term of terms) {
    rewrittenTerms.push(term);
    rewrittenTerms.push(...(QUERY_REWRITE_EXPANSIONS[term] ?? []));
  }

  return [...new Set(rewrittenTerms)].join(' ');
}

function normalisedTerms(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/u)
    .filter(Boolean);
}
