import type { BigQuery } from "@google-cloud/bigquery";
import type { ProductSnapshot } from "@kairos/shared";
import { BIGQUERY_DATASET } from "../bigquery/client.js";
import type { SnapshotSource } from "./types.js";

// Implémentation réelle — requêtes BigQuery partitionnées sur
// product_snapshots. Non vérifiable dans ce bac à sable (aucun projet
// BigQuery accessible) ; pipeline.test.ts utilise FixtureSnapshotSource à
// la place pour tester le reste du pipeline contre l'émulateur Firestore.
export class BigQuerySnapshotSource implements SnapshotSource {
  constructor(
    private readonly bq: BigQuery,
    private readonly dataset: string = BIGQUERY_DATASET,
  ) {}

  async listActiveProductIds(): Promise<string[]> {
    const [rows] = await this.bq.query({
      query: `
        SELECT DISTINCT product_id
        FROM \`${this.dataset}.product_snapshots\`
        WHERE captured_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 2 DAY)
      `,
    });
    return (rows as Array<{ product_id: string }>).map((r) => r.product_id);
  }

  async getSnapshotSeries(productId: string, days: number): Promise<ProductSnapshot[]> {
    const [rows] = await this.bq.query({
      query: `
        SELECT *
        FROM \`${this.dataset}.product_snapshots\`
        WHERE product_id = @productId
          AND captured_date >= DATE_SUB(CURRENT_DATE(), INTERVAL @days DAY)
        ORDER BY captured_date ASC
      `,
      params: { productId, days },
    });
    return (rows as Record<string, unknown>[]).map((row) => toProductSnapshot(row));
  }
}

function toDateString(value: unknown): string {
  if (value && typeof value === "object" && "value" in (value as Record<string, unknown>)) {
    return String((value as { value: unknown }).value);
  }
  return String(value);
}

function toProductSnapshot(row: Record<string, unknown>): ProductSnapshot {
  return {
    productId: String(row.product_id),
    capturedDate: toDateString(row.captured_date),
    priceCents: Number(row.price_cents),
    reviewCount: Number(row.review_count),
    ratingAvg: Number(row.rating_avg),
    activeCreatorCount: Number(row.active_creator_count),
    videoCount: Number(row.video_count),
    competingShopCount: Number(row.competing_shop_count),
    estSalesLow: Number(row.est_sales_low),
    estSalesHigh: Number(row.est_sales_high),
    confidence: Number(row.confidence),
  };
}
