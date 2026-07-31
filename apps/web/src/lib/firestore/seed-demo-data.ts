"use client";

import { doc, setDoc } from "firebase/firestore";
import { firestore } from "@/lib/firebase/client";

// Jeu de démonstration pour peupler les classements en attendant le vrai
// pipeline de collecte (apps/collector + apps/jobs, qui nécessitent un
// projet GCP réel — voir docs/STATE.md). Déclenché à la main par un admin
// depuis /admin (isAdmin() autorise l'écriture sur products/shops/rankings
// — voir firestore.rules), jamais automatique.

interface DemoShop {
  id: string;
  name: string;
  trustScore: number;
  shipDays: number;
  sampleApprovalRate: number;
  commissionHonorRate: number;
  disputeRate: number;
  productCount: number;
  verified: boolean;
}

const DEMO_SHOPS: DemoShop[] = [
  {
    id: "demo-shop-glow",
    name: "GlowLab Paris",
    trustScore: 88,
    shipDays: 3,
    sampleApprovalRate: 0.72,
    commissionHonorRate: 0.97,
    disputeRate: 0.02,
    productCount: 24,
    verified: true,
  },
  {
    id: "demo-shop-homey",
    name: "Homey Gadgets",
    trustScore: 74,
    shipDays: 5,
    sampleApprovalRate: 0.55,
    commissionHonorRate: 0.91,
    disputeRate: 0.05,
    productCount: 41,
    verified: true,
  },
  {
    id: "demo-shop-clip",
    name: "ClipTech FR",
    trustScore: 63,
    shipDays: 7,
    sampleApprovalRate: 0.4,
    commissionHonorRate: 0.85,
    disputeRate: 0.08,
    productCount: 15,
    verified: false,
  },
];

interface DemoProduct {
  id: string;
  title: string;
  priceCents: number;
  shopId: string;
  commissionRatePct: number;
  verdict: "entrer_maintenant" | "avec_un_angle" | "risque" | "eviter";
  salesTrend: "up" | "down" | "flat";
  opportunityScore: number;
}

const DEMO_PRODUCTS: DemoProduct[] = [
  { id: "demo-p1", title: "Sérum vitamine C éclat", priceCents: 1490, shopId: "demo-shop-glow", commissionRatePct: 25, verdict: "entrer_maintenant", salesTrend: "up", opportunityScore: 92 },
  { id: "demo-p2", title: "Rouleau gua sha jade", priceCents: 990, shopId: "demo-shop-glow", commissionRatePct: 30, verdict: "entrer_maintenant", salesTrend: "up", opportunityScore: 88 },
  { id: "demo-p3", title: "Lampe LED coucher de soleil", priceCents: 1990, shopId: "demo-shop-homey", commissionRatePct: 20, verdict: "avec_un_angle", salesTrend: "flat", opportunityScore: 71 },
  { id: "demo-p4", title: "Support téléphone magnétique voiture", priceCents: 1290, shopId: "demo-shop-clip", commissionRatePct: 18, verdict: "avec_un_angle", salesTrend: "up", opportunityScore: 76 },
  { id: "demo-p5", title: "Mini humidificateur USB", priceCents: 1690, shopId: "demo-shop-homey", commissionRatePct: 22, verdict: "entrer_maintenant", salesTrend: "up", opportunityScore: 85 },
  { id: "demo-p6", title: "Patchs anti-boutons hydrocolloïdes", priceCents: 690, shopId: "demo-shop-glow", commissionRatePct: 35, verdict: "avec_un_angle", salesTrend: "flat", opportunityScore: 68 },
  { id: "demo-p7", title: "Organiseur de câbles magnétique", priceCents: 890, shopId: "demo-shop-clip", commissionRatePct: 15, verdict: "risque", salesTrend: "down", opportunityScore: 41 },
  { id: "demo-p8", title: "Brosse lissante chauffante", priceCents: 2490, shopId: "demo-shop-homey", commissionRatePct: 20, verdict: "avec_un_angle", salesTrend: "up", opportunityScore: 79 },
  { id: "demo-p9", title: "Coque téléphone silicone dégradé", priceCents: 790, shopId: "demo-shop-clip", commissionRatePct: 15, verdict: "risque", salesTrend: "flat", opportunityScore: 38 },
  { id: "demo-p10", title: "Diffuseur d'huiles essentielles portable", priceCents: 1590, shopId: "demo-shop-homey", commissionRatePct: 22, verdict: "eviter", salesTrend: "down", opportunityScore: 22 },
];

function rankingItem(p: DemoProduct, rank: number) {
  return {
    id: p.id,
    rank,
    title: p.title,
    priceCents: p.priceCents,
    shopId: p.shopId,
    commissionRatePct: p.commissionRatePct,
    verdict: p.verdict,
    salesTrend: p.salesTrend,
  };
}

export async function seedDemoRankingData(): Promise<void> {
  const now = new Date().toISOString();

  await Promise.all(
    DEMO_SHOPS.map((shop) =>
      setDoc(doc(firestore, "shops", shop.id), {
        id: shop.id,
        name: shop.name,
        market: "FR",
        trustScore: shop.trustScore,
        shipDays: shop.shipDays,
        sampleApprovalRate: shop.sampleApprovalRate,
        commissionHonorRate: shop.commissionHonorRate,
        disputeRate: shop.disputeRate,
        productCount: shop.productCount,
        verified: shop.verified,
      }),
    ),
  );

  const byVolume = [...DEMO_PRODUCTS];
  const byOpportunity = [...DEMO_PRODUCTS].sort(
    (a, b) => b.opportunityScore - a.opportunityScore,
  );

  await Promise.all([
    setDoc(doc(firestore, "rankings", "products_FR_7d_all"), {
      generatedAt: now,
      type: "products",
      market: "FR",
      period: "7d",
      category: null,
      items: byVolume.map((p, i) => rankingItem(p, i + 1)),
    }),
    setDoc(doc(firestore, "rankings", "opportunities_FR_7d_all"), {
      generatedAt: now,
      type: "opportunities",
      market: "FR",
      period: "7d",
      category: null,
      items: byOpportunity.map((p, i) => rankingItem(p, i + 1)),
    }),
  ]);
}
