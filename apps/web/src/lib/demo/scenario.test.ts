import { describe, expect, it } from "vitest";
import { computeVerdict } from "@kairos/core";
import { productSnapshotSchema } from "@kairos/shared";
import { buildScenarioSnapshots, SCENARIO_PRESETS, type ScenarioParams } from "./scenario";

const TODAY = new Date("2026-08-05T12:00:00Z");
const preset = (id: string) => SCENARIO_PRESETS.find((p) => p.id === id)!.params;
const verdictOf = (p: ScenarioParams) => computeVerdict(buildScenarioSnapshots(p, TODAY));

describe("scénario interactif", () => {
  it("produit des relevés valides au regard du schéma", () => {
    for (const { params } of SCENARIO_PRESETS) {
      for (const snap of buildScenarioSnapshots(params, TODAY)) {
        expect(() => productSnapshotSchema.parse(snap)).not.toThrow();
      }
    }
  });

  // Sans bruit aléatoire : le visiteur bouge un curseur et doit pouvoir
  // attribuer le changement à ce curseur, pas se demander si c'est le
  // hasard.
  it("est déterministe", () => {
    const p = preset("montee");
    expect(buildScenarioSnapshots(p, TODAY)).toEqual(buildScenarioSnapshots(p, TODAY));
  });

  it("ne descend jamais sous deux relevés, même curseur au minimum", () => {
    expect(buildScenarioSnapshots({ ...preset("pepite"), days: 1 }, TODAY).length).toBe(2);
  });

  // Ce sont ces quatre résultats qui rendent la démonstration convaincante :
  // si les préréglages ne produisaient pas des verdicts contrastés, la page
  // ne montrerait rien.
  it("« la pépite » est jouable", () => {
    expect(verdictOf(preset("pepite")).verdict).toBe("entrer_maintenant");
  });

  it("« la ruée » ne l'est pas", () => {
    const v = verdictOf(preset("ruee"));
    expect(["risque", "eviter"]).toContain(v.verdict);
  });

  it("« trop tard » est détecté comme un déclin", () => {
    expect(verdictOf(preset("trop-tard")).phase).toBe("decline");
  });

  // Chacun des quatre verdicts possibles est atteignable en tapant sur un
  // préréglage : c'est ce qui rend la démonstration parlante en dix
  // secondes, sans lire une ligne.
  it("les quatre préréglages couvrent les quatre verdicts", () => {
    const verdicts = new Set(SCENARIO_PRESETS.map((p) => verdictOf(p.params).verdict));
    expect(verdicts).toEqual(
      new Set(["entrer_maintenant", "avec_un_angle", "risque", "eviter"]),
    );
  });

  // La propriété que le visiteur va tester en premier : pousser la
  // concurrence doit dégrader le verdict, sans rien changer d'autre.
  it("plus de concurrence dégrade le verdict, toutes choses égales", () => {
    const calme = verdictOf({ ...preset("montee"), competingShops: 3 });
    const bonde = verdictOf({ ...preset("montee"), competingShops: 38 });
    expect(bonde.saturationScore).toBeGreaterThan(calme.saturationScore);
  });

  it("une chute de prix marquée pousse aussi la saturation", () => {
    const stable = verdictOf({ ...preset("montee"), priceDropPct: 0 });
    const brade = verdictOf({ ...preset("montee"), priceDropPct: 35 });
    expect(brade.saturationScore).toBeGreaterThan(stable.saturationScore);
  });
});
