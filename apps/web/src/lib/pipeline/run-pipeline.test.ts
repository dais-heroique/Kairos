import { describe, expect, it } from "vitest";
import {
  computeOpportunityScore,
  computeVerdict,
  hasInsufficientHistory,
} from "@kairos/core";
import type { Commission, ProductSnapshot, SellerTrust } from "@kairos/shared";

// Le pipeline réel (run-pipeline.ts) lit Firestore côté client, donc il
// n'est pas testable ici sans navigateur. Ce qui compte et se teste, c'est
// la chaîne de calcul qu'il applique : les snapshots saisis à la main
// doivent produire des verdicts réels via les moteurs packages/core, pas
// des valeurs inventées. Voir apps/jobs/src/pipeline.test.ts pour la
// version serveur de la même chaîne.

function snapshot(
  capturedDate: string,
  overrides: Partial<ProductSnapshot> = {},
): ProductSnapshot {
  return {
    productId: "p1",
    capturedDate,
    priceCents: 1490,
    reviewCount: 100,
    ratingAvg: 4.5,
    activeCreatorCount: 10,
    videoCount: 20,
    competingShopCount: 3,
    estSalesLow: 100,
    estSalesHigh: 200,
    confidence: 0.6,
    ...overrides,
  };
}

const COMMISSION: Commission = {
  ratePct: 25,
  isOpenCollab: true,
  isTargetedOnly: false,
};

const SELLER_TRUST: SellerTrust = {
  score: 80,
  shipDays: 5,
  commissionHonorRate: 0.95,
  sampleApprovalRate: 0.5,
  avgSampleResponseHours: 48,
  disputeRate: 0.03,
  sampleCount: 0,
};

describe("chaîne de calcul du pipeline de saisie manuelle", () => {
  it("signale un historique insuffisant sous 3 relevés", () => {
    expect(hasInsufficientHistory([snapshot("2026-07-01")])).toBe(true);
    expect(
      hasInsufficientHistory([snapshot("2026-07-01"), snapshot("2026-07-02")]),
    ).toBe(true);
    expect(
      hasInsufficientHistory([
        snapshot("2026-07-01"),
        snapshot("2026-07-02"),
        snapshot("2026-07-03"),
      ]),
    ).toBe(false);
  });

  it("explique honnêtement un verdict rendu sur un historique trop court", () => {
    const verdict = computeVerdict([snapshot("2026-07-01")]);

    expect(verdict.verdict).toBe("risque");
    expect(verdict.reasoning.join(" ")).toContain("Historique trop court");
    // Une confiance quasi nulle, pas une fourchette rassurante inventée.
    expect(verdict.windowDaysRemaining.confidence).toBeLessThan(0.1);
  });

  it("produit un verdict et un score d'opportunité réels sur un historique suffisant", () => {
    const snapshots = [
      snapshot("2026-07-01", { reviewCount: 10, activeCreatorCount: 2, videoCount: 3 }),
      snapshot("2026-07-03", { reviewCount: 40, activeCreatorCount: 5, videoCount: 9 }),
      snapshot("2026-07-05", { reviewCount: 90, activeCreatorCount: 9, videoCount: 18 }),
      snapshot("2026-07-07", { reviewCount: 160, activeCreatorCount: 14, videoCount: 30 }),
    ];

    const verdict = computeVerdict(snapshots);
    expect(hasInsufficientHistory(snapshots)).toBe(false);
    expect(verdict.reasoning.join(" ")).not.toContain("Historique trop court");
    expect(verdict.saturationScore).toBeGreaterThanOrEqual(0);
    expect(verdict.saturationScore).toBeLessThanOrEqual(100);

    const score = computeOpportunityScore(verdict, COMMISSION, SELLER_TRUST);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("classe une commission plus élevée au-dessus, toutes choses égales par ailleurs", () => {
    const snapshots = [
      snapshot("2026-07-01", { reviewCount: 10 }),
      snapshot("2026-07-03", { reviewCount: 40 }),
      snapshot("2026-07-05", { reviewCount: 90 }),
    ];
    const verdict = computeVerdict(snapshots);

    const high = computeOpportunityScore(verdict, { ...COMMISSION, ratePct: 30 }, SELLER_TRUST);
    const low = computeOpportunityScore(verdict, { ...COMMISSION, ratePct: 5 }, SELLER_TRUST);

    expect(high).toBeGreaterThan(low);
  });
});
