import type { ProductSnapshot } from "@kairos/shared";

// Fabrique une série de relevés à partir de quelques curseurs, pour que le
// visiteur puisse faire tourner le vrai moteur en direct au lieu de lire
// une explication.
//
// Rien n'est simulé côté verdict : `computeVerdict` reçoit exactement la
// même forme de données que sur un produit réel, et c'est lui qui décide.
// La page ne peut donc pas raconter autre chose que ce que fait le
// produit — si le moteur change, la démonstration change avec.

export interface ScenarioParams {
  /** Jours d'historique. Détermine en grande partie la phase. */
  days: number;
  /** Multiplicateur des ventes entre le premier et le dernier jour. */
  salesMultiplier: number;
  /** Boutiques concurrentes au dernier relevé. */
  competingShops: number;
  /** Créateurs actifs au dernier relevé. */
  creators: number;
  /** Baisse de prix cumulée sur la période, en pourcentage. */
  priceDropPct: number;
}

export const SCENARIO_BOUNDS = {
  days: { min: 5, max: 90, step: 1 },
  salesMultiplier: { min: 0.3, max: 4, step: 0.1 },
  competingShops: { min: 1, max: 40, step: 1 },
  creators: { min: 1, max: 60, step: 1 },
  priceDropPct: { min: 0, max: 40, step: 1 },
} as const;

/**
 * Situations typiques, pour qui veut voir le résultat sans réfléchir aux
 * curseurs. Ce sont des points de départ : tout reste modifiable ensuite.
 */
export const SCENARIO_PRESETS: Array<{
  id: string;
  label: string;
  hint: string;
  params: ScenarioParams;
}> = [
  {
    id: "pepite",
    label: "La pépite",
    hint: "Personne n'en parle encore",
    params: { days: 10, salesMultiplier: 2.6, competingShops: 2, creators: 4, priceDropPct: 0 },
  },
  {
    id: "montee",
    label: "Ça monte",
    hint: "Les premiers créateurs arrivent",
    params: { days: 30, salesMultiplier: 3, competingShops: 15, creators: 34, priceDropPct: 6 },
  },
  {
    id: "ruee",
    label: "La ruée",
    hint: "Tout le monde s'y met en même temps",
    params: { days: 20, salesMultiplier: 1.9, competingShops: 40, creators: 60, priceDropPct: 40 },
  },
  {
    id: "trop-tard",
    label: "Trop tard",
    hint: "La vague est passée",
    params: { days: 45, salesMultiplier: 0.45, competingShops: 26, creators: 30, priceDropPct: 28 },
  },
];

const BASE_PRICE_CENTS = 1690;
const BASE_SALES = 120;

function isoDaysAgo(days: number, today: Date): string {
  const d = new Date(today.getTime() - days * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/**
 * Fonction pure et déterministe — pas de bruit aléatoire. Le visiteur doit
 * pouvoir bouger un curseur et attribuer le changement de verdict à ce
 * curseur, pas se demander si le hasard s'en est mêlé.
 */
export function buildScenarioSnapshots(
  params: ScenarioParams,
  today: Date = new Date(),
): ProductSnapshot[] {
  const days = Math.max(2, Math.round(params.days));
  const snapshots: ProductSnapshot[] = [];
  let reviewCount = 80;

  for (let i = 0; i < days; i++) {
    const t = i / (days - 1);
    const sales = BASE_SALES * (1 + (params.salesMultiplier - 1) * t);
    reviewCount += Math.max(0, Math.round(sales * 0.04));

    snapshots.push({
      productId: "scenario",
      capturedDate: isoDaysAgo(days - 1 - i, today),
      priceCents: Math.round(BASE_PRICE_CENTS * (1 - (params.priceDropPct / 100) * t)),
      reviewCount,
      ratingAvg: 4.6,
      // Concurrence et créateurs partent de 1 et montent jusqu'à la valeur
      // choisie : c'est la pente qui compte pour la détection de ruée, pas
      // seulement le niveau final.
      activeCreatorCount: Math.max(1, Math.round(1 + (params.creators - 1) * t)),
      videoCount: Math.max(1, Math.round((1 + (params.creators - 1) * t) * 4)),
      competingShopCount: Math.max(1, Math.round(1 + (params.competingShops - 1) * t)),
      estSalesLow: Math.round(sales * 0.8),
      estSalesHigh: Math.round(sales * 1.2),
      confidence: 0.7,
    });
  }

  return snapshots;
}
