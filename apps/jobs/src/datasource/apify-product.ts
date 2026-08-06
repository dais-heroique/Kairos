import type { ProductSnapshot } from "@kairos/shared";

/**
 * Forme réelle d'un item renvoyé par l'actor TikTok Shop Search Pro
 * (`Hr1hjEAGdYMr1RbUj`), constatée sur des runs réels le 2026-08-02.
 *
 * ⚠️ Elle ne correspond PAS à la documentation publique de l'actor, qui
 * annonce des champs en snake_case (`product_id`, `product_name`,
 * `avg_price`, `product_rating`, `review_count`, `discount_pct`). L'actor
 * renvoie en fait du camelCase, et expose des champs non documentés bien
 * plus utiles — `sold` notamment. Se fier à la doc fait rejeter 100 % des
 * produits. Toute évolution de ce type doit être vérifiée contre un vrai
 * dataset, pas contre la doc.
 */
export interface ApifyRawProduct {
  productId?: string;
  name?: string;
  amount?: number; // prix courant, en devise de searchRegion (USD)
  originalPrice?: number;
  rating?: number;
  reviews?: string | number; // chaîne dans les datasets observés
  sold?: number; // unités vendues, cumulé depuis la mise en ligne
  discountDecimal?: number; // 0.3 = 30 % de remise (acheteur, pas commission)
  shopName?: string;
  sellerId?: string;
  image?: string;
  productUrl?: string;
  rank?: number;
  query?: string;
  currencyName?: string;
}

/** `reviews` arrive en chaîne ("6096") — parser plutôt que caster. */
function toCount(value: string | number | undefined): number {
  if (typeof value === "number") return Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
  if (typeof value !== "string") return 0;
  const parsed = Number.parseInt(value.replace(/[^\d]/g, ""), 10);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

export interface ParseOptions {
  capturedDate: string;
  /** Taux de change appliqué au prix (l'actor ne sert que le marché US). */
  usdToEur: number;
  /** Identifiant Firestore à utiliser ; par défaut `productId` assaini. */
  productId?: string;
}

export function sanitizeDocId(raw: string): string {
  // Firestore refuse "/" et les identifiants trop longs.
  return raw.replace(/[^\w.-]/g, "-").slice(0, 120);
}

/** Renvoie null si l'item n'a pas le minimum exploitable (id, titre, prix). */
export function parseApifyProduct(
  raw: ApifyRawProduct,
  opts: ParseOptions,
): { snapshot: ProductSnapshot; meta: ApifyProductMeta } | null {
  const externalId = raw.productId?.trim();
  const title = raw.name?.trim();
  if (!externalId || !title) return null;
  if (typeof raw.amount !== "number" || !(raw.amount > 0)) return null;

  const productId = opts.productId ?? sanitizeDocId(externalId);
  const reviewCount = toCount(raw.reviews);
  const rating = typeof raw.rating === "number" ? Math.min(Math.max(raw.rating, 0), 5) : 0;

  // `sold` est un cumul exact, pas une fourchette : low et high reçoivent la
  // même valeur, ce qui dit « pas d'incertitude sur ce nombre ». Le moteur
  // compare les snapshots entre jours (compute-verdict.ts), donc la
  // différence d'un jour à l'autre redonne les ventes de la journée. Avec un
  // seul relevé, l'historique est jugé insuffisant de toute façon.
  const sold = typeof raw.sold === "number" && Number.isFinite(raw.sold) ? Math.max(0, raw.sold) : 0;

  const snapshot: ProductSnapshot = {
    productId,
    capturedDate: opts.capturedDate,
    priceCents: Math.round(raw.amount * opts.usdToEur * 100),
    reviewCount,
    ratingAvg: rating,
    // Non fournis par cet actor — zéro signifie ici « donnée absente », pas
    // « mesuré à zéro ». Aucun de ces champs n'est estimé.
    activeCreatorCount: 0,
    videoCount: 0,
    competingShopCount: 0,
    estSalesLow: sold,
    estSalesHigh: sold,
    confidence: rating > 0 && reviewCount > 0 ? 0.6 : 0.3,
  };

  return {
    snapshot,
    meta: {
      externalId,
      title,
      priceCents: snapshot.priceCents,
      shopId: raw.sellerId ? sanitizeDocId(raw.sellerId) : null,
      shopName: raw.shopName?.trim() ?? null,
      sourceQuery: raw.query?.trim() ?? null,
      imageUrl: raw.image ?? null,
      productUrl: raw.productUrl ?? null,
      sold,
      rating,
      reviewCount,
    },
  };
}

export interface ApifyProductMeta {
  externalId: string;
  title: string;
  priceCents: number;
  shopId: string | null;
  shopName: string | null;
  sourceQuery: string | null;
  imageUrl: string | null;
  productUrl: string | null;
  sold: number;
  rating: number;
  reviewCount: number;
}
