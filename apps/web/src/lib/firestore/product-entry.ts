"use client";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  limit as fsLimit,
} from "firebase/firestore";
import type { ProductSnapshot } from "@kairos/shared";
import { firestore } from "@/lib/firebase/client";

// Saisie manuelle des produits, seule source de données à 0 € qui soit
// légale pour le marché FR : l'API Affiliate officielle est fermée à l'UE
// (voir docs/STATE.md), le scraping TikTok est bloqué par CAPTCHA et
// contraire à leurs CGU. L'utilisateur relève lui-même les chiffres dans
// son propre espace affilié TikTok Shop — son accès, ses données.
//
// Un snapshot par produit par jour : c'est exactement la forme d'entrée
// attendue par computeVerdict (packages/core), donc l'historique
// s'accumule naturellement et les verdicts deviennent réels au bout de
// quelques jours de saisie.

export interface ProductEntry {
  id: string;
  title: string;
  priceCents: number;
  commissionRatePct: number;
  shopId: string;
  shopName: string;
  category: string;
  // Confiance vendeur — relevée dans l'espace affilié (note boutique,
  // délai d'expédition). Valeurs par défaut raisonnables si inconnues.
  shopTrustScore: number;
  emoji?: string;
}

export interface SnapshotEntry {
  reviewCount: number;
  ratingAvg: number;
  activeCreatorCount: number;
  videoCount: number;
  competingShopCount: number;
  estSalesLow: number;
  estSalesHigh: number;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

// Écrit le produit et le snapshot du jour en une fois. Réécrire le même
// jour écrase le snapshot de ce jour (idempotent) plutôt que d'empiler
// des doublons qui fausseraient la détection de phase.
export async function saveProductWithSnapshot(
  product: ProductEntry,
  snapshot: SnapshotEntry,
  capturedDate: string = todayIso(),
): Promise<void> {
  await setDoc(
    doc(firestore, "products", product.id),
    {
      id: product.id,
      title: product.title,
      market: "FR",
      priceCents: product.priceCents,
      currency: "EUR",
      categoryPath: [product.category],
      shopId: product.shopId,
      isActive: true,
      emoji: product.emoji ?? null,
      commission: {
        ratePct: product.commissionRatePct,
        isOpenCollab: true,
        isTargetedOnly: false,
      },
      sellerTrust: {
        score: product.shopTrustScore,
        shipDays: 5,
        commissionHonorRate: 0.95,
        sampleApprovalRate: 0.5,
        avgSampleResponseHours: 48,
        disputeRate: 0.03,
        sampleCount: 0,
      },
      lastSeenAt: new Date().toISOString(),
    },
    { merge: true },
  );

  await setDoc(doc(firestore, "shops", product.shopId), {
    id: product.shopId,
    name: product.shopName,
    market: "FR",
    trustScore: product.shopTrustScore,
    shipDays: 5,
    sampleApprovalRate: 0.5,
    commissionHonorRate: 0.95,
    disputeRate: 0.03,
    productCount: 0,
    verified: product.shopTrustScore >= 70,
  });

  const snap: ProductSnapshot = {
    productId: product.id,
    capturedDate,
    priceCents: product.priceCents,
    reviewCount: snapshot.reviewCount,
    ratingAvg: snapshot.ratingAvg,
    activeCreatorCount: snapshot.activeCreatorCount,
    videoCount: snapshot.videoCount,
    competingShopCount: snapshot.competingShopCount,
    estSalesLow: snapshot.estSalesLow,
    estSalesHigh: snapshot.estSalesHigh,
    // Saisie manuelle depuis l'interface officielle : plus fiable qu'une
    // estimation dérivée, sans être une donnée d'API vérifiée.
    confidence: 0.6,
  };

  await setDoc(
    doc(firestore, "products", product.id, "snapshots", capturedDate),
    snap,
  );
}

export interface StoredProduct extends ProductEntry {
  snapshotCount: number;
}

export async function listStoredProducts(): Promise<StoredProduct[]> {
  const snap = await getDocs(query(collection(firestore, "products"), fsLimit(200)));
  const results: StoredProduct[] = [];

  for (const d of snap.docs) {
    const data = d.data();
    const snapshots = await getDocs(
      query(collection(firestore, "products", d.id, "snapshots"), fsLimit(100)),
    );
    const shopId = (data.shopId as string) ?? "";
    let shopName = "Boutique";
    if (shopId) {
      const shopDoc = await getDoc(doc(firestore, "shops", shopId));
      shopName = (shopDoc.data()?.name as string) ?? "Boutique";
    }
    const emoji = (data.emoji as string | null) ?? null;
    results.push({
      id: d.id,
      title: (data.title as string) ?? "",
      priceCents: (data.priceCents as number) ?? 0,
      commissionRatePct: (data.commission?.ratePct as number) ?? 0,
      shopId,
      shopName,
      category: (data.categoryPath as string[])?.[0] ?? "",
      shopTrustScore: (data.sellerTrust?.score as number) ?? 50,
      ...(emoji ? { emoji } : {}),
      snapshotCount: snapshots.size,
    });
  }
  return results;
}

// Historique complet d'un produit, trié par date croissante — c'est
// l'ordre attendu par computeVerdict.
export async function getProductSnapshots(productId: string): Promise<ProductSnapshot[]> {
  const snap = await getDocs(
    query(
      collection(firestore, "products", productId, "snapshots"),
      orderBy("capturedDate", "asc"),
    ),
  );
  return snap.docs.map((d) => d.data() as ProductSnapshot);
}
