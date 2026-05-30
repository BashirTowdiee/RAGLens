export type TokenUsage = {
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
};

export type ModelPricingConfig = {
  inputCostPer1MTokens?: number;
  outputCostPer1MTokens?: number;
};

export function estimateCostUsd(
  usage: TokenUsage,
  pricing: ModelPricingConfig
): number | null {
  if (
    !isNonNegativeNumber(pricing.inputCostPer1MTokens) ||
    !isNonNegativeNumber(pricing.outputCostPer1MTokens)
  ) {
    return null;
  }

  const promptTokens = usage.promptTokens ?? 0;
  const completionTokens = usage.completionTokens ?? 0;
  const promptCost = (promptTokens / 1_000_000) * pricing.inputCostPer1MTokens;
  const completionCost = (completionTokens / 1_000_000) * pricing.outputCostPer1MTokens;

  const total = promptCost + completionCost;
  if (!Number.isFinite(total)) {
    return null;
  }

  return Number(total.toFixed(8));
}

function isNonNegativeNumber(value: number | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}
