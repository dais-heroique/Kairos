import { BigQuery } from "@google-cloud/bigquery";

export interface AiSpendSummary {
  todayCents: number;
  monthCents: number;
  byFeatureCents: Record<string, number>;
  topConsumers: Array<{ userId: string; costCents: number }>;
}

let client: BigQuery | undefined;
function getBigQueryClient(): BigQuery {
  if (!client) {
    const projectId = process.env.GCP_PROJECT_ID;
    client = projectId ? new BigQuery({ projectId }) : new BigQuery();
  }
  return client;
}

const BIGQUERY_DATASET = process.env.BIGQUERY_DATASET ?? "kairos";

function rowDateString(value: unknown): string {
  if (value && typeof value === "object" && "value" in (value as Record<string, unknown>)) {
    return String((value as { value: unknown }).value);
  }
  return String(value);
}

// Une seule requête BigQuery pour tout le mois en cours (au lieu d'une
// requête par métrique) — chaque requête a un coût, autant agréger
// côté serveur une fois les lignes en main plutôt que de multiplier les
// scans de la table.
export async function getAiSpendSummary(): Promise<AiSpendSummary> {
  const bq = getBigQueryClient();
  const [rows] = await bq.query({
    query: `
      SELECT date, feature, user_id, cost_cents
      FROM \`${BIGQUERY_DATASET}.ai_spend\`
      WHERE date >= DATE_TRUNC(CURRENT_DATE(), MONTH)
    `,
  });

  const today = new Date().toISOString().slice(0, 10);
  let todayCents = 0;
  let monthCents = 0;
  const byFeatureCents: Record<string, number> = {};
  const byUser = new Map<string, number>();

  for (const row of rows as Array<{
    date: unknown;
    feature: string;
    user_id: string;
    cost_cents: number;
  }>) {
    const dateStr = rowDateString(row.date);
    monthCents += row.cost_cents;
    if (dateStr === today) todayCents += row.cost_cents;
    byFeatureCents[row.feature] = (byFeatureCents[row.feature] ?? 0) + row.cost_cents;
    byUser.set(row.user_id, (byUser.get(row.user_id) ?? 0) + row.cost_cents);
  }

  const topConsumers = [...byUser.entries()]
    .map(([userId, costCents]) => ({ userId, costCents }))
    .sort((a, b) => b.costCents - a.costCents)
    .slice(0, 10);

  return { todayCents, monthCents, byFeatureCents, topConsumers };
}
