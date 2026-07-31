import type { VerdictLabel } from "@kairos/shared";

// Remplace le type précédemment importé de @/lib/mock/products — dérivé
// des champs d'affichage désormais embarqués dans rankings/*.items[] (voir
// apps/jobs/src/rank.ts). Pas d'`emoji` réel côté données produit : le
// composant retombe sur une icône générique quand absent.
export interface ProductRankItem {
  id: string;
  rank: number;
  title: string;
  shopName: string;
  priceCents: number;
  verdict: VerdictLabel;
  salesTrend: "up" | "down" | "flat";
  commissionRatePct: number;
  emoji?: string;
}
