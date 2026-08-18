import { BigQuery } from "@google-cloud/bigquery";

let client: BigQuery | undefined;

export function getBigQueryClient(): BigQuery {
  if (!client) {
    const projectId = process.env.GCP_PROJECT_ID?.trim();
    client = projectId ? new BigQuery({ projectId }) : new BigQuery();
  }
  return client;
}

/**
 * BigQuery ne sert qu'au journal verdict_history. Firestore contient déjà les
 * produits, snapshots, classements et feeds utilisés par le dashboard. Ce
 * fallback permet aux collectes locales de réussir sur Firebase Spark, où
 * BigQuery n'est pas activé ou où le compte de service n'a pas jobs.create.
 */
export function createNoopBigQuery(): BigQuery {
  return {
    query: async () => {
      console.log("[jobs] BigQuery non configuré — verdict_history ignoré (non bloquant)");
      return [[]];
    },
    dataset: () => ({ table: () => ({ insert: async () => undefined }) }),
  } as unknown as BigQuery;
}

export const BIGQUERY_DATASET = process.env.BIGQUERY_DATASET ?? "kairos";
