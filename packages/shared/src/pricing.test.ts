import { describe, expect, it } from "vitest";
import {
  capabilitiesGainedFrom,
  formatPlanPrice,
  formatYearlyAsMonthly,
  newCapabilitiesOf,
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
  // Ce bloc gardait auparavant l'absence de tarif. Les prix Creator ayant
  // été créés dans Stripe le 2026-08-10 (19 € / 190 €), il garde désormais
  // ce qui reste vrai : la cohérence entre ce qui est affiché et ce qui est
  // facturable.

  it("un tarif annuel ne va jamais sans son mensuel", () => {
    // Sinon l'onglet « Mensuel » afficherait « Bientôt » à côté d'un
    // annuel achetable, et `yearlySavingsPct` n'aurait aucune référence
    // pour calculer l'économie : le badge disparaîtrait sans raison
    // visible.
    for (const p of PLANS) {
      if (p.yearlyPriceCents !== null) {
        expect(p.priceCents, `${p.slug} : annuel posé sans mensuel`).not.toBeNull();
      }
    }
  });

  it("aucun montant absurde n'a pu se glisser dans le catalogue", () => {
    for (const p of PLANS) {
      for (const cents of [p.priceCents, p.yearlyPriceCents]) {
        if (cents === null) continue;
        // Des centimes, donc un entier : `19.9` viendrait d'une saisie en
        // euros, et facturerait 0,199 € au lieu de 19,90 €.
        expect(Number.isInteger(cents), `${p.slug} : ${cents} n'est pas un entier`).toBe(true);
        expect(cents, `${p.slug} : montant négatif`).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("Creator est vendable et son annuel est réellement avantageux", () => {
    const creator = PLANS.find((p) => p.slug === "creator")!;
    expect(formatPlanPrice(creator)).toBe("19,00 € / mois");
    expect(formatPlanPrice(creator, "yearly")).toBe("190,00 € / an");
    expect(formatYearlyAsMonthly(creator)).toBe("15,83 € / mois");
    expect(yearlySavingsPct(creator)).toBe(16);
  });

  it("Pro est vendable et coûte plus cher que Creator", () => {
    const creator = PLANS.find((p) => p.slug === "creator")!;
    const pro = PLANS.find((p) => p.slug === "pro")!;
    expect(formatPlanPrice(pro)).toBe("39,00 € / mois");
    expect(formatPlanPrice(pro, "yearly")).toBe("390,00 € / an");
    // Un palier supérieur moins cher que celui qu'il englobe serait une
    // inversion invisible au typecheck et visible sur un relevé bancaire.
    expect(pro.priceCents!).toBeGreaterThan(creator.priceCents!);
    expect(pro.yearlyPriceCents!).toBeGreaterThan(creator.yearlyPriceCents!);
  });

  it("les deux offres appliquent la même remise annuelle", () => {
    // Deux ratios différents donnent l'impression que les prix sont
    // improvisés — et obligent à réexpliquer la remise à chaque palier.
    const payants = PLANS.filter((p) => p.priceCents !== null && p.priceCents > 0);
    const remises = new Set(payants.map((p) => yearlySavingsPct(p)));
    expect(remises.size, `remises trouvées : ${[...remises].join(", ")}`).toBe(1);
  });

  it("le plan gratuit reste gratuit dans les deux périodicités", () => {
    const radar = PLANS.find((p) => p.slug === "radar")!;
    expect(formatPlanPrice(radar, "monthly")).toBe("Gratuit");
    expect(formatPlanPrice(radar, "yearly")).toBe("Gratuit");
  });
});

// Le paywall affichait, à tort, ce que le palier ajoute par rapport au
// palier juste en dessous — même pour un compte parti de plus bas. Un
// Radar qui bute sur une capacité Pro ne voyait que les 4 capacités
// propres à Pro, jamais les 4 de Creator qu'il gagne aussi en sautant
// directement dessus. Signalé par l'utilisateur : « ça débloque presque
// rien » à côté d'un plan gratuit qui affiche ses capacités en entier.
describe("capabilitiesGainedFrom", () => {
  it("un saut direct Radar → Pro inclut ce que Creator apporte aussi", () => {
    const depuisRadar = capabilitiesGainedFrom("radar", "pro");
    const depuisCreator = capabilitiesGainedFrom("creator", "pro");
    // Strictement plus, jamais égal : c'est exactement l'écart qui
    // manquait avant ce correctif.
    expect(depuisRadar.length).toBeGreaterThan(depuisCreator.length);
    for (const capacite of depuisCreator) {
      expect(depuisRadar).toContain(capacite);
    }
  });

  it("ne renvoie rien quand le palier visé n'apporte rien de plus", () => {
    expect(capabilitiesGainedFrom("pro", "pro")).toEqual([]);
    expect(capabilitiesGainedFrom("pro", "creator")).toEqual([]);
  });

  it("Radar vers Creator est identique à la vue palier-par-palier", () => {
    // Les deux fonctions doivent s'accorder au premier échelon : c'est là
    // qu'il n'y a pas de palier intermédiaire à rater.
    expect(capabilitiesGainedFrom("radar", "creator")).toEqual(
      newCapabilitiesOf("creator"),
    );
  });
});
