import { describe, expect, it } from "vitest";
import {
  formatPlanPrice,
  formatYearlyAsMonthly,
  type PlanDefinition,
  planPriceCents,
  PLANS,
  yearlySavingsPct,
} from "./plans";

// L'affichage des tarifs porte une règle qui n'est pas cosmétique :
// aucun montant ne doit apparaître à l'écran s'il ne correspond pas à ce
// que Stripe facturera. Ces tests gardent les trois façons de l'enfreindre
// — inventer, arrondir dans le mauvais sens, dériver un prix d'un autre.

function plan(overrides: Partial<PlanDefinition> = {}): PlanDefinition {
  return {
    slug: "creator",
    name: "Creator",
    priceCents: null,
    yearlyPriceCents: null,
    tagline: "",
    highlight: "",
    popular: false,
    ...overrides,
  };
}

describe("formatPlanPrice", () => {
  it("dit « Bientôt » plutôt que d'inventer un montant", () => {
    expect(formatPlanPrice(plan())).toBe("Bientôt");
    expect(formatPlanPrice(plan({ priceCents: 1900 }), "yearly")).toBe("Bientôt");
  });

  it("formate à la française, avec la bonne périodicité", () => {
    expect(formatPlanPrice(plan({ priceCents: 1900 }))).toBe("19,00 € / mois");
    expect(formatPlanPrice(plan({ yearlyPriceCents: 19000 }), "yearly")).toBe(
      "190,00 € / an",
    );
  });

  it("un plan à 0 est gratuit, pas « 0,00 € / mois »", () => {
    expect(formatPlanPrice(plan({ priceCents: 0 }))).toBe("Gratuit");
  });
});

describe("planPriceCents", () => {
  it("sépare les deux périodicités sans en dériver une de l'autre", () => {
    const p = plan({ priceCents: 1900, yearlyPriceCents: 19000 });
    expect(planPriceCents(p, "monthly")).toBe(1900);
    expect(planPriceCents(p, "yearly")).toBe(19000);
  });

  it("le mensuel est la valeur par défaut", () => {
    expect(planPriceCents(plan({ priceCents: 1900 }))).toBe(1900);
  });
});

describe("yearlySavingsPct", () => {
  it("calcule l'économie réelle depuis les deux montants", () => {
    // 12 × 19 € = 228 €, payé 190 € → 16,66 %, annoncé 16.
    expect(yearlySavingsPct(plan({ priceCents: 1900, yearlyPriceCents: 19000 }))).toBe(16);
  });

  it("arrondit vers le bas — jamais promettre plus que ce qu'on facture", () => {
    // 12 × 10 € = 120 €, payé 96 € → exactement 20 %.
    expect(yearlySavingsPct(plan({ priceCents: 1000, yearlyPriceCents: 9600 }))).toBe(20);
    // 119,99 € → 0,008 % d'économie : surtout pas « 1 % ».
    expect(yearlySavingsPct(plan({ priceCents: 1000, yearlyPriceCents: 11999 }))).toBe(0);
  });

  it("ne renvoie rien tant qu'un des deux montants manque", () => {
    expect(yearlySavingsPct(plan({ priceCents: 1900 }))).toBeNull();
    expect(yearlySavingsPct(plan({ yearlyPriceCents: 19000 }))).toBeNull();
    expect(yearlySavingsPct(plan())).toBeNull();
  });

  it("ne fabrique pas un avantage quand l'annuel n'en donne aucun", () => {
    expect(yearlySavingsPct(plan({ priceCents: 1000, yearlyPriceCents: 12000 }))).toBeNull();
    expect(yearlySavingsPct(plan({ priceCents: 1000, yearlyPriceCents: 15000 }))).toBeNull();
  });
});

describe("formatYearlyAsMonthly", () => {
  it("ramène l'annuel au mois pour rendre les deux comparables", () => {
    expect(formatYearlyAsMonthly(plan({ yearlyPriceCents: 19000 }))).toBe("15,83 € / mois");
  });

  it("ne dit rien sans montant annuel", () => {
    expect(formatYearlyAsMonthly(plan())).toBeNull();
    expect(formatYearlyAsMonthly(plan({ yearlyPriceCents: 0 }))).toBeNull();
  });
});

describe("le catalogue livré", () => {
  it("n'affiche aucun tarif tant qu'il n'est pas arrêté dans Stripe", () => {
    // Ce test tombera le jour où les montants seront renseignés : c'est
    // voulu. Il force à relire ce fichier à ce moment-là, quand les vrais
    // chiffres arrivent, plutôt que de les laisser passer sans regard.
    for (const p of PLANS.filter((p) => p.slug !== "radar")) {
      expect(p.priceCents, `${p.slug} mensuel`).toBeNull();
      expect(p.yearlyPriceCents, `${p.slug} annuel`).toBeNull();
    }
  });

  it("le plan gratuit reste gratuit dans les deux périodicités", () => {
    const radar = PLANS.find((p) => p.slug === "radar")!;
    expect(formatPlanPrice(radar, "monthly")).toBe("Gratuit");
    expect(formatPlanPrice(radar, "yearly")).toBe("Gratuit");
  });
});
