import {
  collection,
  doc,
  documentId,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import type { Market, RankingDoc, RankingPeriod } from "@kairos/shared";
import { getPublicFirestore } from "../firebase-client";
import type { ProductRankItem } from "../../types/product-rank-item";
import type { ReadCounter } from "./read-counter";

// Segment "pas de catégorie" — doit rester cohérent avec
// apps/jobs/src/rank.ts (NO_CATEGORY_SEGMENT).
const NO_CATEGORY_SEGMENT = "all";

// Une clause "in" Firestore est plafonnée à 30 valeurs — au-delà on
// regroupe par lots plutôt que de faire un get() par boutique.
const SHOP_LOOKUP_CHUNK_SIZE = 30;

export async function getRankingDoc(
  type: string,
  market: Market,
  period: RankingPeriod,
  category: string | null = null,
  counter?: ReadCounter,
): Promise<RankingDoc | null> {
  const db = getPublicFirestore();
  const id = `${type}_${market}_${period}_${category ?? NO_CATEGORY_SEGMENT}`;
  const snap = await getDoc(doc(db, "rankings", id));
  counter?.increment();
  if (!snap.exists()) return null;
  return snap.data() as RankingDoc;
}

// 1 requête groupée par lot de 30 shopId — jamais un get() par ligne de
// classement.
export async function resolveShopNames(
  shopIds: string[],
  counter?: ReadCounter,
): Promise<Map<string, string>> {
  const db = getPublicFirestore();
  const uniqueIds = [...new Set(shopIds.filter((id): id is string => Boolean(id)))];
  const result = new Map<string, string>();
  if (uniqueIds.length === 0) return result;

  for (let i = 0; i < uniqueIds.length; i += SHOP_LOOKUP_CHUNK_SIZE) {
    const chunk = uniqueIds.slice(i, i + SHOP_LOOKUP_CHUNK_SIZE);
    const snap = await getDocs(
      query(collection(db, "shops"), where(documentId(), "in", chunk)),
    );
    counter?.increment();
    snap.forEach((d) => {
      const name = (d.data().name as string | undefined) ?? "Boutique";
      result.set(d.id, name);
    });
  }
  return result;
}

function toProductRankItem(
  raw: RankingDoc["items"][number],
  shopNames: Map<string, string>,
): ProductRankItem {
  const item = raw as unknown as {
    id: string;
    rank: number;
    title?: string;
    priceCents?: number;
    shopId?: string | null;
    commissionRatePct?: number;
    verdict?: ProductRankItem["verdict"];
    salesTrend?: ProductRankItem["salesTrend"];
  };
  return {
    id: item.id,
    rank: item.rank,
    title: item.title ?? "",
    priceCents: item.priceCents ?? 0,
    shopName: (item.shopId && shopNames.get(item.shopId)) || "Boutique",
    commissionRatePct: item.commissionRatePct ?? 0,
    verdict: item.verdict ?? "risque",
    salesTrend: item.salesTrend ?? "flat",
  };
}

export interface RankingPageData {
  items: ProductRankItem[];
  generatedAt: string | null;
  /**
   * Classement issu du jeu de démonstration (`seedDemoRankingData`) et non
   * de vrais relevés. L'UI doit le dire à l'écran : ces produits sont
   * fictifs et leurs verdicts écrits en dur.
   */
  isDemo: boolean;
}

// 2 opérations Firestore au total quelle que soit la taille du
// classement (≤100 items) : 1 lecture du document rankings/*, 1 requête
// groupée pour les noms de boutique. Bien sous le budget de 5.
//
// Dégrade vers "aucune donnée" plutôt que de faire planter le build
// statique (contrainte plan Spark) si Firestore est injoignable (règles
// pas encore déployées, etc.) — le prochain déploiement remonte les
// vraies données dès qu'elles existent.
export async function getRankingPageData(
  type: string,
  market: Market,
  period: RankingPeriod,
  category: string | null = null,
  counter?: ReadCounter,
): Promise<RankingPageData> {
  let rankingDoc: RankingDoc | null;
  try {
    rankingDoc = await getRankingDoc(type, market, period, category, counter);
  } catch {
    return { items: [], generatedAt: null, isDemo: false };
  }
  if (!rankingDoc) return { items: [], generatedAt: null, isDemo: false };

  const shopIds = rankingDoc.items
    .map((item) => (item as unknown as { shopId?: string | null }).shopId)
    .filter((id): id is string => Boolean(id));
  const shopNames = await resolveShopNames(shopIds, counter).catch(() => new Map<string, string>());

  return {
    items: rankingDoc.items.map((item) => toProductRankItem(item, shopNames)),
    generatedAt: rankingDoc.generatedAt,
    // Absent des documents écrits avant l'ajout du drapeau : on ne
    // présume pas qu'ils sont réels, mais les seuls documents non
    // marqués aujourd'hui sont ceux d'apps/jobs, qui le sont.
    isDemo: (rankingDoc as unknown as { isDemo?: boolean }).isDemo === true,
  };
}
