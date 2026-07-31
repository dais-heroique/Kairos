import { z } from "zod";
import type { EstimatedRange, FollowerRange } from "@kairos/shared";
import { clamp } from "../lib/math";
import { DEFAULT_EARNINGS_CONFIG, type EarningsConfig } from "../config/weights";

// M3 — gains = vues × taux de conversion médian × prix × taux de commission
// × (1 − taux de retour estimé). Toujours une fourchette + confiance, jamais
// un nombre nu (voir <EstimatedValue>).
export const earningsInputSchema = z.object({
  expectedViews: z.number().int().nonnegative(),
  followerRange: z.custom<FollowerRange>(),
  niche: z.string(),
  medianConversionRate: z.number().min(0).max(1),
  priceCents: z.number().int().nonnegative(),
  commissionRatePct: z.number().min(0).max(100),
  estimatedReturnRatePct: z.number().min(0).max(100),
});
export type EarningsInput = z.infer<typeof earningsInputSchema>;

/**
 * Fonction pure — pas d'accès Firebase/BigQuery. `config` fournit le taux
 * de retour par défaut et la largeur de fourchette min/max, surchargeables
 * depuis config/earningsConfig.
 */
export function computeEarnings(
  input: EarningsInput,
  config: EarningsConfig = DEFAULT_EARNINGS_CONFIG,
): EstimatedRange {
  const parsed = earningsInputSchema.parse(input);

  const unitsSold = parsed.expectedViews * parsed.medianConversionRate;
  const priceEur = parsed.priceCents / 100;
  const commissionRate = parsed.commissionRatePct / 100;
  const returnRate = parsed.estimatedReturnRatePct / 100;
  const netEarningsPerUnit = priceEur * commissionRate * (1 - returnRate);
  const midEarnings = unitsSold * netEarningsPerUnit;

  // Incertitude sur l'estimation : plus le volume de vues attendu est
  // faible, plus la fourchette est large (moins de données pour lisser le
  // taux de conversion "médian" vers une vraie moyenne).
  const viewsConfidenceFactor = clamp(Math.log10(Math.max(parsed.expectedViews, 10)) / 6, 0, 1);
  const spread = clamp(
    config.maxSpread - viewsConfidenceFactor * (config.maxSpread - config.minSpread),
    config.minSpread,
    config.maxSpread,
  );

  const low = Math.max(0, midEarnings * (1 - spread));
  const high = Math.max(low, midEarnings * (1 + spread));
  const confidence = clamp(1 - spread, 0.4, 0.95);

  return {
    low: Math.round(low * 100) / 100,
    high: Math.round(high * 100) / 100,
    confidence,
    method: "historical_regression",
  };
}
