import type { Product, Shop } from "@kairos/shared";
import { getAdminFirestore } from "../firebase-admin";
import type { ReadCounter } from "./read-counter";

export interface ProductDetailData {
  product: Product | null;
  shop: Shop | null;
}

// 2 opérations Firestore : 1 lecture produit, 1 lecture boutique (get()
// direct par ID, pas de requête) — voir firestore-read-count.test.ts.
export async function getProductDetail(
  productId: string,
  counter?: ReadCounter,
): Promise<ProductDetailData> {
  const db = getAdminFirestore();
  const productSnap = await db.collection("products").doc(productId).get();
  counter?.increment();
  if (!productSnap.exists) return { product: null, shop: null };

  const product = { id: productSnap.id, ...productSnap.data() } as Product;

  let shop: Shop | null = null;
  if (product.shopId) {
    const shopSnap = await db.collection("shops").doc(product.shopId).get();
    counter?.increment();
    if (shopSnap.exists) shop = { id: shopSnap.id, ...shopSnap.data() } as Shop;
  }

  return { product, shop };
}

export async function getShopDetail(shopId: string, counter?: ReadCounter): Promise<Shop | null> {
  const db = getAdminFirestore();
  const snap = await db.collection("shops").doc(shopId).get();
  counter?.increment();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() } as Shop;
}
