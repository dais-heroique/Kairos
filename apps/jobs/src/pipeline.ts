import type { BigQuery } from "@google-cloud/bigquery";
import type { Firestore } from "firebase-admin/firestore";
import { PRIMARY_MARKET, RANKING_PERIODS } from "@kairos/shared";
import type { Market, ProductRanks, ProductSnapshot, RankingDoc, RankingPeriod } from "@kairos/shared";
import { computeProductVerdictAndEstimates, type ComputedProduct } from "./compute.js";
import { writeVerdictHistory } from "./idempotency.js";
import type { SnapshotSource } from "./datasource/types.js";
import { readProductMeta } from "./product-meta.js";
import { buildFeed, buildRankings } from "./rank.js";
import { writeFeedDoc, writeProductVerdicts, writeRankingDocs } from "./write-firestore.js";

export interface PipelineOptions {
  market?: Market;
  periods?: readonly RankingPeriod[];
  dryRun?: boolean;
  today?: string; // YYYY-MM-DD, injectable pour les tests
}

export interface PipelineResult {
  productCount: number;
  rankingDocCount: number;
  durationsMs: Record<string, number>;
}

function timeStep<T>(label: string, durations: Record<string, number>, fn: () => Promise<T>): Promise<T> {
  const start = Date.now();
  return fn().then((result) => {
    durations[label] = Date.now() - start;
    console.log(`[jobs] ${label}: ${durations[label]}ms`);
    return result;
  });
}

/**
 * Pipeline quotidien — 5 étapes : READ, COMPUTE, RANK (nécessaire avant
 * l'écriture des documents produit, qui embarquent leur position dans les
 * classements), WRITE (produits + classements), FEED. L'ordre d'exécution
 * diffère légèrement de l'énumération "READ/CALCULER/ÉCRIRE/CLASSER/
 * FEEDER" de la spec d'origine : RANK doit tourner avant l'écriture des
 * documents produit puisque products/{id}.ranks dépend du classement —
 * documenté ici plutôt que silencieusement réordonné sans explication.
 */
export async function runDailyPipeline(
  source: SnapshotSource,
  db: Firestore,
  bq: BigQuery,
  options: PipelineOptions = {},
): Promise<PipelineResult> {
  const market = options.market ?? PRIMARY_MARKET;
  const periods = options.periods ?? RANKING_PERIODS;
  const dryRun = options.dryRun ?? false;
  const today = options.today ?? new Date().toISOString().slice(0, 10);
  const durationsMs: Record<string, number> = {};

  const { productIds, seriesByProduct } = await timeStep("read", durationsMs, async () => {
    const ids = await source.listActiveProductIds();
    const map = new Map<string, ProductSnapshot[]>();
    for (const id of ids) {
      map.set(id, await source.getSnapshotSeries(id, 45));
    }
    return { productIds: ids, seriesByProduct: map };
  });

  // Métadonnées produit existantes (titre, prix, commission, shopId) — une
  // seule RPC batchée (db.getAll), réutilisée pour le calcul (commission
  // réelle plutôt que le score neutre par défaut) et pour peupler les
  // champs d'affichage des items de classement.
  const metaByProduct = await timeStep("read", durationsMs, () => readProductMeta(db, productIds));

  const computed: ComputedProduct[] = await timeStep("compute", durationsMs, async () =>
    productIds.map((id) => {
      const meta = metaByProduct.get(id);
      return computeProductVerdictAndEstimates(
        id,
        seriesByProduct.get(id) ?? [],
        meta?.commission,
        meta?.sellerTrust,
      );
    }),
  );

  const allRankingDocs = new Map<string, RankingDoc>();
  const mergedProductRanks = new Map<string, ProductRanks>();
  await timeStep("rank", durationsMs, async () => {
    for (const period of periods) {
      const { docs, productRanks } = buildRankings(computed, market, period, metaByProduct);
      for (const [id, doc] of docs) allRankingDocs.set(id, doc);
      for (const [productId, ranks] of productRanks) {
        mergedProductRanks.set(productId, { ...mergedProductRanks.get(productId), ...ranks });
      }
    }
  });

  await timeStep("write-firestore", durationsMs, async () => {
    await writeProductVerdicts(db, computed, mergedProductRanks, dryRun);
    await writeRankingDocs(db, allRankingDocs, dryRun);
  });

  await timeStep("feed", durationsMs, async () => {
    const feed = buildFeed(computed, market, "all", today, metaByProduct);
    await writeFeedDoc(db, `${market}_all_${today}`, feed, dryRun);
  });

  await timeStep("verdict-history", durationsMs, () =>
    writeVerdictHistory(
      bq,
      computed.map((c) => ({
        productId: c.productId,
        computedDate: today,
        phase: c.verdict.phase,
        saturation: c.verdict.saturationScore,
        windowDays: c.verdict.windowDaysRemaining.high,
      })),
      today,
      dryRun,
    ),
  );

  return { productCount: computed.length, rankingDocCount: allRankingDocs.size, durationsMs };
}
