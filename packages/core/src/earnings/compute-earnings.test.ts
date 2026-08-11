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

  // Ce test affirmait l'inverse jusqu'au 2026-08-11 : il exigeait une
  // fourchette 0 €–0 € avec une confiance d'au moins 0,4. C'était la
  // formulation exacte du bug — une commission absente devenait
  // l'affirmation « ce produit ne rapporte rien », énoncée avec assurance.
  // Le crash n'a jamais été le risque ; le chiffre faux, si.
  it("commission absente — on ne conclut pas, on le dit", () => {
    const result = computeEarnings(baseInput({ commissionRatePct: 0 }));

    expect(result.method).toBe("insufficient_data");
    expect(result.confidence).toBe(0);
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

// Régression du 2026-08-11 : sur des produits réellement collectés, tous
// les gains s'affichaient « 0 € ». La cause n'était pas le moteur mais ce
// qu'on lui donnait — `toProductRankItem` remplace un taux de commission
// absent par `?? 0` — et le moteur multipliait consciencieusement par zéro.
// Un 0 € confiant est pire qu'un tiret : il affirme que le produit ne
// rapporte rien.
describe("les données manquantes ne valent pas zéro", () => {
  const base = {
    expectedViews: 8000,
    followerRange: "5k_20k" as const,
    niche: "beaute",
    medianConversionRate: 0.002,
    priceCents: 7359,
    commissionRatePct: 12,
    estimatedReturnRatePct: 8,
  };

  it("refuse d'estimer sans taux de commission", () => {
    const result = computeEarnings({ ...base, commissionRatePct: 0 });
    expect(result.method).toBe("insufficient_data");
    expect(result.confidence).toBe(0);
  });

  it("refuse d'estimer sans prix", () => {
    const result = computeEarnings({ ...base, priceCents: 0 });
    expect(result.method).toBe("insufficient_data");
    expect(result.confidence).toBe(0);
  });

  it("estime dès que les quatre entrées sont présentes", () => {
    const result = computeEarnings(base);
    expect(result.method).toBe("historical_regression");
    expect(result.low).toBeGreaterThan(0);
  });
});
