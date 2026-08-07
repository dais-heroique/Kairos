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

/**
 * Ce que l'appelant sait de la provenance des données qu'il passe. Le
 * score ne peut pas le deviner : `NEUTRAL_SELLER_TRUST` (apps/jobs) et
 * `UNMEASURED_SELLER_TRUST` (apps/web) ressemblent à des mesures, et un
 * verdict sans historique renvoie quand même une phase et un score de
 * saturation.
 */
export interface OpportunityBasis {
  /**
   * L'historique atteint-il `minSnapshotsAbsolute` ? En dessous,
   * `verdict.phase` et `verdict.saturationScore` sont les valeurs de repli
   * de `computeVerdict` (emergence / 50), pas des mesures.
   */
  hasMeasuredHistory: boolean;
}

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
 * Au moins un des quatre axes repose-t-il sur une donnée réelle ?
 *
 * - phase et saturation : mesurées seulement si l'historique suffit ;
 * - commission : `ratePct` à 0 est le marqueur d'absence du projet
 *   (`NEUTRAL_COMMISSION`), aucun programme d'affiliation ne rémunère à
 *   0 % — d'où « commission inconnue » et non « 0 % » à l'écran ;
 * - confiance vendeur : `sampleCount` à 0 signale un remplissage, les deux
 *   constantes de repli le posent à 0.
 *
 * Si les quatre sont absents, les quatre termes de la somme sont des
 * constantes : tous les produits obtiennent exactement le même total. Ce
 * n'est plus un classement, et le rang affiché n'est plus qu'un ordre
 * d'arrivée déguisé.
 */
export function hasOpportunityBasis(
  commission: Commission,
  sellerTrust: SellerTrust,
  basis: OpportunityBasis,
): boolean {
  return basis.hasMeasuredHistory || commission.ratePct > 0 || sellerTrust.sampleCount > 0;
}

/**
 * Classement "opportunités" (M2 #9) — phase précoce × commission élevée ×
 * vendeur fiable × faible saturation. Fonction pure.
 *
 * Renvoie `null` quand aucun des quatre axes ne repose sur une donnée
 * réelle : il n'y a alors rien à classer, et sortir un nombre reviendrait
 * à présenter une constante comme une mesure. Même choix que
 * `computeEarnings`, qui renvoie `insufficient_data` plutôt qu'un
 * « 0 €–0 € » qui se lit « ce produit ne rapporte rien ».
 */
export function computeOpportunityScore(
  verdict: ProductVerdict,
  commission: Commission,
  sellerTrust: SellerTrust,
  basis: OpportunityBasis,
  weights: OpportunityWeights = DEFAULT_OPPORTUNITY_WEIGHTS,
): number | null {
  if (!hasOpportunityBasis(commission, sellerTrust, basis)) return null;

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

/**
 * Un produit dont le verdict est « éviter » n'a rien à faire en tête d'un
 * classement d'opportunités : l'outil se contredirait à l'écran. Observé
 * en conditions réelles — 8e sur 22, avec le gain affiché le plus élevé de
 * la page.
 *
 * Il est relégué, pas retiré : le projet montre ce qu'il sait plutôt que
 * de le masquer (même choix que les produits sans historique, affichés
 * avec « historique trop court »). Passer à l'exclusion pure demanderait
 * un `filter` ici, pas une refonte.
 */
export const OPPORTUNITY_GROUPS = ["classable", "sans_base", "a_eviter"] as const;
export type OpportunityGroup = (typeof OPPORTUNITY_GROUPS)[number];

export interface RankableByOpportunity {
  opportunityScore: number | null;
  verdict: ProductVerdict["verdict"];
}

export function opportunityGroupOf(item: RankableByOpportunity): OpportunityGroup {
  if (item.verdict === "eviter") return "a_eviter";
  if (item.opportunityScore === null) return "sans_base";
  return "classable";
}

/**
 * Ordre du classement « Opportunités », par utilité décroissante pour le
 * lecteur : ce qu'il peut jouer, ce qui n'est pas encore jugeable, ce
 * qu'on lui dit d'éviter. À l'intérieur d'un groupe, score décroissant ;
 * un score absent ne vaut pas zéro et ne départage rien.
 *
 * Comparateur partagé par les deux pipelines (`apps/jobs/src/rank.ts` et
 * `apps/web/src/lib/pipeline/run-pipeline.ts`) pour que le rang stocké
 * dans `rankings/*` soit le même des deux côtés.
 */
export function compareOpportunity(a: RankableByOpportunity, b: RankableByOpportunity): number {
  const groupDelta =
    OPPORTUNITY_GROUPS.indexOf(opportunityGroupOf(a)) -
    OPPORTUNITY_GROUPS.indexOf(opportunityGroupOf(b));
  if (groupDelta !== 0) return groupDelta;
  return (b.opportunityScore ?? 0) - (a.opportunityScore ?? 0);
}

/**
 * Même ordre, pour des objets qui portent le verdict complet plutôt que
 * son seul libellé — c'est le cas des deux pipelines, qui manipulent le
 * `ProductVerdict` renvoyé par `computeVerdict`.
 */
export function compareOpportunityOf<T extends { opportunityScore: number | null; verdict: ProductVerdict }>(
  a: T,
  b: T,
): number {
  return compareOpportunity(
    { opportunityScore: a.opportunityScore, verdict: a.verdict.verdict },
    { opportunityScore: b.opportunityScore, verdict: b.verdict.verdict },
  );
}
