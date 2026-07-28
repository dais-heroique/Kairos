import { describe, expect, it } from "vitest";
import { RANKING_TYPES } from "@kairos/shared";
import type { ComputedProduct } from "./compute.js";
import { buildFeed, buildRankings, rankingDocId } from "./rank.js";

function makeComputed(productId: string, salesHigh: number, opportunityScore: number): ComputedProduct {
  return {
    productId,
    verdict: {
      phase: "growth",
      daysInPhase: 5,
      saturationScore: 20,
      windowDaysRemaining: { low: 20, high: 40, confidence: 0.6 },
      marginLowPct: 20,
      marginHighPct: 40,
      verdict: "entrer_maintenant",
      reasoning: ["test"],
      computedAt: new Date().toISOString(),
    },
    estimates: { salesLow: salesHigh - 10, salesHigh, confidence: 0.6, method: "historical_regression" },
    opportunityScore,
  };
}

describe("rankingDocId", () => {
  it("uses 'all' when there is no category", () => {
    expect(rankingDocId("products", "FR", "7d", null)).toBe("products_FR_7d_all");
  });

  it("uses the category when present", () => {
    expect(rankingDocId("products", "FR", "7d", "beaute")).toBe("products_FR_7d_beaute");
  });
});

describe("buildRankings", () => {
  const computed = [
    makeComputed("p1", 100, 50),
    makeComputed("p2", 300, 90),
    makeComputed("p3", 200, 70),
  ];

  it("generates all 9 ranking document types", () => {
    const { docs } = buildRankings(computed, "FR", "7d");
    expect(docs.size).toBe(RANKING_TYPES.length);
    for (const type of RANKING_TYPES) {
      expect(docs.has(rankingDocId(type, "FR", "7d", null))).toBe(true);
    }
  });

  it("ranks the products doc by estimated sales volume descending", () => {
    const { docs } = buildRankings(computed, "FR", "7d");
    const productsDoc = docs.get(rankingDocId("products", "FR", "7d", null))!;
    expect(productsDoc.items.map((i) => i.id)).toEqual(["p2", "p3", "p1"]);
    expect(productsDoc.items.every((i) => i.rank >= 1)).toBe(true);
  });

  it("ranks the opportunities doc by opportunity score descending", () => {
    const { docs } = buildRankings(computed, "FR", "7d");
    const opportunitiesDoc = docs.get(rankingDocId("opportunities", "FR", "7d", null))!;
    expect(opportunitiesDoc.items.map((i) => i.id)).toEqual(["p2", "p3", "p1"]);
  });

  it("caps every ranking document at 100 items", () => {
    const many = Array.from({ length: 150 }, (_, i) => makeComputed(`p${i}`, i, i));
    const { docs } = buildRankings(many, "FR", "7d");
    for (const doc of docs.values()) {
      expect(doc.items.length).toBeLessThanOrEqual(100);
    }
  });

  it("leaves the 7 non-product ranking types empty (no aggregation pipeline yet)", () => {
    const { docs } = buildRankings(computed, "FR", "7d");
    for (const type of RANKING_TYPES) {
      if (type === "products" || type === "opportunities") continue;
      expect(docs.get(rankingDocId(type, "FR", "7d", null))!.items).toEqual([]);
    }
  });

  it("only populates products/{id}.ranks for the 7d period", () => {
    const { productRanks: ranks7d } = buildRankings(computed, "FR", "7d");
    const { productRanks: ranks24h } = buildRankings(computed, "FR", "24h");

    expect(ranks7d.get("p2")).toEqual({ sales7d: 1, opportunity: 1 });
    expect(ranks24h.size).toBe(0);
  });
});

describe("buildFeed", () => {
  it("caps at 40 items and ranks by opportunity score", () => {
    const computed = Array.from({ length: 60 }, (_, i) => makeComputed(`p${i}`, i, i));
    const feed = buildFeed(computed, "FR", "all", "2026-07-28");

    expect(feed.items.length).toBe(40);
    expect(feed.items[0]!.id).toBe("p59");
  });
});
