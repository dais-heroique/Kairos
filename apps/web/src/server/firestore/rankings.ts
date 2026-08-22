import {
  collection,
  doc,
  documentId,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import {
  resolveCommission,
  type Market,
  type RankingDoc,
  type RankingPeriod,
} from "@kairos/shared";
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
    commissionIsEstimated?: boolean;
    soldTotal?: number | null;
    imageUrl?: string | null;
    sourceMarket?: Market | null;
    verdict?: ProductRankItem["verdict"];
    salesTrend?: ProductRankItem["salesTrend"];
    emoji?: string | null;
    category?: string | null;
    phase?: ProductRankItem["phase"];
    saturationScore?: number;
    windowDaysLow?: number;
    windowDaysHigh?: number;
    verdictConfidence?: number;
    reasoning?: string[];
    // `null` est écrit explicitement par les deux pipelines quand aucun
    // axe du score n'est mesuré. `optional()` le laisse tomber : côté UI,
    // « score absent » et « pas encore classable » sont la même chose.
    opportunityScore?: number | null;
    snapshotCount?: number;
  };
  // Le barème de catégorie s'applique aussi ici, à la lecture. Les
  // documents `rankings/*` déjà écrits portent `commissionRatePct: 0` :
  // sans ce repli, ils continueraient d'afficher « inconnue » jusqu'au
  // prochain passage du pipeline. La règle est dérivée du titre, donc le
  // résultat est le même que si le pipeline l'avait posée — et un taux
  // réellement écrit n'est jamais remplacé.
  const commission = resolveCommission(
    item.commissionRatePct && item.commissionRatePct > 0
      ? {
          ratePct: item.commissionRatePct,
          isOpenCollab: true,
          isTargetedOnly: false,
          isEstimated: item.commissionIsEstimated ?? false,
        }
      : null,
    item.title ?? "",
    item.category,
  );

  // `exactOptionalPropertyTypes` est actif : un champ optionnel se pose
  // seulement s'il existe, il ne se met pas à `undefined`.
  const optional = <T,>(key: string, value: T | null | undefined) =>
    value === null || value === undefined ? {} : { [key]: value };

  return {
    id: item.id,
    rank: item.rank,
    title: item.title ?? "",
    priceCents: item.priceCents ?? 0,
    shopName: (item.shopId && shopNames.get(item.shopId)) || "Boutique",
    commissionRatePct: commission.ratePct,
    commissionIsEstimated: commission.isEstimated,
    soldTotal: item.soldTotal ?? null,
    imageUrl: item.imageUrl ?? null,
    sourceMarket: item.sourceMarket ?? null,
    verdict: item.verdict ?? "risque",
    salesTrend: item.salesTrend ?? "flat",
    // Le pipeline écrit bien `emoji` dans les items, mais cette conversion
    // l'oubliait : toutes les lignes retombaient sur l'icône générique 📦.
    ...optional("emoji", item.emoji),
    ...optional("shopId", item.shopId),
    ...optional("category", item.category),
    ...optional("phase", item.phase),
    ...optional("saturationScore", item.saturationScore),
    ...optional("windowDaysLow", item.windowDaysLow),
    ...optional("windowDaysHigh", item.windowDaysHigh),
    ...optional("verdictConfidence", item.verdictConfidence),
    ...optional("reasoning", item.reasoning),
    ...optional("opportunityScore", item.opportunityScore),
    ...optional("snapshotCount", item.snapshotCount),
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
  sourceMarket?: Market | null;
  marketVerified?: boolean;
}

const MAX_RANKING_AGE_DAYS = 21;

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
    return { items: [], generatedAt: null, isDemo: false, sourceMarket: null, marketVerified: false };
  }
  if (!rankingDoc) return { items: [], generatedAt: null, isDemo: false, sourceMarket: null, marketVerified: false };

  const isDemo = (rankingDoc as unknown as { isDemo?: boolean }).isDemo === true;
  const sourceMarket = (rankingDoc as unknown as { sourceMarket?: Market }).sourceMarket ?? null;
  const documentMarket = (rankingDoc as unknown as { market?: Market }).market ?? null;
  const generatedAtMs = Date.parse(rankingDoc.generatedAt);
  const isRecentEnough = Number.isFinite(generatedAtMs)
    && Date.now() - generatedAtMs <= MAX_RANKING_AGE_DAYS * 24 * 60 * 60 * 1000;
  // Un document explicitement issu d'un autre marché est toujours rejeté.
  // Pour les anciens documents sans sourceMarket, on peut toutefois utiliser
  // la provenance du document et sa fraîcheur : cela conserve les résultats
  // FR récents après une interruption de collecte, sans réintroduire le bug
  // US→FR. Au-delà de trois semaines, l'interface préfère signaler l'absence
  // de données plutôt que présenter un classement trompeusement actuel.
  const marketMatches = sourceMarket ? sourceMarket === market : documentMarket === market;
  if (!isDemo && (!marketMatches || !isRecentEnough)) {
    return {
      items: [],
      generatedAt: rankingDoc.generatedAt,
      isDemo: false,
      sourceMarket,
      marketVerified: false,
    };
  }

  const shopIds = rankingDoc.items
    .map((item) => (item as unknown as { shopId?: string | null }).shopId)
    .filter((id): id is string => Boolean(id));
  const shopNames = await resolveShopNames(shopIds, counter).catch(() => new Map<string, string>());

  return {
    items: rankingDoc.items.map((item) => toProductRankItem(item, shopNames)),
    generatedAt: rankingDoc.generatedAt,
    isDemo,
    sourceMarket,
    marketVerified: true,
  };
}
