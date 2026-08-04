import { describe, expect, it } from "vitest";
import type { Commission, ProductVerdict, SellerTrust } from "@kairos/shared";
import { computeOpportunityScore } from "./compute-opportunity-score";

function makeVerdict(overrides: Partial<ProductVerdict> = {}): ProductVerdict {
  return {
    phase: "emergence",
    daysInPhase: 5,
    saturationScore: 10,
    // Confiance élevée : la phase n'est prise pour argent comptant que
    // dans la mesure où l'historique la soutient (voir UNKNOWN_PHASE_SCORE).
    windowDaysRemaining: { low: 60, high: 100, confidence: 0.95 },
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

// Régression : le verdict d'un produit sans historique est prudent
// ("risque") mais sa *phase* par défaut est "emergence", la mieux notée.
// Le classement « Opportunités » plaçait donc un produit saisi la veille
// au-dessus de produits réellement analysés — constaté en conditions
// réelles, 7e sur 22.
describe("phase non étayée par les données", () => {
  const insufficient = makeVerdict({
    phase: "emergence",
    saturationScore: 50,
    windowDaysRemaining: { low: 0, high: 30, confidence: 0.05 },
    verdict: "risque",
  });

  it("ne récompense pas une phase déduite d'un historique vide", () => {
    const unknown = computeOpportunityScore(insufficient, makeCommission(), makeSellerTrust());
    const known = computeOpportunityScore(makeVerdict(), makeCommission(), makeSellerTrust());
    expect(unknown).toBeLessThan(known);
  });

  it("le classe même sous un produit en simple fin de croissance", () => {
    const lateGrowth = makeVerdict({
      phase: "late_growth",
      saturationScore: 50,
      windowDaysRemaining: { low: 15, high: 40, confidence: 0.9 },
    });
    expect(
      computeOpportunityScore(insufficient, makeCommission(), makeSellerTrust()),
    ).toBeLessThan(
      computeOpportunityScore(lateGrowth, makeCommission(), makeSellerTrust()),
    );
  });
});
