import type { BigQuery } from "@google-cloud/bigquery";
import type { SpendEntry, SpendRecorder } from "./types";

const BIGQUERY_DATASET = process.env.BIGQUERY_DATASET ?? "kairos";

// Source de vérité pour l'audit et /admin/couts (Lot 5) — une ligne par
// appel IA, jamais agrégée en amont.
export function createBigQuerySpendWriter(
  bq: BigQuery,
  dataset: string = BIGQUERY_DATASET,
): SpendRecorder {
  return {
    async recordSpend(entry: SpendEntry) {
      await bq
        .dataset(dataset)
        .table("ai_spend")
        .insert([
          {
            date: entry.date,
            feature: entry.feature,
            model: entry.model,
            input_tokens: entry.inputTokens,
            output_tokens: entry.outputTokens,
            cost_cents: entry.costCents,
            user_id: entry.userId,
          },
        ]);
    },
  };
}

// Combine les deux : le wrapper n'a besoin que d'un seul SpendRecorder
// pour que "aucun appel ne peut contourner le log" reste vrai avec un
// seul point d'écriture à la fois BigQuery (audit) et Firestore (quotas).
export function combineSpendRecorders(...recorders: SpendRecorder[]): SpendRecorder {
  return {
    async recordSpend(entry: SpendEntry) {
      await Promise.all(recorders.map((r) => r.recordSpend(entry)));
    },
  };
}
