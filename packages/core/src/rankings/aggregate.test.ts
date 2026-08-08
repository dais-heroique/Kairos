import { describe, expect, it } from "vitest";
import {
  aggregateCategories,
  aggregateShops,
  selectNewcomers,
  type AggregableProduct,
} from "./aggregate";

function product(overrides: Partial<AggregableProduct> = {}): AggregableProduct {
  return {
    id: "p1",
    shopId: "boutique-a",
    shopName: "Boutique A",
    priceCents: 1990,
    soldTotal: 100,
    groupKey: "sérum visage",
    firstSeenAt: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("aggregateShops", () => {
  it("regroupe par boutique et classe par ventes", () => {
    const items = aggregateShops([
      product({ id: "a", shopId: "s1", shopName: "Petite", soldTotal: 10 }),
      product({ id: "b", shopId: "s2", shopName: "Grosse", soldTotal: 500 }),
      product({ id: "c", shopId: "s2", shopName: "Grosse", soldTotal: 300 }),
    ]);

    expect(items.map((i) => i.id)).toEqual(["s2", "s1"]);
    expect(items[0]).toMatchObject({ rank: 1, title: "Grosse", productCount: 2, soldTotal: 800 });
    expect(items[1]).toMatchObject({ rank: 2, title: "Petite", productCount: 1 });
  });

  it("ignore les produits sans boutique plutôt que d'inventer un groupe", () => {
    const items = aggregateShops([product({ shopId: null }), product({ id: "b", shopId: "s1" })]);
    expect(items).toHaveLength(1);
    expect(items[0]!.id).toBe("s1");
  });

  // Les 90 produits Apify n'ont aucune donnée de ventes : si `soldTotal`
  // absent valait 0 pour tout le monde, le tri ne départagerait plus rien
  // et l'ordre serait celui d'arrivée. Le nombre de produits, lui, est
  // mesuré.
  it("retombe sur le nombre de produits quand les ventes sont inconnues", () => {
    const items = aggregateShops([
      product({ id: "a", shopId: "seule", soldTotal: null }),
      product({ id: "b", shopId: "grosse", soldTotal: null }),
      product({ id: "c", shopId: "grosse", soldTotal: null }),
      product({ id: "d", shopId: "grosse", soldTotal: null }),
    ]);

    expect(items.map((i) => i.id)).toEqual(["grosse", "seule"]);
    expect(items[0]!.soldTotal).toBe(0);
  });

  it("calcule le prix moyen du catalogue observé", () => {
    const items = aggregateShops([
      product({ id: "a", shopId: "s", priceCents: 1000 }),
      product({ id: "b", shopId: "s", priceCents: 3000 }),
    ]);
    expect(items[0]!.priceCents).toBe(2000);
  });
});

describe("aggregateCategories", () => {
  it("regroupe par clé de regroupement", () => {
    const items = aggregateCategories([
      product({ id: "a", groupKey: "beauté", soldTotal: 5 }),
      product({ id: "b", groupKey: "cuisine", soldTotal: 50 }),
      product({ id: "c", groupKey: "cuisine", soldTotal: 20 }),
    ]);

    expect(items.map((i) => i.title)).toEqual(["cuisine", "beauté"]);
    expect(items[0]!.productCount).toBe(2);
  });

  it("laisse de côté un produit sans clé au lieu de le ranger n'importe où", () => {
    expect(aggregateCategories([product({ groupKey: null })])).toHaveLength(0);
  });
});

describe("selectNewcomers", () => {
  const maintenant = "2026-08-08T12:00:00.000Z";

  it("ne garde que les produits vus dans la fenêtre", () => {
    const retenus = selectNewcomers(
      [
        product({ id: "vieux", firstSeenAt: "2026-06-01T00:00:00.000Z" }),
        product({ id: "recent", firstSeenAt: "2026-08-06T00:00:00.000Z" }),
      ],
      7,
      maintenant,
    );

    expect(retenus.map((p) => p.id)).toEqual(["recent"]);
  });

  it("classe les nouveautés par ventes — celle qui part fort d'abord", () => {
    const retenus = selectNewcomers(
      [
        product({ id: "molle", firstSeenAt: "2026-08-06T00:00:00.000Z", soldTotal: 3 }),
        product({ id: "forte", firstSeenAt: "2026-08-07T00:00:00.000Z", soldTotal: 900 }),
      ],
      7,
      maintenant,
    );

    expect(retenus.map((p) => p.id)).toEqual(["forte", "molle"]);
  });

  it("exclut un produit dont la date de découverte est inconnue ou illisible", () => {
    const retenus = selectNewcomers(
      [
        product({ id: "sans-date", firstSeenAt: null }),
        product({ id: "date-cassee", firstSeenAt: "pas une date" }),
      ],
      7,
      maintenant,
    );

    expect(retenus).toHaveLength(0);
  });
});
