import type { Phase, ProductVideo } from "@kairos/shared";

// Analyse sélective (§ Lot 6) : un produit n'est analysé que s'il passe
// ce seuil — c'est ce qui divise la facture Gemini par 10.
const ELIGIBLE_PHASES: readonly Phase[] = ["emergence", "growth"];
const MIN_ACTIVE_CREATORS = 5;
const MIN_COMMISSION_PCT = 8;

export interface SelectionCriteria {
  phase: Phase;
  activeCreatorCount: number;
  commissionRatePct: number;
}

export function isEligibleForAnalysis(criteria: SelectionCriteria): boolean {
  return (
    ELIGIBLE_PHASES.includes(criteria.phase) &&
    criteria.activeCreatorCount >= MIN_ACTIVE_CREATORS &&
    criteria.commissionRatePct >= MIN_COMMISSION_PCT
  );
}

const MAX_VIDEOS_PER_PRODUCT = 12;

// Triées par gmvPer1kViews — jamais par vues brutes, qui favoriseraient
// des vidéos virales mais peu convertissantes.
export function selectTopVideos(
  videos: ProductVideo[],
  max: number = MAX_VIDEOS_PER_PRODUCT,
): ProductVideo[] {
  return [...videos].sort((a, b) => b.gmvPer1kViews - a.gmvPer1kViews).slice(0, max);
}
