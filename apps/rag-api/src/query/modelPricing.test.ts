import { describe, expect, it } from 'vitest';
import { estimateCostUsd } from './modelPricing.js';

describe('estimateCostUsd', () => {
  it('returns null when pricing config is missing', () => {
    expect(
      estimateCostUsd(
        { promptTokens: 1000, completionTokens: 500, totalTokens: 1500 },
        {}
      )
    ).toBeNull();
  });

  it('estimates USD cost using input and output token prices', () => {
    expect(
      estimateCostUsd(
        { promptTokens: 2000, completionTokens: 1000, totalTokens: 3000 },
        { inputCostPer1MTokens: 0.5, outputCostPer1MTokens: 1.5 }
      )
    ).toBeCloseTo(0.0025, 8);
  });
});
