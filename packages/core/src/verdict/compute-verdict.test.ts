import { describe, expect, it } from "vitest";
import type { ProductSnapshot } from "@kairos/shared";
import { computeVerdict, hasInsufficientHistory } from "./compute-verdict";

function dateOffset(base: string, days: number): string {
  const d = new Date(`${base}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function makeSnapshot(
  productId: string,
  capturedDate: string,
  overrides: Partial<ProductSnapshot> = {},
): ProductSnapshot {
  return {
    productId,
    capturedDate,
    priceCents: 1999,
    reviewCount: 50,
    ratingAvg: 4.5,
    activeCreatorCount: 10,
    videoCount: 20,
    competingShopCount: 5,
    estSalesLow: 100,
    estSalesHigh: 150,
    confidence: 0.7,
    ...overrides,
  };
}

describe("computeVerdict", () => {
  it("émergence — historique court, ventes en forte hausse, peu de concurrence", () => {
    const snapshots = Array.from({ length: 10 }, (_, i) =>
      makeSnapshot("p-emergence", dateOffset("2026-07-01", i), {
        estSalesLow: 40 + i * 20,
        estSalesHigh: 60 + i * 25,
        competingShopCount: 2,
        activeCreatorCount: 5 + i,
        reviewCount: 10 + i * 3,
      }),
    );

    const verdict = computeVerdict(snapshots);

    expect(verdict.phase).toBe("emergence");
    expect(verdict.windowDaysRemaining.low).toBeLessThanOrEqual(verdict.windowDaysRemaining.high);
    expect(verdict.reasoning.length).toBeGreaterThan(0);
    expect(["entrer_maintenant", "avec_un_angle"]).toContain(verdict.verdict);
  });

  it("croissance — 30 jours, ventes en forte hausse, span dans la fenêtre growth", () => {
    const snapshots = Array.from({ length: 30 }, (_, i) =>
      makeSnapshot("p-growth", dateOffset("2026-06-01", i), {
        estSalesLow: 100 + i * 15,
        estSalesHigh: 140 + i * 18,
        competingShopCount: 3 + Math.floor(i / 5),
        activeCreatorCount: 8 + Math.floor(i / 2),
        reviewCount: 30 + i * 4,
      }),
    );

    const verdict = computeVerdict(snapshots);

    expect(verdict.phase).toBe("growth");
    expect(verdict.daysInPhase).toBeGreaterThan(0);
  });

  it("croissance tardive — 60 jours, croissance ralentie", () => {
    const snapshots = Array.from({ length: 60 }, (_, i) =>
      makeSnapshot("p-late-growth", dateOffset("2026-05-01", i), {
        estSalesLow: 200 + i * 2,
        estSalesHigh: 260 + i * 2.2,
        competingShopCount: 8 + Math.floor(i / 10),
        activeCreatorCount: 20 + Math.floor(i / 6),
        reviewCount: 100 + i * 3,
      }),
    );

    const verdict = computeVerdict(snapshots);

    expect(verdict.phase).toBe("late_growth");
  });

  it("maturité — 120 jours, ventes stables", () => {
    const snapshots = Array.from({ length: 120 }, (_, i) =>
      makeSnapshot("p-maturity", dateOffset("2026-01-01", i), {
        estSalesLow: 300 + (i % 5),
        estSalesHigh: 340 + (i % 5),
        competingShopCount: 15,
        activeCreatorCount: 40,
        reviewCount: 500 + i,
      }),
    );

    const verdict = computeVerdict(snapshots);

    expect(verdict.phase).toBe("maturity");
  });

  it("déclin — ventes en chute, jamais recommandé sans réserve", () => {
    const snapshots = Array.from({ length: 40 }, (_, i) =>
      makeSnapshot("p-decline", dateOffset("2026-04-01", i), {
        estSalesLow: Math.max(10, 400 - i * 8),
        estSalesHigh: Math.max(20, 450 - i * 8),
        competingShopCount: 12 + Math.floor(i / 3),
        activeCreatorCount: Math.max(2, 30 - Math.floor(i / 2)),
        reviewCount: 300 + i,
        priceCents: Math.max(500, 1500 - i * 10),
      }),
    );

    const verdict = computeVerdict(snapshots);

    expect(verdict.phase).toBe("decline");
    expect(verdict.verdict).not.toBe("entrer_maintenant");
  });

  it("saturation brutale — hausse soudaine de concurrence force un verdict prudent", () => {
    const early = Array.from({ length: 13 }, (_, i) =>
      makeSnapshot("p-spike", dateOffset("2026-03-01", i), {
        estSalesLow: 100 + i * 5,
        estSalesHigh: 130 + i * 6,
        competingShopCount: 3,
        activeCreatorCount: 10,
        reviewCount: 50 + i * 2,
      }),
    );
    const spike = Array.from({ length: 7 }, (_, i) =>
      makeSnapshot("p-spike", dateOffset("2026-03-01", 13 + i), {
        estSalesLow: 160 + i * 5,
        estSalesHigh: 195 + i * 6,
        competingShopCount: 3 + (i + 1) * 3,
        activeCreatorCount: 10 + i,
        reviewCount: 76 + i * 2,
        priceCents: 2000 - (i + 1) * 150,
      }),
    );

    const verdict = computeVerdict([...early, ...spike]);

    expect(verdict.reasoning.some((line) => line.includes("brutale"))).toBe(true);
    expect(["risque", "eviter"]).toContain(verdict.verdict);
  });

  it("produit neuf sans historique — verdict prudent, pas de crash", () => {
    expect(hasInsufficientHistory([])).toBe(true);

    const verdict = computeVerdict([]);

    expect(verdict.verdict).toBe("risque");
    expect(verdict.windowDaysRemaining.confidence).toBeLessThan(0.2);
    expect(verdict.reasoning.length).toBeGreaterThan(0);
  });

  it("série avec trou de collecte — confiance réduite, signalé dans le raisonnement", () => {
    const before = Array.from({ length: 5 }, (_, i) =>
      makeSnapshot("p-gap", dateOffset("2026-02-01", i)),
    );
    const after = Array.from({ length: 5 }, (_, i) =>
      makeSnapshot("p-gap", dateOffset("2026-02-01", 20 + i)),
    );

    const verdict = computeVerdict([...before, ...after]);

    expect(verdict.reasoning.some((line) => line.includes("Trou de collecte"))).toBe(true);
    expect(verdict.windowDaysRemaining.confidence).toBeLessThan(0.95);
  });
});
