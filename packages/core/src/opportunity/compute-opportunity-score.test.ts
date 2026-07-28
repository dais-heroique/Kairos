import { describe, expect, it } from "vitest";
import type { Commission, ProductVerdict, SellerTrust } from "@kairos/shared";
import { computeOpportunityScore } from "./compute-opportunity-score";

function makeVerdict(overrides: Partial<ProductVerdict> = {}): ProductVerdict {
  return {
    phase: "emergence",
    daysInPhase: 5,
    saturationScore: 10,
    windowDaysRemaining: { low: 60, high: 100, confidence: 0.6 },
    marginLowPct: 30,
    marginHighPct: 50,
    verdict: "entrer_maintenant",
    reasoning: ["test"],
    computedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeCommission(overrides: Partial<Commission> = {}): Commission {
  return { ratePct: 20, isOpenCollab: true, isTargetedOnly: false, ...overrides };
}

function makeSellerTrust(overrides: Partial<SellerTrust> = {}): SellerTrust {
  return {
    score: 80,
    shipDays: 3,
    commissionHonorRate: 0.95,
    sampleApprovalRate: 0.8,
    avgSampleResponseHours: 12,
    disputeRate: 0.02,
    sampleCount: 40,
    ...overrides,
  };
}

describe("computeOpportunityScore", () => {
  it("forte opportunité — émergence, commission élevée, vendeur fiable, faible saturation", () => {
    const score = computeOpportunityScore(makeVerdict(), makeCommission(), makeSellerTrust());

    expect(score).toBeGreaterThan(70);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("faible opportunité — déclin, forte saturation, vendeur peu fiable", () => {
    const score = computeOpportunityScore(
      makeVerdict({ phase: "decline", saturationScore: 90 }),
      makeCommission({ ratePct: 5 }),
      makeSellerTrust({ score: 20 }),
    );

    expect(score).toBeLessThan(30);
    expect(score).toBeGreaterThanOrEqual(0);
  });

  it("commission absente — score pénalisé, pas de crash", () => {
    const withCommission = computeOpportunityScore(
      makeVerdict(),
      makeCommission({ ratePct: 25 }),
      makeSellerTrust(),
    );
    const withoutCommission = computeOpportunityScore(
      makeVerdict(),
      makeCommission({ ratePct: 0, isOpenCollab: false }),
      makeSellerTrust(),
    );

    expect(Number.isFinite(withoutCommission)).toBe(true);
    expect(withoutCommission).toBeLessThan(withCommission);
  });

  it("commission réservée (isTargetedOnly) — pèse moins qu'une commission ouverte équivalente", () => {
    const open = computeOpportunityScore(
      makeVerdict(),
      makeCommission({ ratePct: 20, isOpenCollab: true, isTargetedOnly: false }),
      makeSellerTrust(),
    );
    const targeted = computeOpportunityScore(
      makeVerdict(),
      makeCommission({ ratePct: 20, isOpenCollab: false, isTargetedOnly: true }),
      makeSellerTrust(),
    );

    expect(targeted).toBeLessThan(open);
  });
});
