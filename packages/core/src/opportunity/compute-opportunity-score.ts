import type { Commission, Phase, ProductVerdict, SellerTrust } from "@kairos/shared";
import { clamp } from "../lib/math";
import { DEFAULT_OPPORTUNITY_WEIGHTS, type OpportunityWeights } from "../config/weights";

const PHASE_SCORE: Record<Phase, number> = {
  emergence: 100,
  growth: 85,
  late_growth: 55,
  maturity: 25,
  decline: 5,
};

function commissionScoreOf(commission: Commission): number {
  let score = commission.ratePct;
  // Une commission réservée ("targeted only") est hors de portée pour la
  // plupart des créateurs — elle pèse donc moins dans le score
  // d'opportunité même si le taux affiché est élevé.
  if (commission.isTargetedOnly) score *= 0.6;
  if (commission.isOpenCollab) score = Math.min(100, score * 1.1);
  return clamp(score, 0, 100);
}

/**
 * Classement "opportunités" (M2 #9) — phase précoce × commission élevée ×
 * vendeur fiable × faible saturation. Fonction pure.
 */
export function computeOpportunityScore(
  verdict: ProductVerdict,
  commission: Commission,
  sellerTrust: SellerTrust,
  weights: OpportunityWeights = DEFAULT_OPPORTUNITY_WEIGHTS,
): number {
  const phaseScore = PHASE_SCORE[verdict.phase];
  const commissionScore = commissionScoreOf(commission);
  const sellerTrustScore = clamp(sellerTrust.score, 0, 100);
  const saturationInverseScore = clamp(100 - verdict.saturationScore, 0, 100);

  const score =
    weights.phase * phaseScore +
    weights.commission * commissionScore +
    weights.sellerTrust * sellerTrustScore +
    weights.saturationInverse * saturationInverseScore;

  return Math.round(clamp(score, 0, 100));
}
