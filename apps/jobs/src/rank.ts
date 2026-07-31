import { RANKING_TYPES } from "@kairos/shared";
import type {
  FeedDoc,
  Market,
  Phase,
  ProductRanks,
  RankingDoc,
  RankingPeriod,
} from "@kairos/shared";
import type { ComputedProduct } from "./compute.js";
import type { ProductMeta } from "./product-meta.js";

const MAX_RANKING_ITEMS = 100;
const MAX_FEED_ITEMS = 40;
// Segment d'ID utilisé quand un classement n'est pas découpé par
// catégorie — le champ `category` du document reste `null`.
const NO_CATEGORY_SEGMENT = "all";

export function rankingDocId(
  type: string,
  market: Market,
  period: RankingPeriod,
  category: string | null,
): string {
  return `${type}_${market}_${period}_${category ?? NO_CATEGORY_SEGMENT}`;
}

export interface RankingBuildResult {
  docs: Map<string, RankingDoc>;
  productRanks: Map<string, ProductRanks>;
}

const TREND_BY_PHASE: Record<Phase, "up" | "down" | "flat"> = {
  emergence: "up",
  growth: "up",
  late_growth: "flat",
  maturity: "flat",
  decline: "down",
};

// items[] est un payload minimal mais doit rester auto-suffisant pour
// l'affichage en liste (§ Lot 4 : les pages de classement ne doivent lire
// que le document rankings/*, jamais un produit par ligne) — d'où
// l'inclusion de ces quelques champs d'affichage plutôt que juste id+rank.
function buildDisplayItem(
  c: ComputedProduct,
  rank: number,
  meta: ProductMeta | undefined,
): { id: string; rank: number } & Record<string, unknown> {
  return {
    id: c.productId,
    rank,
    title: meta?.title ?? "",
    priceCents: meta?.priceCents ?? 0,
    shopId: meta?.shopId ?? null,
    commissionRatePct: meta?.commission.ratePct ?? 0,
    verdict: c.verdict.verdict,
    salesTrend: TREND_BY_PHASE[c.verdict.phase],
  };
}

// Les 9 classements de M2. "products" (volume de ventes estimé) et
// "opportunities" (score d'opportunité) sont réellement calculés à partir
// des données produit. Les 7 autres (shops, creators, videos, sounds,
// categories, newcomers, waves) dépendent d'agrégations boutique/
// créateur/vidéo/son qui n'existent pas encore dans ce lot — documents
// valides mais vides (items: []), à peupler par un futur lot une fois ces
// agrégations construites, plutôt que de ne pas écrire le document du tout
// (l'UI doit pouvoir lire un doc "classement vide" sans erreur).
export function buildRankings(
  computed: ComputedProduct[],
  market: Market,
  period: RankingPeriod,
  metaByProduct: Map<string, ProductMeta> = new Map(),
  generatedAt: string = new Date().toISOString(),
): RankingBuildResult {
  const docs = new Map<string, RankingDoc>();
  const productRanks = new Map<string, ProductRanks>();

  const byVolume = [...computed]
    .sort((a, b) => b.estimates.salesHigh - a.estimates.salesHigh)
    .slice(0, MAX_RANKING_ITEMS);
  docs.set(rankingDocId("products", market, period, null), {
    generatedAt,
    type: "products",
    market,
    period,
    category: null,
    items: byVolume.map((c, i) => buildDisplayItem(c, i + 1, metaByProduct.get(c.productId))),
  });

  const byOpportunity = [...computed]
    .sort((a, b) => b.opportunityScore - a.opportunityScore)
    .slice(0, MAX_RANKING_ITEMS);
  docs.set(rankingDocId("opportunities", market, period, null), {
    generatedAt,
    type: "opportunities",
    market,
    period,
    category: null,
    items: byOpportunity.map((c, i) => ({
      ...buildDisplayItem(c, i + 1, metaByProduct.get(c.productId)),
      opportunityScore: c.opportunityScore,
    })),
  });

  // Le champ products/{id}.ranks (sales7d/opportunity) n'a de sens que
  // pour une seule période canonique — 7 jours, cohérent avec les autres
  // champs "…7d" du schéma. growth7d et category restent non renseignés
  // ici : pas de classement de croissance ni de découpage par catégorie
  // dans ce lot (voir commentaire ci-dessus).
  if (period === "7d") {
    byVolume.forEach((c, i) => {
      productRanks.set(c.productId, { ...productRanks.get(c.productId), sales7d: i + 1 });
    });
    byOpportunity.forEach((c, i) => {
      productRanks.set(c.productId, { ...productRanks.get(c.productId), opportunity: i + 1 });
    });
  }

  for (const type of RANKING_TYPES) {
    if (type === "products" || type === "opportunities") continue;
    docs.set(rankingDocId(type, market, period, null), {
      generatedAt,
      type,
      market,
      period,
      category: null,
      items: [],
    });
  }

  return { docs, productRanks };
}

// Feed = extrait "à la une" par marché/niche/jour, ≤40 items. Aucune
// taxonomie de niches n'est encore exposée par packages/shared (voir
// docs/STATE.md) — génère un feed "toutes niches" par marché en
// attendant ; extensible par niche une fois la taxonomie réelle branchée.
export function buildFeed(
  computed: ComputedProduct[],
  market: Market,
  nicheBucket: string,
  date: string,
  metaByProduct: Map<string, ProductMeta> = new Map(),
  generatedAt: string = new Date().toISOString(),
): FeedDoc {
  const top = [...computed]
    .sort((a, b) => b.opportunityScore - a.opportunityScore)
    .slice(0, MAX_FEED_ITEMS);
  return {
    generatedAt,
    market,
    nicheBucket,
    date,
    items: top.map((c, i) => buildDisplayItem(c, i + 1, metaByProduct.get(c.productId))),
  };
}
