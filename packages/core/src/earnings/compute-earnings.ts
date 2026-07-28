import { z } from "zod";
import type { EstimatedRange, FollowerRange } from "@kairos/shared";

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

// Fonction pure — implémentée en Phase 2 avec les tests fixtures d'abord.
export function computeEarnings(_input: EarningsInput): EstimatedRange {
  throw new Error("computeEarnings: not implemented — Phase 2");
}
