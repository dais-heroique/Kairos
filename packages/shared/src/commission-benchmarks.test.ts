import { describe, expect, it } from "vitest";
import {
  COMMISSION_BENCHMARKS,
  DEFAULT_COMMISSION_BENCHMARK,
  estimatedCommissionFor,
  findCommissionBenchmark,
  resolveCommission,
} from "./commission-benchmarks";

// Ces taux ne sont pas mesurés : TikTok Shop n'expose pas les commissions
// d'affiliation. Ce sont des médianes de marché, et tout l'enjeu est
// qu'elles ne puissent jamais passer pour un relevé.

describe("findCommissionBenchmark", () => {
  it("rattache un produit à sa famille par le titre", () => {
    expect(findCommissionBenchmark("Sérum niacinamide 10 %").family).toBe("Beauté & soin");
    expect(
      findCommissionBenchmark("JLab JBuds Lux ANC Wireless Bluetooth Headphones").family,
    ).toBe("Tech & électronique");
  });

  it("retombe sur la moyenne toutes catégories quand rien ne correspond", () => {
    expect(findCommissionBenchmark("Objet non identifié 42")).toBe(
      DEFAULT_COMMISSION_BENCHMARK,
    );
  });

  it("le titre prime sur le mot-clé de collecte", () => {
    // Le mot-clé décrit la recherche, pas le produit : un casque remonté
    // par une requête « beauté » reste un produit tech.
    expect(findCommissionBenchmark("Bluetooth headphone", "skincare").family).toBe(
      "Tech & électronique",
    );
  });
});

describe("estimatedCommissionFor", () => {
  it("marque toujours le résultat comme estimé", () => {
    expect(estimatedCommissionFor("Sérum visage").isEstimated).toBe(true);
    expect(estimatedCommissionFor("Objet non identifié 42").isEstimated).toBe(true);
  });

  it("ne renvoie jamais un taux nul — sinon on n'aurait rien résolu", () => {
    for (const bench of [...COMMISSION_BENCHMARKS, DEFAULT_COMMISSION_BENCHMARK]) {
      expect(bench.ratePct, bench.family).toBeGreaterThan(0);
      expect(bench.lowPct).toBeLessThanOrEqual(bench.ratePct);
      expect(bench.highPct).toBeGreaterThanOrEqual(bench.ratePct);
    }
  });
});

describe("resolveCommission", () => {
  const releve = {
    ratePct: 27,
    isOpenCollab: true,
    isTargetedOnly: false,
    isEstimated: false,
  };

  it("garde intact un taux réellement renseigné", () => {
    expect(resolveCommission(releve, "Sérum visage")).toEqual(releve);
  });

  it("comble une absence par le barème, en le marquant", () => {
    const result = resolveCommission(null, "Sérum niacinamide");
    expect(result.ratePct).toBe(19);
    expect(result.isEstimated).toBe(true);
  });

  it("traite un zéro stocké comme une absence", () => {
    // C'est le cas réel : les documents écrits avant l'introduction du
    // barème portent `ratePct: 0`. Sans ce traitement, ils resteraient
    // « inconnus » jusqu'à une recollecte.
    const result = resolveCommission(
      { ratePct: 0, isOpenCollab: false, isTargetedOnly: false, isEstimated: false },
      "Bluetooth headphone",
    );
    expect(result.ratePct).toBe(8);
    expect(result.isEstimated).toBe(true);
  });

  it("n'écrase pas un taux bas mais réel", () => {
    const bas = { ...releve, ratePct: 3 };
    expect(resolveCommission(bas, "Bluetooth headphone").ratePct).toBe(3);
  });
});
