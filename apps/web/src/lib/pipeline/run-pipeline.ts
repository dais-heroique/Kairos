"use client";

import { doc, setDoc } from "firebase/firestore";
import {
  computeOpportunityScore,
  computeVerdict,
  hasInsufficientHistory,
} from "@kairos/core";
import type { Commission, ProductVerdict, SellerTrust } from "@kairos/shared";
import { firestore } from "@/lib/firebase/client";
import {
  getProductSnapshots,
  listStoredProducts,
  UNMEASURED_SELLER_TRUST,
  type StoredProduct,
} from "@/lib/firestore/product-entry";

// Le pipeline quotidien (apps/jobs) tourne normalement sur Cloud Run à
// partir de BigQuery. Tant qu'aucune infra payante n'est branchée, la
// même chaîne tourne ici côté client, déclenchée à la main depuis /admin :
// lecture des snapshots Firestore → vrais moteurs packages/core →
// écriture des documents rankings/*. Mêmes fonctions pures, mêmes
// résultats — seule la source des snapshots change (saisie manuelle au
// lieu de la collecte automatisée).

const TREND_BY_PHASE: Record<ProductVerdict["phase"], "up" | "down" | "flat"> = {
  emergence: "up",
  growth: "up",
  late_growth: "flat",
  maturity: "flat",
  decline: "down",
};

export interface PipelineResult {
  productsProcessed: number;
  productsRanked: number;
  /** Produits sans aucun snapshot — absents des classements. */
  productsSkippedNoHistory: number;
  /** Produits classés mais dont le verdict reste prudent faute d'historique. */
  productsNeedingMoreHistory: number;
  generatedAt: string;
}

interface ScoredProduct {
  product: StoredProduct;
  verdict: ProductVerdict;
  opportunityScore: number;
  estSales: number;
}

function commissionOf(product: StoredProduct): Commission {
  return {
    ratePct: product.commissionRatePct,
    isOpenCollab: true,
    isTargetedOnly: false,
  };
}

function sellerTrustOf(product: StoredProduct): SellerTrust {
  // Seul `score` vient de la saisie ; le reste est du remplissage assumé
  // et partagé avec product-entry.ts (voir le commentaire sur
  // UNMEASURED_SELLER_TRUST).
  return {
    score: product.shopTrustScore,
    ...UNMEASURED_SELLER_TRUST,
  };
}

function rankingItem(scored: ScoredProduct, rank: number) {
  return {
    id: scored.product.id,
    rank,
    title: scored.product.title,
    priceCents: scored.product.priceCents,
    shopId: scored.product.shopId,
    commissionRatePct: scored.product.commissionRatePct,
    verdict: scored.verdict.verdict,
    salesTrend: TREND_BY_PHASE[scored.verdict.phase],
    emoji: scored.product.emoji ?? null,
  };
}

export async function runPipeline(): Promise<PipelineResult> {
  const generatedAt = new Date().toISOString();
  const products = await listStoredProducts();

  const scored: ScoredProduct[] = [];
  let skipped = 0;
  let needMoreHistory = 0;

  for (const product of products) {
    const snapshots = await getProductSnapshots(product.id);
    if (snapshots.length === 0) {
      skipped++;
      continue;
    }

    // Avec moins de 3 jours d'historique, computeVerdict renvoie déjà un
    // verdict prudent dont le reasoning dit explicitement "historique trop
    // court". On garde le produit au classement avec ce message plutôt que
    // de le masquer : l'utilisateur voit ce qu'il a saisi et comprend
    // pourquoi le verdict n'est pas encore fiable.
    if (hasInsufficientHistory(snapshots)) needMoreHistory++;

    const verdict = computeVerdict(snapshots);
    const opportunityScore = computeOpportunityScore(
      verdict,
      commissionOf(product),
      sellerTrustOf(product),
    );
    const latest = snapshots[snapshots.length - 1]!;
    const estSales = (latest.estSalesLow + latest.estSalesHigh) / 2;

    scored.push({ product, verdict, opportunityScore, estSales });

    // Le verdict et l'estimation les plus récents sont dénormalisés sur
    // le produit — la page détail les lit sans relire tout l'historique.
    await setDoc(
      doc(firestore, "products", product.id),
      {
        latestVerdict: verdict,
        latestEstimates: {
          salesLow: latest.estSalesLow,
          salesHigh: latest.estSalesHigh,
          confidence: latest.confidence,
          // Valeur ajoutée à estimateMethodSchema : elle n'y était pas, donc
          // tout `productSchema.parse()` sur un produit écrit ici échouait.
          method: "manual_entry",
        },
      },
      { merge: true },
    );
  }

  const byVolume = [...scored].sort((a, b) => b.estSales - a.estSales);
  const byOpportunity = [...scored].sort(
    (a, b) => b.opportunityScore - a.opportunityScore,
  );

  await Promise.all([
    setDoc(doc(firestore, "rankings", "products_FR_7d_all"), {
      generatedAt,
      // Vrais relevés, vrais moteurs — écrase explicitement un éventuel
      // classement de démo écrit avant sur le même document.
      isDemo: false,
      type: "products",
      market: "FR",
      period: "7d",
      category: null,
      items: byVolume.map((s, i) => rankingItem(s, i + 1)),
    }),
    setDoc(doc(firestore, "rankings", "opportunities_FR_7d_all"), {
      generatedAt,
      isDemo: false,
      type: "opportunities",
      market: "FR",
      period: "7d",
      category: null,
      items: byOpportunity.map((s, i) => rankingItem(s, i + 1)),
    }),
  ]);

  return {
    productsProcessed: products.length,
    productsRanked: scored.length,
    productsSkippedNoHistory: skipped,
    productsNeedingMoreHistory: needMoreHistory,
    generatedAt,
  };
}
