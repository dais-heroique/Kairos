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

// Découvert en utilisant l'app : un onboarding abandonné laisse `avgViews`
// à 0, et tout le classement affichait alors « 0 €–0 € (à confirmer) » —
// un résultat qui a l'air calculé alors qu'il ne l'est pas.
describe("profil incomplet", () => {
  it("ne renvoie pas une fourchette nulle crédible quand les vues sont à 0", () => {
    const result = computeEarnings({
      expectedViews: 0,
      followerRange: "5k_20k",
      niche: "beaute",
      medianConversionRate: 0.015,
      priceCents: 1690,
      commissionRatePct: 28,
      estimatedReturnRatePct: 8,
    });
    expect(result.method).toBe("insufficient_data");
    expect(result.confidence).toBe(0);
  });

  it("estime normalement dès que les vues sont renseignées", () => {
    const result = computeEarnings({
      expectedViews: 8000,
      followerRange: "5k_20k",
      niche: "beaute",
      medianConversionRate: 0.015,
      priceCents: 1690,
      commissionRatePct: 28,
      estimatedReturnRatePct: 8,
    });
    expect(result.method).not.toBe("insufficient_data");
    expect(result.low).toBeGreaterThan(0);
    expect(result.high).toBeGreaterThan(result.low);
  });
});
