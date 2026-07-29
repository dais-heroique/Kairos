import { describe, expect, it } from "vitest";
import type { ComplianceRule } from "@kairos/shared";
import { evaluateCompliance, hasBlockingIssues } from "./evaluate-compliance";

const rules: ComplianceRule[] = [
  {
    id: "no-miracle-claim",
    market: "FR",
    pattern: "guéri[t]?\\s+en\\s+\\d+\\s+jours?",
    severity: "blocking",
    message: "Allégation santé non autorisée sans preuve médicale.",
  },
  {
    id: "disclose-partnership",
    market: "FR",
    pattern: "\\bcadeau\\b",
    severity: "warning",
    message: "Mentionner #partenariat si le produit a été offert.",
  },
];

describe("evaluateCompliance", () => {
  it("flags a script matching a blocking rule", () => {
    const issues = evaluateCompliance("Ce sérum vous guérit en 7 jours !", rules);
    expect(issues).toHaveLength(1);
    expect(issues[0]!.ruleId).toBe("no-miracle-claim");
    expect(issues[0]!.severity).toBe("blocking");
  });

  it("flags a script matching a warning rule", () => {
    const issues = evaluateCompliance("Merci pour ce cadeau incroyable", rules);
    expect(issues[0]!.severity).toBe("warning");
  });

  it("returns no issues for a clean script", () => {
    expect(evaluateCompliance("Ce produit est top pour le quotidien.", rules)).toEqual([]);
  });

  it("is case-insensitive", () => {
    const issues = evaluateCompliance("GUÉRIT EN 3 JOURS", rules);
    expect(issues).toHaveLength(1);
  });

  it("skips a malformed rule instead of crashing the whole evaluation", () => {
    const brokenRules: ComplianceRule[] = [
      { id: "broken", market: "FR", pattern: "(unclosed", severity: "warning", message: "x" },
      ...rules,
    ];
    const issues = evaluateCompliance("guérit en 5 jours", brokenRules);
    expect(issues.some((i) => i.ruleId === "no-miracle-claim")).toBe(true);
  });
});

describe("hasBlockingIssues", () => {
  it("is true when at least one issue is blocking", () => {
    expect(
      hasBlockingIssues([
        { ruleId: "a", severity: "warning", message: "", matchedText: "" },
        { ruleId: "b", severity: "blocking", message: "", matchedText: "" },
      ]),
    ).toBe(true);
  });

  it("is false when all issues are warnings", () => {
    expect(
      hasBlockingIssues([{ ruleId: "a", severity: "warning", message: "", matchedText: "" }]),
    ).toBe(false);
  });

  it("is false with no issues", () => {
    expect(hasBlockingIssues([])).toBe(false);
  });
});
