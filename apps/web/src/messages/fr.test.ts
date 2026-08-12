import { describe, expect, it } from "vitest";
import { CAPABILITY_INFO, FREE_LIMITS, PLANS } from "@kairos/shared";
import fr from "./fr.json";

// La page d'accueil portait sa propre description des offres, en dur :
// « Watchlist illimitée » pour le plan gratuit, alors que le catalogue le
// plafonne à 5 depuis la décision #70. Personne n'avait menti — la copie
// avait simplement cessé d'être vraie, et rien ne pouvait le signaler.
//
// Ces tests ne jugent pas la rédaction. Ils vérifient qu'aucune deuxième
// source de vérité ne réapparaît à côté du catalogue.

const home = fr.Home as Record<string, string>;

describe("les offres ne sont décrites qu'à un seul endroit", () => {
  it("aucune clé de traduction ne redécrit un plan", () => {
    // `<PlanCards />` dérive tout de `packages/shared/plans.ts`. Une clé
    // `planRadarFeature1` qui réapparaîtrait ici serait une copie destinée
    // à diverger — c'est exactement ce qui s'était produit.
    const offending = Object.keys(home).filter((k) => /^plan(Radar|Creator|Pro)/.test(k));
    expect(offending).toEqual([]);
  });

  it("aucun nom de plan n'est recopié dans une liste de fonctionnalités", () => {
    for (const plan of PLANS) {
      const key = `plan${plan.name}Feature1`;
      expect(home[key], key).toBeUndefined();
    }
  });
});

describe("les promesses de la page d'accueil restent tenables", () => {
  const allCopy = Object.values(home).join(" ").toLowerCase();

  it("ne promet rien d'illimité", () => {
    // Le plan gratuit a trois plafonds (watchlist, briefs, gains).
    // « Illimité » sur la page publique ne peut donc désigner que le
    // payant — et le dire sans le préciser attire sous un faux prétexte.
    expect(allCopy).not.toContain("illimité");
  });

  it("annonce le bon plafond quand elle cite le top gratuit", () => {
    // Si une phrase parle du « top N », ce N doit être celui appliqué.
    const mentions = Object.values(home).filter((v) => /top \d+/i.test(v));
    for (const line of mentions) {
      const n = Number(/top (\d+)/i.exec(line)![1]);
      expect(n, line).toBe(FREE_LIMITS.earningsTop);
    }
  });

  it("ne vend pas une fonctionnalité que le catalogue dit absente", () => {
    const soon = Object.values(CAPABILITY_INFO)
      .filter((c) => c.status === "soon")
      .map((c) => c.label.toLowerCase());
    for (const label of soon) {
      expect(allCopy, `« ${label} » est annoncée mais marquée à venir`).not.toContain(label);
    }
  });
});
