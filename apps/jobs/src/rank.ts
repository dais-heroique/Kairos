import {
  aggregateCategories,
  aggregateShops,
  compareOpportunityOf,
  PERIOD_DAYS,
  selectNewcomers,
  type AggregableProduct,
} from "@kairos/core";
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
    soldTotal: meta?.soldTotal ?? null,
    imageUrl: meta?.imageUrl ?? null,
    // 0 signifie ici « taux inconnu » : aucun programme d'affiliation ne
    // rémunère à 0 %. NEUTRAL_COMMISSION sert justement de marqueur d'absence
    // (voir compute.ts). L'affichage doit distinguer les deux — montrer
    // « 0 % » ferait passer une donnée manquante pour une mesure.
    commissionRatePct: meta?.commission.ratePct ?? 0,
    // Barème de catégorie (estimatedCommissionFor) ou taux saisi à la
    // main : l'affichage et le calcul de gains doivent les distinguer.
    commissionIsEstimated: meta?.commission.isEstimated ?? false,
    verdict: c.verdict.verdict,
    salesTrend: TREND_BY_PHASE[c.verdict.phase],
    // Ce que le tableau de bord doit pouvoir montrer sans relire un
    // document par produit : la phase, la pression concurrentielle, la
    // fenêtre restante et surtout le *pourquoi* du verdict. C'est ce
    // raisonnement qui distingue KAIROS d'une simple liste de chiffres,
    // et il était jusqu'ici calculé puis jamais affiché.
    phase: c.verdict.phase,
    saturationScore: c.verdict.saturationScore,
    windowDaysLow: c.verdict.windowDaysRemaining.low,
    windowDaysHigh: c.verdict.windowDaysRemaining.high,
    verdictConfidence: c.verdict.windowDaysRemaining.confidence,
    reasoning: c.verdict.reasoning,
  };
}

// Les agrégations elles-mêmes vivent dans packages/core (fonctions pures,
// partagées avec le pipeline navigateur pour que les deux écrivent les
// mêmes documents). Ici, seule la conversion ProductMeta → forme commune.
function aggregable(c: ComputedProduct, meta: ProductMeta | undefined): AggregableProduct {
  return {
    id: c.productId,
    shopId: meta?.shopId ?? null,
    shopName: meta?.shopName ?? null,
    priceCents: meta?.priceCents ?? 0,
    soldTotal: meta?.soldTotal ?? null,
    // Côté collecte automatisée, la clé de regroupement est le mot-clé de
    // recherche : ce n'est PAS la taxonomie TikTok Shop, que la source
    // n'expose pas.
    groupKey: meta?.sourceQuery ?? null,
    firstSeenAt: meta?.firstSeenAt ?? null,
  };
}

function aggregablesOf(
  computed: ComputedProduct[],
  metaByProduct: Map<string, ProductMeta>,
): AggregableProduct[] {
  return computed.map((c) => aggregable(c, metaByProduct.get(c.productId)));
}

// Les 9 classements de M2. "products" (volume de ventes estimé),
// "opportunities" (score d'opportunité), "shops" et "categories" sont
// réellement calculés à partir des données produit. Les 5 autres
// (creators, videos, sounds, newcomers, waves) dépendent de signaux que la
// source produit n'expose pas — documents valides mais vides (items: []),
// à peupler une fois une source créateur/vidéo/son branchée, plutôt que de
// ne pas écrire le document du tout (l'UI doit pouvoir lire un doc
// "classement vide" sans erreur).
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

  // Ordre partagé avec le pipeline client (compareOpportunity, packages/core) :
  // opportunités jouables, puis produits pas encore jugeables, puis ceux
  // que le verdict dit d'éviter. Le rang stocké reflète donc déjà cet
  // ordre — l'UI n'a qu'à séparer visuellement les groupes.
  const byOpportunity = [...computed].sort(compareOpportunityOf).slice(0, MAX_RANKING_ITEMS);
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

  const aggregables = aggregablesOf(computed, metaByProduct);
  const newcomerIds = new Set(
    selectNewcomers(aggregables, PERIOD_DAYS[period] ?? 7, generatedAt, MAX_RANKING_ITEMS).map(
      (p) => p.id,
    ),
  );
  const derived: Partial<Record<(typeof RANKING_TYPES)[number], unknown[]>> = {
    shops: aggregateShops(aggregables, MAX_RANKING_ITEMS),
    categories: aggregateCategories(aggregables, MAX_RANKING_ITEMS),
    // Les nouveautés sont des lignes *produit*, pas des agrégats : on garde
    // l'ordre choisi par selectNewcomers et on rend chaque produit comme
    // ailleurs dans ce fichier.
    newcomers: computed
      .filter((c) => newcomerIds.has(c.productId))
      .sort(
        (a, b) =>
          (metaByProduct.get(b.productId)?.soldTotal ?? 0) -
          (metaByProduct.get(a.productId)?.soldTotal ?? 0),
      )
      .map((c, i) => buildDisplayItem(c, i + 1, metaByProduct.get(c.productId))),
  };

  for (const type of RANKING_TYPES) {
    if (type === "products" || type === "opportunities") continue;
    docs.set(rankingDocId(type, market, period, null), {
      generatedAt,
      type,
      market,
      period,
      category: null,
      items: (derived[type] ?? []) as RankingDoc["items"],
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
  // Même ordre que le classement : un feed « à la une » ne peut pas ouvrir
  // sur un produit que le verdict dit d'éviter.
  const top = [...computed].sort(compareOpportunityOf).slice(0, MAX_FEED_ITEMS);
  return {
    generatedAt,
    market,
    nicheBucket,
    date,
    items: top.map((c, i) => buildDisplayItem(c, i + 1, metaByProduct.get(c.productId))),
  };
}
