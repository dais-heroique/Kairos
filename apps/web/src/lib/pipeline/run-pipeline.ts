"use client";

import { doc, getDoc, setDoc } from "firebase/firestore";
import {
  aggregateCategories,
  aggregateShops,
  appendArchiveDay,
  EMPTY_ARCHIVE,
  type ArchiveLabel,
  type RankingArchive,
  compareOpportunityOf,
  computeOpportunityScore,
  computeVerdict,
  hasInsufficientHistory,
  PERIOD_DAYS,
  selectNewcomers,
  type AggregableProduct,
} from "@kairos/core";
import {
  resolveCommission,
  type Commission,
  type ProductVerdict,
  type SellerTrust,
} from "@kairos/shared";
import { firestore } from "@/lib/firebase/client";
import {
  getProductSnapshots,
  listStoredProducts,
  todayIso,
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
  /** Jours conservés dans l'archive des classements (plan Pro). */
  archivedDays: number;
  /** Agrégations dérivées des mêmes produits, sans source supplémentaire. */
  shopsRanked: number;
  categoriesRanked: number;
  newcomersRanked: number;
  generatedAt: string;
}

interface ScoredProduct {
  product: StoredProduct;
  verdict: ProductVerdict;
  /** `null` = aucun des quatre axes du score n'est mesuré, donc rien à classer. */
  opportunityScore: number | null;
  estSales: number;
  /**
   * Date du relevé le plus ancien. C'est la première fois que KAIROS a vu
   * ce produit — dérivé de l'historique plutôt que d'un champ à maintenir,
   * donc impossible à désynchroniser. `firstSeenAt` stocké (posé par
   * `recover:apify` à l'insertion) reste prioritaire quand il existe.
   */
  firstSeenAt: string;
}

// Forme commune attendue par les agrégations de packages/core, partagées
// avec apps/jobs pour que les deux pipelines écrivent les mêmes documents.
function aggregable(scored: ScoredProduct): AggregableProduct {
  return {
    id: scored.product.id,
    shopId: scored.product.shopId || null,
    shopName: scored.product.shopName || null,
    priceCents: scored.product.priceCents,
    soldTotal: scored.product.soldTotal,
    // Mot-clé de collecte quand il existe (produits Apify), sinon la
    // catégorie déclarée à la saisie. Ni l'un ni l'autre n'est la
    // taxonomie officielle TikTok Shop — la page le dit.
    groupKey: scored.product.sourceQuery || scored.product.category || null,
    firstSeenAt: scored.firstSeenAt,
  };
}

