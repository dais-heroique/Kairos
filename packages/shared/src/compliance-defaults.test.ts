import { describe, expect, it } from "vitest";
import { complianceRuleSchema } from "./compliance";
import { DEFAULT_COMPLIANCE_RULES_FR, defaultComplianceRulesDoc } from "./compliance-defaults";

// Ces règles finissent dans un document Firestore lu par
// evaluateCompliance(), qui compile chaque `pattern` en RegExp. Une regex
// mal formée y est ignorée en silence : la règle disparaîtrait sans que
// personne ne s'en aperçoive. D'où la vérification ici.
describe("règles de conformité FR par défaut", () => {
  it("respecte le schéma partagé", () => {
    for (const rule of DEFAULT_COMPLIANCE_RULES_FR) {
      expect(() => complianceRuleSchema.parse(rule)).not.toThrow();
    }
  });

  it("n'a que des expressions régulières compilables", () => {
    for (const rule of DEFAULT_COMPLIANCE_RULES_FR) {
      expect(() => new RegExp(rule.pattern, "i")).not.toThrow();
    }
  });

  it("n'a aucun identifiant en double", () => {
    const ids = DEFAULT_COMPLIANCE_RULES_FR.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("explique toujours pourquoi, pas seulement quoi", () => {
    for (const rule of DEFAULT_COMPLIANCE_RULES_FR) {
      expect(rule.message.length).toBeGreaterThan(40);
    }
  });

  // Un garde-fou qui crie sur tout finit ignoré : le blocage reste réservé
  // à ce qui expose réellement le créateur.
  it("réserve le blocage à une minorité de règles", () => {
    const blocking = DEFAULT_COMPLIANCE_RULES_FR.filter((r) => r.severity === "blocking");
    expect(blocking.length).toBeGreaterThan(0);
    expect(blocking.length).toBeLessThan(DEFAULT_COMPLIANCE_RULES_FR.length / 2);
  });

  it("produit un document horodaté prêt à écrire", () => {
    const doc = defaultComplianceRulesDoc(new Date("2026-08-04T10:00:00Z"));
    expect(doc.updatedAt).toBe("2026-08-04T10:00:00.000Z");
    expect(doc.rules).toHaveLength(DEFAULT_COMPLIANCE_RULES_FR.length);
  });
});
