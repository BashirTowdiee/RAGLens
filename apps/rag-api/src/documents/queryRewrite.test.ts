import { describe, expect, it } from 'vitest';
import { rewriteSearchQuery } from './queryRewrite.js';

describe('rewriteSearchQuery', () => {
  it('expands known operational abbreviations for retrieval', () => {
    expect(rewriteSearchQuery('pto')).toBe('pto paid time off leave');
    expect(rewriteSearchQuery('WFH policy')).toBe('wfh remote work home policy');
  });

  it('deduplicates rewritten query terms while preserving deterministic order', () => {
    expect(rewriteSearchQuery('remote wfh remote')).toBe('remote wfh work home');
  });

  it('normalises punctuation and casing before rewriting', () => {
    expect(rewriteSearchQuery('MFA/SSO?')).toBe(
      'mfa multi factor authentication sso single sign on'
    );
  });
});
