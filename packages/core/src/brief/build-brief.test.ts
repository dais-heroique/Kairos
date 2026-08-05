import { describe, expect, it } from "vitest";
import {
  briefSchema,
  DEFAULT_COMPLIANCE_RULES_FR,
  type Phase,
  type ProductVerdict,
} from "@kairos/shared";
import { evaluateCompliance, hasBlockingIssues } from "../compliance/evaluate-compliance";
import { buildBrief, type BuildBriefInput } from "./build-brief";

function verdict(over: Partial<ProductVerdict> = {}): ProductVerdict {
  return {
    phase: "growth",
    daysInPhase: 12,
    saturationScore: 25,
    windowDaysRemaining: { low: 30, high: 70, confidence: 0.8 },
    marginLowPct: 40,
    marginHighPct: 70,
    verdict: "entrer_maintenant",
    reasoning: ["test"],
    computedAt: new Date().toISOString(),
    ...over,
  };
}

function input(over: Partial<BuildBriefInput> = {}): BuildBriefInput {
  return {
    productId: "serum-niacinamide-10",
    title: "Sérum niacinamide 10% (30 ml)",
    category: "Beauté & soins",
    priceCents: 1690,
    commissionRatePct: 28,
    verdict: verdict(),
    nicheBucket: "beaute",
    followerRange: "5k_20k",
    complianceRules: DEFAULT_COMPLIANCE_RULES_FR,
    now: new Date("2026-08-04T09:00:00Z"),
    ...over,
  };
}

describe("buildBrief", () => {
  it("produit un brief conforme au schéma partagé", () => {
    expect(() => briefSchema.parse(buildBrief(input()))).not.toThrow();
  });

  it("est déterministe à entrée égale", () => {
    expect(buildBrief(input())).toEqual(buildBrief(input()));
  });

  it("expire au bout de la durée de cache prévue", () => {
    const brief = buildBrief(input());
    expect(brief.generatedAt).toBe("2026-08-04T09:00:00.000Z");
    expect(brief.cacheExpiresAt).toBe("2026-08-11T09:00:00.000Z");
  });

  // C'est la propriété qui compte : le brief est censé protéger le
  // créateur, il ne peut donc pas produire lui-même un script que son
  // propre garde-fou refuserait.
  it("génère un script qui passe son propre contrôle de conformité", () => {
    const phases: Phase[] = ["emergence", "growth", "late_growth", "maturity", "decline"];
    for (const phase of phases) {
      const brief = buildBrief(input({ verdict: verdict({ phase }) }));
      const issues = evaluateCompliance(brief.script, DEFAULT_COMPLIANCE_RULES_FR);
      expect(hasBlockingIssues(issues)).toBe(false);
    }
  });

  it("inscrit la mention publicitaire dans le script, pas dans un conseil", () => {
    expect(buildBrief(input()).script).toMatch(/[Cc]ollaboration commerciale/);
  });

  // L'angle dépend du moment du cycle : arriver en premier ou en
  // cinquantième n'appelle pas la même vidéo.
  it("choisit des accroches différentes selon la phase", () => {
    const early = buildBrief(input({ verdict: verdict({ phase: "emergence" }) }));
    const late = buildBrief(input({ verdict: verdict({ phase: "maturity" }) }));
    expect(early.hooks.map((h) => h.type)).not.toEqual(late.hooks.map((h) => h.type));
  });

  it("ajoute un plan différenciant quand le produit est déjà installé", () => {
    const early = buildBrief(input({ verdict: verdict({ phase: "emergence" }) }));
    const late = buildBrief(input({ verdict: verdict({ phase: "late_growth" }) }));
    expect(late.shotList.length).toBeGreaterThan(early.shotList.length);
    expect(late.shotList.some((s) => /diff[ée]renciant/i.test(s.description))).toBe(true);
  });

  it("avertit de ne pas copier le format quand la saturation est forte", () => {
    const brief = buildBrief(input({ verdict: verdict({ saturationScore: 70 }) }));
    expect(brief.doNots.some((d) => /satur/i.test(d))).toBe(true);
  });

  it("interdit de présenter un produit en déclin comme une nouveauté", () => {
    const brief = buildBrief(input({ verdict: verdict({ phase: "decline" }) }));
    expect(brief.doNots.some((d) => /nouveaut[ée]/i.test(d))).toBe(true);
  });

  // Les interdits sont dérivés des règles réellement contrôlées, pas
  // d'une liste parallèle qui finirait par diverger.
  it("dérive ses interdits des règles bloquantes en vigueur", () => {
    const brief = buildBrief(input());
    const blocking = DEFAULT_COMPLIANCE_RULES_FR.filter((r) => r.severity === "blocking");
    for (const rule of blocking) {
      expect(brief.doNots).toContain(rule.message);
    }
  });

  it("adapte les objections à la famille de produit", () => {
    const beaute = buildBrief(input({ category: "Beauté & soins" }));
    const tech = buildBrief(input({ category: "Téléphonie & électronique" }));
    expect(beaute.objections).not.toEqual(tech.objections);
    expect(tech.objections.join(" ")).toMatch(/compatible|batterie/i);
  });

  it("retombe sur des objections génériques pour une catégorie inconnue", () => {
    const brief = buildBrief(input({ category: "Catégorie totalement inédite" }));
    expect(brief.objections.length).toBeGreaterThan(0);
  });

  // Aucun commentaire réel n'est collecté : le dire, plutôt que de laisser
  // croire que ces objections viennent du terrain.
  it("annonce que les objections sont génériques", () => {
    expect(buildBrief(input()).objectionsSource).toBe("generic");
  });

  it("abrège un titre à rallonge dans les accroches", () => {
    const brief = buildBrief(
      input({ title: "Sérum visage niacinamide zinc 10% flacon pompe 30 ml peaux mixtes" }),
    );
    for (const hook of brief.hooks) {
      expect(hook.spokenLine.length).toBeLessThan(120);
    }
  });
});

// Lu à l'écran : « Huile de ricin cils & sourcils » devenait « Huile de
// ricin cils », qui s'entend comme une phrase coupée en plein milieu.
describe("abrègement des titres pour l'oral", () => {
  // Phase émergence : ses accroches ("pov", "unboxing") reprennent le
  // titre abrégé mot pour mot, ce qui rend la coupure directement lisible.
  const shortOf = (title: string) =>
    buildBrief(input({ title, verdict: verdict({ phase: "emergence" }) })).hooks[0]!.spokenLine;

  it("ne termine pas sur un mot de liaison", () => {
    const line = shortOf("Coffret soin visage et corps hydratant intense");
    expect(line).not.toMatch(/\bet\b[\s.»]*$/);
    expect(line).not.toMatch(/\bde\s*\.?\s*$/);
  });

  it("retire le conditionnement, inutile à l'oral", () => {
    expect(shortOf("Sérum niacinamide 30 ml peaux mixtes")).not.toMatch(/30 ml/);
  });

  it("laisse intact un titre déjà court", () => {
    expect(shortOf("Gua sha quartz")).toMatch(/Gua sha quartz/);
  });
});
