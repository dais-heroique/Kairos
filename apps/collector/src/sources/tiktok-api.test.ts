import { describe, expect, it, vi } from "vitest";
import { fetchTiktokApiRawProduct, parseTiktokApiProduct } from "./tiktok-api.js";

describe("parseTiktokApiProduct", () => {
  it("maps the hypothesized raw shape to ProductSnapshot", () => {
    const snapshot = parseTiktokApiProduct(
      {
        id: "p1",
        price: 1999,
        review_count: 42,
        rating: 4.3,
        creator_count: 12,
        video_count: 30,
        seller_count: 5,
        sales_estimate_low: 100,
        sales_estimate_high: 200,
      },
      "2026-07-28",
    );

    expect(snapshot).toEqual({
      productId: "p1",
      capturedDate: "2026-07-28",
      priceCents: 1999,
      reviewCount: 42,
      ratingAvg: 4.3,
      activeCreatorCount: 12,
      videoCount: 30,
      competingShopCount: 5,
      estSalesLow: 100,
      estSalesHigh: 200,
      confidence: 0.5,
    });
  });
});

describe("fetchTiktokApiRawProduct", () => {
  it("throws a clear error on a non-ok response instead of silently returning bad data", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    await expect(fetchTiktokApiRawProduct("p1", fetchImpl as unknown as typeof fetch)).rejects.toThrow(
      /404/,
    );
  });
});
