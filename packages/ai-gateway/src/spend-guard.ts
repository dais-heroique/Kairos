import type { PlanSlug } from "@kairos/shared";

// Quotas par plan (§ garde-fous de coût) — Free (radar) 3 briefs/mois,
// Creator 60, Pro 200. Vérifiés avant l'appel, jamais après.
export const PLAN_QUOTAS: Record<PlanSlug, number> = {
  radar: 3,
  creator: 60,
  pro: 200,
};

export interface QuotaCheckResult {
  allowed: boolean;
  used: number;
  limit: number;
  remaining: number;
}

export function checkQuota(plan: PlanSlug, currentMonthUsage: number): QuotaCheckResult {
  const limit = PLAN_QUOTAS[plan];
  return {
    allowed: currentMonthUsage < limit,
    used: currentMonthUsage,
    limit,
    remaining: Math.max(0, limit - currentMonthUsage),
  };
}

export interface ModelPricing {
  inputCentsPer1kTokens: number;
  outputCentsPer1kTokens: number;
}

// Tarifs approximatifs, en centimes par 1000 tokens — provisoires, à
// ajuster contre les tarifs réels au moment du déploiement (voir
// docs/STATE.md). Volontairement conservateurs (arrondi au centime
// supérieur dans computeCostCents) : mieux vaut sur-estimer une dépense
// que la sous-compter dans un garde-fou de coût.
export const DEFAULT_MODEL_PRICING: Record<string, ModelPricing> = {
  "gemini-2.5-flash": { inputCentsPer1kTokens: 0.0075, outputCentsPer1kTokens: 0.03 },
  "claude-sonnet-5": { inputCentsPer1kTokens: 0.3, outputCentsPer1kTokens: 1.5 },
};

export function computeCostCents(
  model: string,
  inputTokens: number,
  outputTokens: number,
  pricing: Record<string, ModelPricing> = DEFAULT_MODEL_PRICING,
): number {
  const rates = pricing[model];
  if (!rates) {
    throw new Error(
      `computeCostCents: no pricing configured for model "${model}" — add it to ModelPricing rather than guessing a cost`,
    );
  }
  const cost = (inputTokens / 1000) * rates.inputCentsPer1kTokens + (outputTokens / 1000) * rates.outputCentsPer1kTokens;
  return Math.ceil(cost);
}

export function isGlobalCapExceeded(dailySpendCents: number, capCents: number): boolean {
  return dailySpendCents >= capCents;
}
