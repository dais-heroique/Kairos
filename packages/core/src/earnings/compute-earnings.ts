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

  // Sans vues attendues, il n'y a rien à estimer — et surtout pas 0 €.
  // Un profil incomplet (onboarding abandonné, `avgViews` resté à 0)
  // produisait auparavant une fourchette « 0 €–0 € » étiquetée « à
  // confirmer », c'est-à-dire un résultat qui avait toutes les apparences
  // d'un calcul abouti. C'est le pire des cas : l'utilisateur croit que le
  // produit ne rapporte rien, alors que c'est son profil qui manque.
  // `insufficient_data` existe exactement pour ça, et <EstimatedValue>
  // affiche alors un tiret au lieu d'un montant.
  //
  // Le prix et le taux de commission relèvent exactement du même cas, et
  // c'est la source du bug « 0 € partout » constaté le 2026-08-11 sur des
  // produits réels : la collecte ne renvoie pas toujours le taux de
  // commission, et `toProductRankItem` le remplace par `?? 0`. Multiplié,
  // ce zéro produisait une fourchette 0 €–0 € avec une confiance élevée —
  // un chiffre inventé au sens strict, puisqu'il affirme « ce produit ne
  // rapporte rien » là où la vérité est « on ne sait pas ce qu'il
  // rapporte ». Un produit d'affiliation réellement à 0 % de commission
  // n'existe pas dans un catalogue d'affiliation ; entre les deux
  // lectures, on prend celle qui n'affirme rien.
  if (
    parsed.expectedViews === 0 ||
    parsed.medianConversionRate === 0 ||
    parsed.priceCents === 0 ||
    parsed.commissionRatePct === 0
  ) {
    return { low: 0, high: 0, confidence: 0, method: "insufficient_data" };
  }

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
