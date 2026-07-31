import { z } from "zod";
import { marketSchema } from "./market";

// config/complianceRules — éditable par un admin sans redéploiement (voir
// firestore.rules, règle spécifique plus précise que le config/{docId}
// générique en lecture seule).
export const complianceRuleSchema = z.object({
  id: z.string(),
  market: marketSchema,
  // Regex (sans délimiteurs), testée insensible à la casse contre le
  // script généré — voir packages/core/src/compliance/evaluate-compliance.ts.
  pattern: z.string(),
  severity: z.enum(["warning", "blocking"]),
  message: z.string(),
});
export type ComplianceRule = z.infer<typeof complianceRuleSchema>;

export const complianceRulesDocSchema = z.object({
  rules: z.array(complianceRuleSchema),
  updatedAt: z.string().datetime(),
});
export type ComplianceRulesDoc = z.infer<typeof complianceRulesDocSchema>;
