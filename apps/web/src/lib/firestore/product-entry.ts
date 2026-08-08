"use client";

import {
  collection,
  doc,
  getCountFromServer,
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

// Date du jour à Paris, pas en UTC. `toISOString()` aurait classé toute
// saisie faite entre minuit et 2h du matin (heure française) sous la date
// de la veille — et comme `capturedDate` sert d'identifiant de document,
// ce relevé aurait écrasé celui de la veille au lieu d'en créer un
// nouveau. Un trou dans l'historique fait chuter la confiance du verdict
// (maxAllowedGapDays), donc la timezone n'est pas un détail cosmétique.
// `en-CA` est la locale qui formate nativement en AAAA-MM-JJ.
const PARIS_DATE = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Paris",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function todayIso(): string {
  return PARIS_DATE.format(new Date());
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
        ...UNMEASURED_SELLER_TRUST,
      },
      lastSeenAt: new Date().toISOString(),
    },
    { merge: true },
  );

  // merge : sans lui, chaque nouveau produit d'une boutique déjà connue
  // réécrasait tout le document boutique (dont productCount) à zéro.
  await setDoc(
    doc(firestore, "shops", product.shopId),
    {
      id: product.shopId,
      name: product.shopName,
      market: "FR",
      trustScore: product.shopTrustScore,
      shipDays: UNMEASURED_SELLER_TRUST.shipDays,
      sampleApprovalRate: UNMEASURED_SELLER_TRUST.sampleApprovalRate,
      commissionHonorRate: UNMEASURED_SELLER_TRUST.commissionHonorRate,
      disputeRate: UNMEASURED_SELLER_TRUST.disputeRate,
      // `verified` = "note saisie ≥ 70", pas une vérification faite par
      // KAIROS. Le champ n'est affiché nulle part aujourd'hui ; ne pas le
      // transformer en badge « boutique vérifiée » sans une vraie source.
      verified: product.shopTrustScore >= 70,
    },
    { merge: true },
  );

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

// ⚠️ Valeurs de remplissage, PAS des mesures. L'espace affilié ne donne
// pas ces champs, et le formulaire ne les demande pas — mais
// `computeOpportunityScore` en a besoin. Elles étaient jusqu'ici copiées
// à l'identique dans deux fichiers (ici et run-pipeline.ts), avec le
// risque qu'elles divergent en silence ; une seule définition, nommée
// pour ce qu'elle est.
//
// Conséquence à assumer : le score d'opportunité affiché dépend en partie
// de constantes qui ne décrivent aucune boutique réelle. Tant qu'elles
// sont identiques pour tous les produits elles ne changent pas le
// *classement* (même décalage pour tout le monde), mais elles rendent le
// score absolu peu signifiant. À trancher — voir docs/STATE.md.
export const UNMEASURED_SELLER_TRUST = {
  shipDays: 5,
  commissionHonorRate: 0.95,
  sampleApprovalRate: 0.5,
  avgSampleResponseHours: 48,
  disputeRate: 0.03,
  sampleCount: 0,
} as const;

export interface StoredProduct extends ProductEntry {
  snapshotCount: number;
  /** Produit issu du marché simulé (`seedDemoRankingData`), pas d'un relevé réel. */
  isDemo: boolean;
  // Champs posés par la collecte Apify (`recover:apify`). Absents sur une
  // saisie manuelle — `null` veut dire « pas collecté », jamais « zéro ».
  // Le pipeline en a besoin pour les classements Boutiques / Catégories /
  // Nouveautés, qui sont des agrégations de ces mêmes produits.
  /** Unités vendues, cumul annoncé par la plateforme. */
  soldTotal: number | null;
  /** Mot-clé de recherche qui a fait remonter ce produit. */
  sourceQuery: string | null;
  /** ISO 8601 — première fois que KAIROS a vu ce produit. */
  firstSeenAt: string | null;
}

// Le quota gratuit Firestore (50 000 lectures/jour) est la seule chose qui
// tienne réellement la contrainte « 0 € ». La version précédente lisait
// *tous* les relevés de *tous* les produits juste pour les compter, puis
// le pipeline les relisait intégralement derrière : 50 produits × 60 jours
// coûtaient ~6 000 lectures par passage. Deux corrections :
//   - getCountFromServer() compte côté serveur (1 lecture par produit au
//     lieu d'une par relevé) ;
//   - les noms de boutique sont mis en cache par shopId sur l'appel.
export async function listStoredProducts(): Promise<StoredProduct[]> {
  const snap = await getDocs(query(collection(firestore, "products"), fsLimit(200)));
  const results: StoredProduct[] = [];
  const shopNames = new Map<string, string>();

  for (const d of snap.docs) {
    const data = d.data();
    const snapshotCount = await getCountFromServer(
      collection(firestore, "products", d.id, "snapshots"),
    );
    const shopId = (data.shopId as string) ?? "";
    let shopName = "Boutique";
    if (shopId) {
      if (!shopNames.has(shopId)) {
        const shopDoc = await getDoc(doc(firestore, "shops", shopId));
        shopNames.set(shopId, (shopDoc.data()?.name as string) ?? "Boutique");
      }
      shopName = shopNames.get(shopId)!;
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
      snapshotCount: snapshotCount.data().count,
      isDemo: data.isDemo === true,
      soldTotal: (data.soldTotal as number | undefined) ?? null,
      sourceQuery: (data.sourceQuery as string | undefined) ?? null,
      firstSeenAt: (data.firstSeenAt as string | undefined) ?? null,
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
