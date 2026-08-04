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
  commissionRatePct: number;
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
  opportunityScore?: number;
  snapshotCount?: number;
}
