import type { ComplianceRule } from "@kairos/shared";

export interface ComplianceIssue {
  ruleId: string;
  severity: "warning" | "blocking";
  message: string;
  matchedText: string;
}

// Fonction pure — réutilisée par le brief du Lot 6 pour flaguer les
// affirmations risquées avant de montrer un script à l'utilisateur. Les
// règles viennent de config/complianceRules (Firestore), éditables par un
// admin sans redéploiement — jamais en dur ici.
export function evaluateCompliance(script: string, rules: ComplianceRule[]): ComplianceIssue[] {
  const issues: ComplianceIssue[] = [];
  for (const rule of rules) {
    let regex: RegExp;
    try {
      regex = new RegExp(rule.pattern, "i");
    } catch {
      // Règle mal formée côté config — on l'ignore plutôt que de faire
      // planter l'évaluation de tout le script.
      continue;
    }
    const match = script.match(regex);
    if (match) {
      issues.push({
        ruleId: rule.id,
        severity: rule.severity,
        message: rule.message,
        matchedText: match[0],
      });
    }
  }
  return issues;
}

export function hasBlockingIssues(issues: ComplianceIssue[]): boolean {
  return issues.some((issue) => issue.severity === "blocking");
}
