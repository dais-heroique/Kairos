import { describe, expect, it } from "vitest";
import { classifyHotCold, isColdProductDueToday } from "./hot-cold.js";

describe("classifyHotCold", () => {
  it("splits products into hot (ranked/watchlisted) and cold buckets", () => {
    const { hot, cold } = classifyHotCold(
      ["p1", "p2", "p3", "p4"],
      new Set(["p2", "p4"]),
    );

    expect(hot.sort()).toEqual(["p2", "p4"]);
    expect(cold.sort()).toEqual(["p1", "p3"]);
  });

  it("everything is cold when the hot set is empty", () => {
    const { hot, cold } = classifyHotCold(["p1", "p2"], new Set());
    expect(hot).toEqual([]);
    expect(cold).toEqual(["p1", "p2"]);
  });
});

describe("isColdProductDueToday", () => {
  it("is deterministic for a given product id and date", () => {
    const day = new Date("2026-07-28T00:00:00.000Z");
    const first = isColdProductDueToday("product-abc-123", day);
    const second = isColdProductDueToday("product-abc-123", day);
    expect(first).toBe(second);
  });

  it("spreads different product ids across the week rather than all on one day", () => {
    const day = new Date("2026-07-28T00:00:00.000Z");
    const ids = Array.from({ length: 200 }, (_, i) => `product-${i}`);
    const dueToday = ids.filter((id) => isColdProductDueToday(id, day));

    // Avec 200 produits répartis sur 7 jours, aucun jour ne devrait
    // concentrer la quasi-totalité de la collecte froide.
    expect(dueToday.length).toBeGreaterThan(0);
    expect(dueToday.length).toBeLessThan(ids.length);
  });
});
