import type { ProductSnapshot } from "@kairos/shared";
import type { CollectorSource } from "./types.js";

// ⚠️ NEEDS VALIDATION AGAINST LIVE SITE — implémentation de référence
// écrite sans accès réseau à tiktok.com depuis cet environnement (pas de
// proxy, pas d'egress vers des sites consommateurs dans ce sandbox).
// L'URL et la forme de la réponse ci-dessous sont des HYPOTHÈSES à
// vérifier/corriger contre le vrai endpoint avant tout déploiement. Ne
// jamais déployer tel quel sans validation manuelle contre le site réel.
//
// Appel direct d'endpoints JSON (pas de rendu de page) — source à
// privilégier sur tiktok-web.ts, c'est le facteur 5 sur la facture proxy.

export interface TiktokApiRawProduct {
  id: string;
  price: number; // supposé en centimes — à confirmer
  review_count: number;
  rating: number;
  creator_count: number;
  video_count: number;
  seller_count: number;
  sales_estimate_low: number;
  sales_estimate_high: number;
}

export function parseTiktokApiProduct(
  raw: TiktokApiRawProduct,
  capturedDate: string,
): ProductSnapshot {
  return {
    productId: raw.id,
    capturedDate,
    priceCents: Math.round(raw.price),
    reviewCount: raw.review_count,
    ratingAvg: raw.rating,
    activeCreatorCount: raw.creator_count,
    videoCount: raw.video_count,
    competingShopCount: raw.seller_count,
    estSalesLow: raw.sales_estimate_low,
    estSalesHigh: raw.sales_estimate_high,
    // Pas de signal de confiance natif dans cette hypothèse de réponse —
    // valeur médiane par défaut, à remplacer si le vrai endpoint expose
    // un indicateur de fiabilité.
    confidence: 0.5,
  };
}

export async function fetchTiktokApiRawProduct(
  productExternalId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<TiktokApiRawProduct> {
  // TODO(validation): endpoint hypothétique.
  const res = await fetchImpl(
    `https://shop.tiktok.com/api/v1/products/${encodeURIComponent(productExternalId)}`,
  );
  if (!res.ok) throw new Error(`tiktok-api fetch failed: ${res.status}`);
  return (await res.json()) as TiktokApiRawProduct;
}

export const tiktokApiSource: CollectorSource = {
  name: "tiktok-api",
  async fetchProductSnapshot(productExternalId: string): Promise<ProductSnapshot> {
    const raw = await fetchTiktokApiRawProduct(productExternalId);
    return parseTiktokApiProduct(raw, new Date().toISOString().slice(0, 10));
  },
};
