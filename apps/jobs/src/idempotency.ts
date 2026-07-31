import type { BigQuery } from "@google-cloud/bigquery";
import { BIGQUERY_DATASET } from "./bigquery/client.js";

// verdict_history n'a pas d'ID de ligne naturel côté BigQuery (pas de
// MERGE/upsert simple sur une table en streaming buffer) — l'idempotence
// se fait donc par un DELETE explicite sur la journée avant d'insérer les
// nouvelles lignes, plutôt qu'un append qui dupliquerait à chaque relance.
export interface VerdictHistoryRow {
  productId: string;
  computedDate: string;
  phase: string;
  saturation: number;
  windowDays: number;
}

export async function writeVerdictHistory(
  bq: BigQuery,
  rows: VerdictHistoryRow[],
  computedDate: string,
  dryRun: boolean,
): Promise<void> {
  if (dryRun) {
    console.log(`[dry-run] would replace verdict_history for ${computedDate} with ${rows.length} row(s)`);
    return;
  }
  if (rows.length === 0) return;

  await bq.query({
    query: `DELETE FROM \`${BIGQUERY_DATASET}.verdict_history\` WHERE computed_date = @computedDate`,
    params: { computedDate },
  });

  await bq
    .dataset(BIGQUERY_DATASET)
    .table("verdict_history")
    .insert(
      rows.map((r) => ({
        product_id: r.productId,
        computed_date: r.computedDate,
        phase: r.phase,
        saturation: r.saturation,
        window_days: r.windowDays,
      })),
    );
}
