import { describe, expect, it } from "vitest";
import { computeVerdict, hasInsufficientHistory } from "@kairos/core";
import { productSnapshotSchema } from "@kairos/shared";
import {
  DEMO_PRODUCTS,
  DEMO_SHOPS,
  simulateSnapshots,
  type LifecycleProfile,
} from "./market-simulation";

// Ancre fixe : sans elle, les bornes de phase (span ≤ 14 jours, etc.)
// dépendraient du jour où les tests tournent.
const TODAY = new Date("2026-08-03T12:00:00Z");

function snapshotsFor(id: string) {
  const product = DEMO_PRODUCTS.find((p) => p.id === id);
  if (!product) throw new Error(`produit de démo inconnu : ${id}`);
  return simulateSnapshots(product, TODAY);
}

function verdictFor(id: string) {
  return computeVerdict(snapshotsFor(id));
}

describe("simulation de marché — forme des données", () => {
  it("produit des relevés valides au regard du schéma partagé", () => {
    for (const product of DEMO_PRODUCTS) {
      for (const snap of simulateSnapshots(product, TODAY)) {
        expect(() => productSnapshotSchema.parse(snap)).not.toThrow();
      }
    }
  });

  it("est déterministe — deux exécutions donnent le même marché", () => {
    const a = snapshotsFor("serum-niacinamide-10");
    const b = snapshotsFor("serum-niacinamide-10");
    expect(a).toEqual(b);
  });

  it("garde estSalesLow <= estSalesHigh et des avis jamais décroissants", () => {
    for (const product of DEMO_PRODUCTS) {
      const snaps = simulateSnapshots(product, TODAY);
      for (const s of snaps) expect(s.estSalesLow).toBeLessThanOrEqual(s.estSalesHigh);
      for (let i = 1; i < snaps.length; i++) {
        expect(snaps[i]!.reviewCount).toBeGreaterThanOrEqual(snaps[i - 1]!.reviewCount);
      }
    }
  });

  it("rattache chaque produit à une boutique existante", () => {
    const shopIds = new Set(DEMO_SHOPS.map((s) => s.id));
    for (const product of DEMO_PRODUCTS) {
      expect(shopIds.has(product.shopId)).toBe(true);
    }
  });

  it("n'a aucun identifiant de produit en double", () => {
    const ids = DEMO_PRODUCTS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// Le vrai test de réalisme : la phase n'est écrite nulle part dans les
// relevés. Si computeVerdict la retrouve, c'est que les courbes
// ressemblent à ce qu'elles prétendent être — et le jour où le moteur
// dérive, la démo le montre au lieu de le masquer.
describe("les moteurs retrouvent seuls la phase simulée", () => {
  const CASES: Array<[string, LifecycleProfile]> = [
    ["huile-ricin-cils-sourcils", "emergence"],
    ["serum-niacinamide-10", "growth"],
    ["lampe-coucher-soleil", "late_growth"],
    ["patchs-hydrocolloides", "maturity"],
    ["coque-magsafe-transparente", "decline"],
  ];

  for (const [id, expected] of CASES) {
    it(`${id} → phase "${expected}"`, () => {
      expect(verdictFor(id).phase).toBe(expected);
    });
  }
});

describe("les cas limites du produit sont réellement représentés", () => {
  it("un produit émergent peu concurrencé est jouable", () => {
    const v = verdictFor("brosse-anti-poils-chat");
    expect(v.verdict).toBe("entrer_maintenant");
    expect(v.saturationScore).toBeLessThan(35);
  });

  it("un produit mûr et saturé n'est jamais recommandé sans réserve", () => {
    const v = verdictFor("gua-sha-quartz-rose");
    expect(v.verdict).not.toBe("entrer_maintenant");
  });

  it("détecte la saturation brutale malgré une tendance de fond en hausse", () => {
    const v = verdictFor("masque-led-visage");
    expect(v.verdict === "risque" || v.verdict === "eviter").toBe(true);
    expect(v.reasoning.join(" ")).toMatch(/[Ss]aturation brutale/);
  });

  it("un produit tout juste saisi affiche « historique trop court »", () => {
    const snaps = snapshotsFor("batterie-externe-10000mah");
    expect(hasInsufficientHistory(snaps)).toBe(true);
    const v = computeVerdict(snaps);
    expect(v.verdict).toBe("risque");
    expect(v.reasoning.join(" ")).toMatch(/[Hh]istorique trop court/);
    expect(v.windowDaysRemaining.confidence).toBeLessThan(0.1);
  });

  it("une série trouée signale le trou et perd de la confiance", () => {
    const v = verdictFor("aspirateur-main-voiture");
    expect(v.reasoning.join(" ")).toMatch(/[Tt]rou de collecte/);
  });

  it("couvre les quatre verdicts possibles, pas seulement les flatteurs", () => {
    const verdicts = new Set(DEMO_PRODUCTS.map((p) => computeVerdict(simulateSnapshots(p, TODAY)).verdict));
    expect(verdicts).toContain("entrer_maintenant");
    expect(verdicts).toContain("avec_un_angle");
    expect(verdicts).toContain("risque");
    expect(verdicts).toContain("eviter");
  });
});
