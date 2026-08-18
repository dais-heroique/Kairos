import type { Firestore } from "firebase-admin/firestore";
import { resolveCommission, type Commission, type Market, type SellerTrust } from "@kairos/shared";
import { NEUTRAL_COMMISSION, NEUTRAL_SELLER_TRUST } from "./compute.js";

// Métadonnées lues depuis le document produit existant (title/priceCents/
// shopId servent à peupler les champs d'affichage des items de classement
// — voir rank.ts — pour que les pages de classement n'aient besoin que
// d'une lecture du document rankings/*, jamais d'une lecture par produit).
export interface ProductMeta {
  title: string;
  priceCents: number;
  shopId: string | null;
  shopName: string | null;
  /** Unités vendues (cumul annoncé par la plateforme), si connu. */
  soldTotal: number | null;
  /** Mot-clé de recherche qui a fait remonter ce produit, si collecté. */
  sourceQuery: string | null;
  /** ISO 8601 — première fois que KAIROS a vu ce produit. */
  firstSeenAt: string | null;
  /** Visuel produit fourni par la source, si collecté. */
  imageUrl: string | null;
  /** Marché effectivement couvert par la source de collecte. */
  sourceMarket: Market | null;
  commission: Commission;
  sellerTrust: SellerTrust;
}

const NEUTRAL_META: Omit<ProductMeta, "commission" | "sellerTrust"> = {
  title: "",
  priceCents: 0,
  shopId: null,
  shopName: null,
  soldTotal: null,
  sourceQuery: null,
  firstSeenAt: null,
  imageUrl: null,
  sourceMarket: null,
};

// db.getAll() = une seule RPC batchée pour tous les produits, jamais un
// get() par produit — c'est un job serveur, pas une page apps/web, donc
// pas soumis à la contrainte "≤5 lectures" (qui vise le coût par
// chargement de page côté utilisateur), mais l'idée reste la même :
// éviter le N+1.
export async function readProductMeta(
  db: Firestore,
  productIds: string[],
): Promise<Map<string, ProductMeta>> {
  const result = new Map<string, ProductMeta>();
  if (productIds.length === 0) return result;

  const refs = productIds.map((id) => db.collection("products").doc(id));
  const snaps = await db.getAll(...refs);

  snaps.forEach((snap, i) => {
    const productId = productIds[i]!;
    const data = snap.data();
    result.set(productId, {
      title: (data?.title as string | undefined) ?? NEUTRAL_META.title,
      priceCents: (data?.priceCents as number | undefined) ?? NEUTRAL_META.priceCents,
      shopId: (data?.shopId as string | undefined) ?? NEUTRAL_META.shopId,
      shopName: (data?.shopName as string | undefined) ?? NEUTRAL_META.shopName,
      soldTotal: (data?.soldTotal as number | undefined) ?? NEUTRAL_META.soldTotal,
      sourceQuery: (data?.sourceQuery as string | undefined) ?? NEUTRAL_META.sourceQuery,
      firstSeenAt: (data?.firstSeenAt as string | undefined) ?? NEUTRAL_META.firstSeenAt,
      imageUrl: (data?.imageUrl as string | undefined) ?? NEUTRAL_META.imageUrl,
      sourceMarket: (data?.sourceMarket as Market | undefined) ?? NEUTRAL_META.sourceMarket,
      // Le barème de catégorie s'applique ici plutôt qu'à la collecte :
      // les produits déjà en base ont un `ratePct: 0` que seule une
      // recollecte corrigerait. Un taux réellement renseigné est conservé.
      commission: resolveCommission(
        data?.commission as Commission | undefined,
        (data?.title as string | undefined) ?? "",
        data?.sourceQuery as string | undefined,
      ),
      sellerTrust: (data?.sellerTrust as SellerTrust | undefined) ?? NEUTRAL_SELLER_TRUST,
    });
  });

  return result;
}
