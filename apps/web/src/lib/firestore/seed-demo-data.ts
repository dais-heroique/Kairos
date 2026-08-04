"use client";

import { doc, writeBatch } from "firebase/firestore";
import { firestore } from "@/lib/firebase/client";
import {
  DEMO_PRODUCTS,
  DEMO_SHOPS,
  simulateSnapshots,
} from "@/lib/demo/market-simulation";
import { UNMEASURED_SELLER_TRUST } from "./product-entry";

// Peuple un marché de démonstration : 22 produits TikTok Shop FR
// plausibles, chacun avec son historique quotidien de relevés.
//
// Ce que cette fonction n'écrit PAS, volontairement : aucun verdict,
// aucune phase, aucun score. La version précédente les écrivait en dur à
// côté de produits sans le moindre relevé — les classements affichaient
// donc des recommandations que personne n'avait calculées, indiscernables
// d'une vraie analyse. Ici on ne pose que ce qu'un collecteur observerait ;
// c'est `runPipeline()` qui en déduit ensuite les verdicts, avec le code
// de production. Les chiffres du marché sont simulés, l'analyse est réelle.
//
// Firestore plafonne un batch à 500 opérations, d'où le découpage.

const MAX_OPS_PER_BATCH = 450;

export interface SeedResult {
  shops: number;
  products: number;
  snapshots: number;
}

export async function seedDemoRankingData(): Promise<SeedResult> {
  let batch = writeBatch(firestore);
  let ops = 0;

  const flushIfNeeded = async () => {
    if (ops >= MAX_OPS_PER_BATCH) {
      await batch.commit();
      batch = writeBatch(firestore);
      ops = 0;
    }
  };

  for (const shop of DEMO_SHOPS) {
    batch.set(doc(firestore, "shops", shop.id), {
      id: shop.id,
      name: shop.name,
      market: "FR",
      trustScore: shop.trustScore,
      shipDays: shop.shipDays,
      sampleApprovalRate: shop.sampleApprovalRate,
      commissionHonorRate: shop.commissionHonorRate,
      disputeRate: shop.disputeRate,
      productCount: DEMO_PRODUCTS.filter((p) => p.shopId === shop.id).length,
      verified: shop.verified,
      isDemo: true,
    });
    ops++;
    await flushIfNeeded();
  }

  let snapshotCount = 0;

  for (const product of DEMO_PRODUCTS) {
    const shop = DEMO_SHOPS.find((s) => s.id === product.shopId)!;

    batch.set(doc(firestore, "products", product.id), {
      id: product.id,
      title: product.title,
      market: "FR",
      priceCents: product.priceCents,
      currency: "EUR",
      categoryPath: [product.category],
      shopId: product.shopId,
      isActive: true,
      emoji: product.emoji,
      commission: {
        ratePct: product.commissionRatePct,
        isOpenCollab: true,
        isTargetedOnly: false,
      },
      // La boutique simulée a de vrais indicateurs de confiance, contrairement
      // à la saisie manuelle où seul `score` est renseigné.
      sellerTrust: {
        ...UNMEASURED_SELLER_TRUST,
        score: shop.trustScore,
        shipDays: shop.shipDays,
        sampleApprovalRate: shop.sampleApprovalRate,
        commissionHonorRate: shop.commissionHonorRate,
        disputeRate: shop.disputeRate,
      },
      lastSeenAt: new Date().toISOString(),
      // Marque le produit lui-même, pas seulement le classement : un
      // produit de démo qui traînerait dans une watchlist reste
      // identifiable comme tel.
      isDemo: true,
    });
    ops++;
    await flushIfNeeded();

    for (const snap of simulateSnapshots(product)) {
      batch.set(
        doc(firestore, "products", product.id, "snapshots", snap.capturedDate),
        snap,
      );
      ops++;
      snapshotCount++;
      await flushIfNeeded();
    }
  }

  if (ops > 0) await batch.commit();

  return {
    shops: DEMO_SHOPS.length,
    products: DEMO_PRODUCTS.length,
    snapshots: snapshotCount,
  };
}
