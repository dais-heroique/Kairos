import { describe, expect, it } from "vitest";
import { computeEarnings, type EarningsInput } from "./compute-earnings";

function baseInput(overrides: Partial<EarningsInput> = {}): EarningsInput {
  return {
    expectedViews: 50_000,
    followerRange: "20k_100k",
    niche: "beaute",
    medianConversionRate: 0.02,
    priceCents: 2500,
    commissionRatePct: 15,
    estimatedReturnRatePct: 8,
    ...overrides,
  };
}

describe("computeEarnings", () => {
  it("cas typique — fourchette cohérente, jamais un nombre nu", () => {
    const result = computeEarnings(baseInput());

    expect(result.low).toBeLessThanOrEqual(result.high);
    expect(result.low).toBeGreaterThan(0);
    expect(result.confidence).toBeGreaterThanOrEqual(0.4);
    expect(result.confidence).toBeLessThanOrEqual(0.95);
    expect(result.method).toBe("historical_regression");
  });

  it("gros volume de vues — fourchette resserrée, confiance plus haute", () => {
    const small = computeEarnings(baseInput({ expectedViews: 500 }));
    const large = computeEarnings(baseInput({ expectedViews: 5_000_000 }));

    const spreadOf = (r: { low: number; high: number }) =>
      r.high > 0 ? (r.high - r.low) / r.high : 0;

    expect(spreadOf(large)).toBeLessThan(spreadOf(small));
    expect(large.confidence).toBeGreaterThan(small.confidence);
  });

  it("commission absente — gains à zéro, pas de crash", () => {
    const result = computeEarnings(baseInput({ commissionRatePct: 0 }));

    expect(result.low).toBe(0);
    expect(result.high).toBe(0);
    expect(result.confidence).toBeGreaterThanOrEqual(0.4);
  });

  it("données manquantes — taux de conversion nul, gains à zéro, pas de crash", () => {
    const result = computeEarnings(baseInput({ medianConversionRate: 0, expectedViews: 0 }));

    expect(result.low).toBe(0);
    expect(result.high).toBe(0);
    expect(Number.isFinite(result.confidence)).toBe(true);
  });
});
