import { describe, expect, it } from "vitest";
import type { ProductSnapshot } from "@kairos/shared";
import { computeProductVerdictAndEstimates } from "./compute.js";

function makeSnapshot(capturedDate: string, overrides: Partial<ProductSnapshot> = {}): ProductSnapshot {
  return {
    productId: "p1",
    capturedDate,
    priceCents: 1999,
    reviewCount: 20,
    ratingAvg: 4.5,
    activeCreatorCount: 8,
    videoCount: 15,
    competingShopCount: 3,
    estSalesLow: 100,
    estSalesHigh: 150,
    confidence: 0.7,
    ...overrides,
  };
}

describe("computeProductVerdictAndEstimates", () => {
  it("produces a verdict and estimates from a normal history", () => {
    const snapshots = Array.from({ length: 10 }, (_, i) => makeSnapshot(`2026-07-0${i + 1}`));

    const result = computeProductVerdictAndEstimates("p1", snapshots);

    expect(result.productId).toBe("p1");
    expect(result.estimates.method).toBe("historical_regression");
    expect(result.estimates.salesLow).toBeLessThanOrEqual(result.estimates.salesHigh);
    expect(Number.isFinite(result.opportunityScore)).toBe(true);
  });

  it("marks insufficient_data when history is too short, without crashing", () => {
    const result = computeProductVerdictAndEstimates("p1", [makeSnapshot("2026-07-01")]);

    expect(result.estimates.method).toBe("insufficient_data");
    expect(result.estimates.confidence).toBeLessThanOrEqual(0.1);
  });

  it("handles an empty series (brand new product) without crashing", () => {
    const result = computeProductVerdictAndEstimates("p1", []);

    expect(result.estimates.method).toBe("insufficient_data");
    expect(result.estimates.salesLow).toBe(0);
    expect(result.verdict.verdict).toBe("risque");
  });
});
