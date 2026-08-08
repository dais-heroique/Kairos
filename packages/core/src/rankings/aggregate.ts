// Agrégations de classement — dérivées des produits déjà collectés, sans
// aucune source supplémentaire : la source produit expose le vendeur et le
// mot-clé qui a fait remonter chaque article, donc regrouper est du calcul,
// pas de la collecte.
//
// Elles vivaient dans `apps/jobs/src/rank.ts`, c'est-à-dire dans le pipeline
// serveur — celui qui ne tourne pas. Le pipeline réellement utilisé est le
// pipeline navigateur (`apps/web/src/lib/pipeline/run-pipeline.ts`, décision
// #9), et il n'écrivait que 2 des 9 documents de classement : Boutiques,
// Catégories et Nouveautés restaient donc vides en affichant « le pipeline
// n'a pas encore tourné », alors qu'il avait tourné et que les données
// nécessaires étaient là. Fonctions pures, partagées par les deux pipelines
// pour qu'ils ne puissent plus diverger.

export const MAX_RANKING_ITEMS = 100;

/** Le minimum dont les agrégations ont besoin, quelle que soit la source. */
export interface AggregableProduct {
  id: string;
  shopId: string | null;
  shopName: string | null;
  priceCents: number;
  /** Unités vendues (cumul annoncé par la plateforme), si connu. */
  soldTotal: number | null;
  /**
   * Clé de regroupement du classement « Catégories » : le mot-clé de
   * collecte (source Apify) ou, à défaut, la catégorie déclarée à la
   * saisie. ⚠️ Ce n'est dans aucun des deux cas la taxonomie officielle
   * TikTok Shop — la source ne l'expose pas.
   */
  groupKey: string | null;
  /** ISO 8601 — première fois que KAIROS a vu ce produit. */
  firstSeenAt: string | null;
}

export interface AggregatedRankItem {
  id: string;
  rank: number;
  title: string;
  productCount: number;
  soldTotal: number;
  priceCents: number;
  shopId?: string;
}

interface Bucket {
  title: string | null;
  productCount: number;
  totalSold: number;
  priceSum: number;
}

function bucketise(
  products: AggregableProduct[],
  keyOf: (p: AggregableProduct) => string | null,
  titleOf: (p: AggregableProduct) => string | null,
): Map<string, Bucket> {
  const buckets = new Map<string, Bucket>();
  for (const product of products) {
    const key = keyOf(product);
    if (!key) continue;
    const bucket = buckets.get(key) ?? {
      title: titleOf(product),
      productCount: 0,
      totalSold: 0,
      priceSum: 0,
    };
    bucket.productCount += 1;
    bucket.totalSold += product.soldTotal ?? 0;
    bucket.priceSum += product.priceCents;
    bucket.title ??= titleOf(product);
    buckets.set(key, bucket);
  }
  return buckets;
}

// Le tri retombe sur le nombre de produits quand les ventes sont inconnues
// (`soldTotal` absent → 0 pour tout le monde). Une absence partagée ne doit
// pas figer l'ordre sur rien : le nombre de produits, lui, est mesuré.
function rankBuckets(
  buckets: Map<string, Bucket>,
  fallbackTitle: string,
  maxItems: number,
): AggregatedRankItem[] {
  return [...buckets.entries()]
    .sort((a, b) => b[1].totalSold - a[1].totalSold || b[1].productCount - a[1].productCount)
    .slice(0, maxItems)
    .map(([id, bucket], i) => ({
      id,
      rank: i + 1,
      title: bucket.title ?? fallbackTitle,
      productCount: bucket.productCount,
      soldTotal: bucket.totalSold,
      // Prix moyen du catalogue observé — pas le panier moyen réel, qui
      // demanderait des volumes par SKU dont on ne dispose pas.
      priceCents: Math.round(bucket.priceSum / bucket.productCount),
    }));
}

export function aggregateShops(
  products: AggregableProduct[],
  maxItems: number = MAX_RANKING_ITEMS,
): AggregatedRankItem[] {
  const buckets = bucketise(
    products,
    (p) => p.shopId,
    (p) => p.shopName,
  );
  return rankBuckets(buckets, "Boutique", maxItems).map((item) => ({
    ...item,
    shopId: item.id,
  }));
}

export function aggregateCategories(
  products: AggregableProduct[],
  maxItems: number = MAX_RANKING_ITEMS,
): AggregatedRankItem[] {
  const buckets = bucketise(
    products,
    (p) => p.groupKey,
    (p) => p.groupKey,
  );
  return rankBuckets(buckets, "Sans catégorie", maxItems);
}

export const PERIOD_DAYS: Record<string, number> = { "24h": 1, "7d": 7, "30d": 30 };

/**
 * Nouveautés — produits dont la première apparition tombe dans la fenêtre
 * de la période, les plus vendus d'abord : une nouveauté qui part fort est
 * le signal utile, pas simplement la plus récente.
 *
 * ⚠️ À la toute première collecte, tout est neuf : ce classement duplique
 * alors « Produits ». Il ne devient discriminant qu'à partir de la
 * deuxième, quand une partie du catalogue est déjà connue.
 *
 * Renvoie les produits retenus dans l'ordre — chaque pipeline construit
 * ensuite ses propres lignes d'affichage, qui n'ont pas la même forme.
 */
export function selectNewcomers<T extends AggregableProduct>(
  products: T[],
  periodDays: number,
  generatedAt: string,
  maxItems: number = MAX_RANKING_ITEMS,
): T[] {
  const cutoff = Date.parse(generatedAt) - periodDays * 24 * 60 * 60 * 1000;

  return products
    .filter((p) => {
      if (!p.firstSeenAt) return false;
      const seen = Date.parse(p.firstSeenAt);
      return Number.isFinite(seen) && seen >= cutoff;
    })
    .sort((a, b) => (b.soldTotal ?? 0) - (a.soldTotal ?? 0))
    .slice(0, maxItems);
}
