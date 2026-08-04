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

// Score attribué quand la phase n'est pas connue. Volontairement neutre
// (le niveau de "maturity") : ni récompense ni punition.
//
// Pourquoi c'est nécessaire : quand l'historique est insuffisant,
// `computeVerdict` renvoie un verdict prudent ("risque") mais doit bien
// renvoyer *une* phase, et c'est "emergence" — qui vaut 100, le maximum.
// Un produit saisi la veille, sur lequel personne n'a rien pu analyser,
// se retrouvait donc mieux noté qu'un produit réellement étudié. Observé
// en conditions réelles : un produit à 2 relevés sortait 7e sur 22 du
// classement « Opportunités », au-dessus de produits en croissance
// confirmée. Le verdict disait « risque », le classement disait
// « opportunité » — les deux ne pouvaient pas avoir raison.
const UNKNOWN_PHASE_SCORE = 25;

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
  // La phase ne compte que dans la mesure où les données la soutiennent :
  // on interpole entre "phase inconnue" et la note pleine de la phase,
  // proportionnellement à la confiance du verdict. Aucun seuil arbitraire,
  // et la propriété qui compte est garantie — sans historique, aucune
  // phase ne peut rapporter de points.
  const phaseConfidence = clamp(verdict.windowDaysRemaining.confidence, 0, 1);
  const phaseScore =
    UNKNOWN_PHASE_SCORE + (PHASE_SCORE[verdict.phase] - UNKNOWN_PHASE_SCORE) * phaseConfidence;
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
