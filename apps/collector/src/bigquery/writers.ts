import type { BigQuery } from "@google-cloud/bigquery";
import type { ProductSnapshot } from "@kairos/shared";
import { BIGQUERY_DATASET, getBigQueryClient } from "./client.js";

// Formes miroir des tables bigquery/02-05_*.sql — packages/shared n'a de
// schéma Zod que pour ProductSnapshot (entrée du moteur verdict) ; ces
// trois-là ne sont que des lignes d'écriture internes au collector, donc
// de simples interfaces suffisent (pas de contrat exposé à l'UI).
export interface ShopSnapshotRow {
  shopId: string;
  capturedDate: string;
  productCount: number;
  estGmv: number;
  ratings: number;
}

export interface CreatorSnapshotRow {
  creatorId: string;
  capturedDate: string;
  followers: number;
  avgViews: number;
  estGmv: number;
}

export interface VideoMetricRow {
  videoId: string;
  productId: string;
  capturedDate: string;
  views: number;
  gmvPer1k: number;
}

function toProductSnapshotRow(s: ProductSnapshot) {
  return {
    product_id: s.productId,
    captured_date: s.capturedDate,
    price_cents: s.priceCents,
    review_count: s.reviewCount,
    rating_avg: s.ratingAvg,
    active_creator_count: s.activeCreatorCount,
    video_count: s.videoCount,
    competing_shop_count: s.competingShopCount,
    est_sales_low: s.estSalesLow,
    est_sales_high: s.estSalesHigh,
    confidence: s.confidence,
  };
}

function toShopSnapshotRow(s: ShopSnapshotRow) {
  return {
    shop_id: s.shopId,
    captured_date: s.capturedDate,
    product_count: s.productCount,
    est_gmv: s.estGmv,
    ratings: s.ratings,
  };
}

function toCreatorSnapshotRow(s: CreatorSnapshotRow) {
  return {
    creator_id: s.creatorId,
    captured_date: s.capturedDate,
    followers: s.followers,
    avg_views: s.avgViews,
    est_gmv: s.estGmv,
  };
}

function toVideoMetricRow(v: VideoMetricRow) {
  return {
    video_id: v.videoId,
    product_id: v.productId,
    captured_date: v.capturedDate,
    views: v.views,
    gmv_per_1k: v.gmvPer1k,
  };
}

async function insertRows(
  bq: BigQuery,
  table: string,
  rows: Record<string, unknown>[],
): Promise<void> {
  if (rows.length === 0) return;
  await bq.dataset(BIGQUERY_DATASET).table(table).insert(rows);
}

export async function writeProductSnapshots(
  rows: ProductSnapshot[],
  bq: BigQuery = getBigQueryClient(),
): Promise<void> {
  await insertRows(bq, "product_snapshots", rows.map(toProductSnapshotRow));
}

export async function writeShopSnapshots(
  rows: ShopSnapshotRow[],
  bq: BigQuery = getBigQueryClient(),
): Promise<void> {
  await insertRows(bq, "shop_snapshots", rows.map(toShopSnapshotRow));
}

export async function writeCreatorSnapshots(
  rows: CreatorSnapshotRow[],
  bq: BigQuery = getBigQueryClient(),
): Promise<void> {
  await insertRows(bq, "creator_snapshots", rows.map(toCreatorSnapshotRow));
}

export async function writeVideoMetrics(
  rows: VideoMetricRow[],
  bq: BigQuery = getBigQueryClient(),
): Promise<void> {
  await insertRows(bq, "video_metrics", rows.map(toVideoMetricRow));
}
