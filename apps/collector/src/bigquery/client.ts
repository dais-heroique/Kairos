import { BigQuery } from "@google-cloud/bigquery";

// Un seul client réutilisé entre les invocations Cloud Run (évite de
// rouvrir une connexion à chaque requête HTTP).
let client: BigQuery | undefined;

export function getBigQueryClient(): BigQuery {
  if (!client) {
    const projectId = process.env.GCP_PROJECT_ID;
    client = projectId ? new BigQuery({ projectId }) : new BigQuery();
  }
  return client;
}

export const BIGQUERY_DATASET = process.env.BIGQUERY_DATASET ?? "kairos";
