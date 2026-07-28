import type { Market, RankingDoc, RankingPeriod } from "@kairos/shared";
import { getAdminFirestore } from "../firebase-admin";
import type { ProductRankItem } from "../../types/product-rank-item";
import type { ReadCounter } from "./read-counter";

// Segment "pas de catégorie" — doit rester cohérent avec
// apps/jobs/src/rank.ts (NO_CATEGORY_SEGMENT).
const NO_CATEGORY_SEGMENT = "all";

export async function getRankingDoc(
  type: string,
  market: Market,
  period: RankingPeriod,
  category: string | null = null,
  counter?: ReadCounter,
): Promise<RankingDoc | null> {
  const db = getAdminFirestore();
  const id = `${type}_${market}_${period}_${category ?? NO_CATEGORY_SEGMENT}`;
  const snap = await db.collection("rankings").doc(id).get();
  counter?.increment();
  if (!snap.exists) return null;
  return snap.data() as RankingDoc;
}

// Une seule RPC batchée pour tous les shopId de la page — jamais un get()
// par ligne de classement.
export async function resolveShopNames(
  shopIds: string[],
  counter?: ReadCounter,
): Promise<Map<string, string>> {
  const db = getAdminFirestore();
  const uniqueIds = [...new Set(shopIds.filter((id): id is string => Boolean(id)))];
  const result = new Map<string, string>();
  if (uniqueIds.length === 0) return result;

  const refs = uniqueIds.map((id) => db.collection("shops").doc(id));
  const snaps = await db.getAll(...refs);
  counter?.increment();

  snaps.forEach((snap, i) => {
    const name = (snap.data()?.name as string | undefined) ?? "Boutique";
    result.set(uniqueIds[i]!, name);
  });
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
}

// 2 opérations Firestore au total quelle que soit la taille du
// classement (≤100 items) : 1 lecture du document rankings/*, 1 getAll()
// batché pour les noms de boutique. Bien sous le budget de 5.
export async function getRankingPageData(
  type: string,
  market: Market,
  period: RankingPeriod,
  category: string | null = null,
  counter?: ReadCounter,
): Promise<RankingPageData> {
  const doc = await getRankingDoc(type, market, period, category, counter);
  if (!doc) return { items: [], generatedAt: null };

  const shopIds = doc.items
    .map((item) => (item as unknown as { shopId?: string | null }).shopId)
    .filter((id): id is string => Boolean(id));
  const shopNames = await resolveShopNames(shopIds, counter);

  return {
    items: doc.items.map((item) => toProductRankItem(item, shopNames)),
    generatedAt: doc.generatedAt,
  };
}
