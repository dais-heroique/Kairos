import type { Firestore } from "firebase-admin/firestore";
import type { Commission, SellerTrust } from "@kairos/shared";
import { NEUTRAL_COMMISSION, NEUTRAL_SELLER_TRUST } from "./compute.js";

// Métadonnées lues depuis le document produit existant (title/priceCents/
// shopId servent à peupler les champs d'affichage des items de classement
// — voir rank.ts — pour que les pages de classement n'aient besoin que
// d'une lecture du document rankings/*, jamais d'une lecture par produit).
export interface ProductMeta {
  title: string;
  priceCents: number;
  shopId: string | null;
  commission: Commission;
  sellerTrust: SellerTrust;
}

const NEUTRAL_META: Omit<ProductMeta, "commission" | "sellerTrust"> = {
  title: "",
  priceCents: 0,
  shopId: null,
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
      commission: (data?.commission as Commission | undefined) ?? NEUTRAL_COMMISSION,
      sellerTrust: (data?.sellerTrust as SellerTrust | undefined) ?? NEUTRAL_SELLER_TRUST,
    });
  });

  return result;
}
