import { describe, expect, it } from 'vitest';
import { resolveRetrievalQuery, rewriteSearchQuery } from './queryRewrite.js';

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

describe('resolveRetrievalQuery', () => {
  it('enables rewrite by default for keyword and hybrid retrieval modes', () => {
    expect(resolveRetrievalQuery({ query: 'pto', retrievalMode: 'keyword' })).toEqual({
      retrievalQuery: 'pto paid time off leave',
      queryRewriteEnabled: true
    });
    expect(resolveRetrievalQuery({ query: 'wfh policy', retrievalMode: 'hybrid' })).toEqual({
      retrievalQuery: 'wfh remote work home policy',
      queryRewriteEnabled: true
    });
  });

  it('keeps vector mode unchanged unless explicitly enabled', () => {
    expect(resolveRetrievalQuery({ query: 'MFA setup', retrievalMode: 'vector' })).toEqual({
      retrievalQuery: 'MFA setup',
      queryRewriteEnabled: false
    });
    expect(
      resolveRetrievalQuery({
        query: 'MFA setup',
        retrievalMode: 'vector',
        rewriteQuery: true
      })
    ).toEqual({
      retrievalQuery: 'mfa multi factor authentication setup',
      queryRewriteEnabled: true
    });
  });

  it('allows explicit opt-out for keyword retrieval', () => {
    expect(
      resolveRetrievalQuery({
        query: 'pto',
        retrievalMode: 'keyword',
        rewriteQuery: false
      })
    ).toEqual({
      retrievalQuery: 'pto',
      queryRewriteEnabled: false
    });
  });
});
