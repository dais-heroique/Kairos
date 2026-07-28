import { describe, expect, it, vi } from "vitest";
import type { BigQuery } from "@google-cloud/bigquery";
import type { ProductSnapshot } from "@kairos/shared";
import {
  writeCreatorSnapshots,
  writeProductSnapshots,
  writeShopSnapshots,
  writeVideoMetrics,
} from "./writers.js";

function makeFakeBigQuery() {
  const insert = vi.fn().mockResolvedValue(undefined);
  const table = vi.fn().mockReturnValue({ insert });
  const dataset = vi.fn().mockReturnValue({ table });
  const bq = { dataset } as unknown as BigQuery;
  return { bq, dataset, table, insert };
}

const snapshot: ProductSnapshot = {
  productId: "p1",
  capturedDate: "2026-07-28",
  priceCents: 1999,
  reviewCount: 10,
  ratingAvg: 4.2,
  activeCreatorCount: 3,
  videoCount: 5,
  competingShopCount: 2,
  estSalesLow: 10,
  estSalesHigh: 20,
  confidence: 0.5,
};

describe("bigquery writers", () => {
  it("writeProductSnapshots maps camelCase to snake_case columns", async () => {
    const { bq, table, insert } = makeFakeBigQuery();

    await writeProductSnapshots([snapshot], bq);

    expect(table).toHaveBeenCalledWith("product_snapshots");
    expect(insert).toHaveBeenCalledWith([
      {
        product_id: "p1",
        captured_date: "2026-07-28",
        price_cents: 1999,
        review_count: 10,
        rating_avg: 4.2,
        active_creator_count: 3,
        video_count: 5,
        competing_shop_count: 2,
        est_sales_low: 10,
        est_sales_high: 20,
        confidence: 0.5,
      },
    ]);
  });

  it("skips the insert call entirely for an empty batch", async () => {
    const { bq, insert } = makeFakeBigQuery();

    await writeProductSnapshots([], bq);

    expect(insert).not.toHaveBeenCalled();
  });

  it("writeShopSnapshots/writeCreatorSnapshots/writeVideoMetrics target the right tables", async () => {
    const shop = makeFakeBigQuery();
    await writeShopSnapshots(
      [{ shopId: "s1", capturedDate: "2026-07-28", productCount: 4, estGmv: 100, ratings: 4.5 }],
      shop.bq,
    );
    expect(shop.table).toHaveBeenCalledWith("shop_snapshots");

    const creator = makeFakeBigQuery();
    await writeCreatorSnapshots(
      [{ creatorId: "c1", capturedDate: "2026-07-28", followers: 1000, avgViews: 500, estGmv: 50 }],
      creator.bq,
    );
    expect(creator.table).toHaveBeenCalledWith("creator_snapshots");

    const video = makeFakeBigQuery();
    await writeVideoMetrics(
      [{ videoId: "v1", productId: "p1", capturedDate: "2026-07-28", views: 10000, gmvPer1k: 3.2 }],
      video.bq,
    );
    expect(video.table).toHaveBeenCalledWith("video_metrics");
  });
});
