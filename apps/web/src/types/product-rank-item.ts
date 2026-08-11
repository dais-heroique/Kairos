import type { Phase, VerdictLabel } from "@kairos/shared";

// Remplace le type précédemment importé de @/lib/mock/products — dérivé
// des champs d'affichage désormais embarqués dans rankings/*.items[] (voir
// apps/jobs/src/rank.ts). Pas d'`emoji` réel côté données produit : le
// composant retombe sur une icône générique quand absent.
export interface ProductRankItem {
  id: string;
  rank: number;
  title: string;
  shopName: string;
  shopId?: string;
  priceCents: number;
  verdict: VerdictLabel;
  salesTrend: "up" | "down" | "flat";
  /** 0 = taux inconnu, pas un taux nul — voir apps/jobs/src/rank.ts. */
  commissionRatePct: number;
  /**
   * Le taux vient-il du barème de catégorie plutôt que du produit ?
   * Optionnel : les documents écrits avant ce champ restent lisibles, et
   * son absence signifie « taux relevé », qui est le cas le moins
   * dégradé — on ne présume pas d'une estimation là où il n'y en a pas.
   */
  commissionIsEstimated?: boolean;
  // Optionnels : tous les producteurs d'items ne les fournissent pas (le
  // tableau de bord construit ses propres lignes), et la carte retombe sur
  // une icône quand le visuel manque.
  /** Unités vendues annoncées par la plateforme ; absent si non collecté. */
  soldTotal?: number | null;
  /** Visuel produit ; absent si non collecté. */
  imageUrl?: string | null;
  emoji?: string;
  category?: string;

  // Champs d'analyse dénormalisés dans rankings/*.items[] par le pipeline.
  // Optionnels : un document écrit avant leur ajout reste lisible, l'UI
  // masque simplement les blocs correspondants au lieu d'inventer.
  phase?: Phase;
  saturationScore?: number;
  windowDaysLow?: number;
  windowDaysHigh?: number;
  verdictConfidence?: number;
  /** Pourquoi ce verdict — la vraie valeur ajoutée, longtemps jamais affichée. */
  reasoning?: string[];
  /**
   * Absent quand aucun des quatre axes du score n'est mesuré : le produit
   * n'est pas classable en opportunité, et ne reçoit donc pas de note.
   * Voir `computeOpportunityScore` (packages/core).
   */
  opportunityScore?: number;
  snapshotCount?: number;
}