function commissionOf(product: StoredProduct): Commission {
  // Un taux saisi dans /admin/produits est un relevé. Laissé vide, on
  // retombe sur le barème de catégorie plutôt que sur zéro — même règle
  // que le pipeline de collecte, et elle n'est écrite qu'une fois
  // (`resolveCommission`).
  return resolveCommission(
    product.commissionRatePct > 0
      ? {
          ratePct: product.commissionRatePct,
          isOpenCollab: true,
          isTargetedOnly: false,
          isEstimated: false,
        }
      : null,
    product.title,
    product.sourceQuery ?? product.category,
  );
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

// Doit rester aligné sur buildDisplayItem() dans apps/jobs/src/rank.ts —
// les deux pipelines écrivent le même document.
function rankingItem(scored: ScoredProduct, rank: number) {
  const commission = commissionOf(scored.product);
  return {
    id: scored.product.id,
    rank,
    title: scored.product.title,
    priceCents: scored.product.priceCents,
    shopId: scored.product.shopId,
    commissionRatePct: commission.ratePct,
    commissionIsEstimated: commission.isEstimated,
    verdict: scored.verdict.verdict,
    salesTrend: TREND_BY_PHASE[scored.verdict.phase],
    emoji: scored.product.emoji ?? null,
    category: scored.product.category,
    // Nécessaire au tableau de bord sans relire un document par produit
    // (budget de 5 lectures par page). Le raisonnement du verdict était
    // calculé à chaque passage puis jeté — c'est pourtant lui qui explique
    // la recommandation.
    phase: scored.verdict.phase,
    saturationScore: scored.verdict.saturationScore,
    windowDaysLow: scored.verdict.windowDaysRemaining.low,
    windowDaysHigh: scored.verdict.windowDaysRemaining.high,
    verdictConfidence: scored.verdict.windowDaysRemaining.confidence,
    reasoning: scored.verdict.reasoning,
    opportunityScore: scored.opportunityScore,
    estSalesLow: scored.product.snapshotCount > 0 ? scored.estSales : 0,
    snapshotCount: scored.product.snapshotCount,
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
    const insufficientHistory = hasInsufficientHistory(snapshots);
    if (insufficientHistory) needMoreHistory++;

    const verdict = computeVerdict(snapshots);
    const opportunityScore = computeOpportunityScore(
      verdict,
      commissionOf(product),
      sellerTrustOf(product),
      { hasMeasuredHistory: !insufficientHistory },
    );
    const latest = snapshots[snapshots.length - 1]!;
    const estSales = (latest.estSalesLow + latest.estSalesHigh) / 2;
    const firstSeenAt = product.firstSeenAt ?? snapshots[0]!.capturedDate;

    scored.push({ product, verdict, opportunityScore, estSales, firstSeenAt });

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
  // Ordre partagé avec apps/jobs (compareOpportunity, packages/core) :
  // opportunités jouables, puis pas-encore-jugeables, puis « éviter ».
  const byOpportunity = [...scored].sort(compareOpportunityOf);

  // Un seul produit simulé suffit à marquer le classement : l'utilisateur
  // doit savoir que ce qu'il lit n'est pas entièrement adossé à des
  // relevés réels. Ce sont bien les vrais moteurs qui ont calculé ces
  // verdicts — mais sur un marché en partie inventé, et la nuance
  // appartient au lecteur, pas à nous.
  const isDemo = scored.some((s) => s.product.isDemo);

  // Boutiques, Catégories et Nouveautés sont des **agrégations** des mêmes
  // produits : aucune source supplémentaire n'est nécessaire. Ce pipeline
  // ne les écrivait pas — seul apps/jobs le faisait, or c'est celui-ci qui
  // tourne. Les trois pages affichaient donc « le pipeline n'a pas encore
  // tourné » juste après l'avoir fait tourner.
  const aggregables = scored.map(aggregable);
  const newcomerIds = new Set(
    selectNewcomers(aggregables, PERIOD_DAYS["7d"]!, generatedAt).map((p) => p.id),
  );
  const newcomers = byVolume.filter((s) => newcomerIds.has(s.product.id));

  // Archive : la fenêtre glissante de 30 jours qui rend le plan Pro réel.
  // Un seul document, relu puis réécrit — le budget de lecture des pages
  // (≤5 opérations) interdit un document par jour.
  const archiveRef = doc(firestore, "rankingArchive", "FR_7d");
  const existing = await getDoc(archiveRef);
  const previous = (existing.data() as RankingArchive | undefined) ?? EMPTY_ARCHIVE;

  const labels: Record<string, ArchiveLabel> = {};
  for (const s of scored) {
    labels[s.product.id] = {
      title: s.product.title,
      ...(s.product.emoji ? { emoji: s.product.emoji } : {}),
    };
  }

  const archive = appendArchiveDay(
    previous,
    {
      date: todayIso(),
      products: byVolume.map((s) => s.product.id),
      opportunities: byOpportunity.map((s) => s.product.id),
      saturation: Object.fromEntries(
        scored.map((s) => [s.product.id, s.verdict.saturationScore]),
      ),
    },
    labels,
  );

  const rankingDoc = (type: string, items: unknown[]) => ({
    generatedAt,
    isDemo,
    type,
    market: "FR",
    period: "7d",
    category: null,
    items,
  });

  await Promise.all([
    setDoc(
      doc(firestore, "rankings", "products_FR_7d_all"),
      rankingDoc("products", byVolume.map((s, i) => rankingItem(s, i + 1))),
    ),
    setDoc(
      doc(firestore, "rankings", "opportunities_FR_7d_all"),
      rankingDoc("opportunities", byOpportunity.map((s, i) => rankingItem(s, i + 1))),
    ),
    setDoc(
      doc(firestore, "rankings", "shops_FR_7d_all"),
      rankingDoc("shops", aggregateShops(aggregables)),
    ),
    setDoc(
      doc(firestore, "rankings", "categories_FR_7d_all"),
      rankingDoc("categories", aggregateCategories(aggregables)),
    ),
    setDoc(
      doc(firestore, "rankings", "newcomers_FR_7d_all"),
      rankingDoc("newcomers", newcomers.map((s, i) => rankingItem(s, i + 1))),
    ),
    setDoc(archiveRef, archive),
  ]);

  return {
    productsProcessed: products.length,
    productsRanked: scored.length,
    productsSkippedNoHistory: skipped,
    productsNeedingMoreHistory: needMoreHistory,
    archivedDays: archive.days.length,
    shopsRanked: aggregateShops(aggregables).length,
    categoriesRanked: aggregateCategories(aggregables).length,
    newcomersRanked: newcomers.length,
    generatedAt,
  };
}
