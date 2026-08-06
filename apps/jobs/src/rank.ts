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

// Agrégation boutique — dérivée des produits déjà collectés, sans source
// supplémentaire : la source produit expose le vendeur de chaque article
// (sellerId + shopName), donc regrouper est du calcul, pas de la collecte.
function buildShopItems(
  computed: ComputedProduct[],
  metaByProduct: Map<string, ProductMeta>,
): Array<{ id: string; rank: number } & Record<string, unknown>> {
  const byShop = new Map<
    string,
    { shopName: string | null; productCount: number; totalSold: number; priceSum: number }
  >();

  for (const c of computed) {
    const meta = metaByProduct.get(c.productId);
    if (!meta?.shopId) continue;
    const agg = byShop.get(meta.shopId) ?? {
      shopName: meta.shopName,
      productCount: 0,
      totalSold: 0,
      priceSum: 0,
    };
    agg.productCount += 1;
    agg.totalSold += meta.soldTotal ?? 0;
    agg.priceSum += meta.priceCents;
    agg.shopName ??= meta.shopName;
    byShop.set(meta.shopId, agg);
  }

  return [...byShop.entries()]
    .sort((a, b) => b[1].totalSold - a[1].totalSold || b[1].productCount - a[1].productCount)
    .slice(0, MAX_RANKING_ITEMS)
    .map(([shopId, agg], i) => ({
      id: shopId,
      rank: i + 1,
      title: agg.shopName ?? "Boutique",
      shopId,
      productCount: agg.productCount,
      soldTotal: agg.totalSold,
      // Prix moyen du catalogue observé — pas le panier moyen réel, qui
      // demanderait des volumes par SKU dont on ne dispose pas.
      priceCents: Math.round(agg.priceSum / agg.productCount),
    }));
}

// Agrégation par mot-clé de recherche. ⚠️ Ce n'est PAS la taxonomie de
// catégories TikTok Shop : la source ne l'expose pas. Ce sont les requêtes
// qui ont servi à la collecte (products.config.ts / products-strategy.ts).
// Le libellé côté UI doit le dire, sinon l'utilisateur lira un classement
// de catégories officielles là où il n'y a que nos propres mots-clés.
function buildKeywordItems(
  computed: ComputedProduct[],
  metaByProduct: Map<string, ProductMeta>,
): Array<{ id: string; rank: number } & Record<string, unknown>> {
  const byQuery = new Map<string, { productCount: number; totalSold: number; priceSum: number }>();

  for (const c of computed) {
    const meta = metaByProduct.get(c.productId);
    if (!meta?.sourceQuery) continue;
    const agg = byQuery.get(meta.sourceQuery) ?? { productCount: 0, totalSold: 0, priceSum: 0 };
    agg.productCount += 1;
    agg.totalSold += meta.soldTotal ?? 0;
    agg.priceSum += meta.priceCents;
    byQuery.set(meta.sourceQuery, agg);
  }

  return [...byQuery.entries()]
    .sort((a, b) => b[1].totalSold - a[1].totalSold)
    .slice(0, MAX_RANKING_ITEMS)
    .map(([query, agg], i) => ({
      id: query,
      rank: i + 1,
      title: query,
      productCount: agg.productCount,
      soldTotal: agg.totalSold,
      priceCents: Math.round(agg.priceSum / agg.productCount),
    }));
}

const PERIOD_DAYS: Record<RankingPeriod, number> = { "24h": 1, "7d": 7, "30d": 30 };

// Nouveautés — produits dont la première apparition tombe dans la fenêtre de
// la période. Dérivé de products/{id}.firstSeenAt, posé une seule fois à
// l'insertion (voir recover-apify-data.ts). Aucune source supplémentaire.
//
// ⚠️ À la toute première collecte, tout est neuf : ce classement duplique
// alors "Produits". Il ne devient discriminant qu'à partir de la deuxième
// collecte, quand une partie du catalogue est déjà connue.
function buildNewcomerItems(
  computed: ComputedProduct[],
  metaByProduct: Map<string, ProductMeta>,
  period: RankingPeriod,
  generatedAt: string,
): Array<{ id: string; rank: number } & Record<string, unknown>> {
  const cutoff = Date.parse(generatedAt) - PERIOD_DAYS[period] * 24 * 60 * 60 * 1000;

  return computed
    .filter((c) => {
      const seen = metaByProduct.get(c.productId)?.firstSeenAt;
      if (!seen) return false;
      const t = Date.parse(seen);
      return Number.isFinite(t) && t >= cutoff;
    })
    // Le plus vendu d'abord : une nouveauté qui part fort est le signal
    // utile, pas simplement la plus récente.
    .sort(
      (a, b) =>
        (metaByProduct.get(b.productId)?.soldTotal ?? 0) -
        (metaByProduct.get(a.productId)?.soldTotal ?? 0),
    )
    .slice(0, MAX_RANKING_ITEMS)
    .map((c, i) => buildDisplayItem(c, i + 1, metaByProduct.get(c.productId)));
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

  const derived: Partial<Record<(typeof RANKING_TYPES)[number], unknown[]>> = {
    shops: buildShopItems(computed, metaByProduct),
    categories: buildKeywordItems(computed, metaByProduct),
    newcomers: buildNewcomerItems(computed, metaByProduct, period, generatedAt),
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
