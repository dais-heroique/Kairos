import { z } from "zod";
import { estimateMethodSchema } from "./estimate";

export const PHASES = [
  "emergence",
  "growth",
  "late_growth",
  "maturity",
  "decline",
] as const;
export const phaseSchema = z.enum(PHASES);
export type Phase = z.infer<typeof phaseSchema>;

export const VERDICT_LABELS = [
  "entrer_maintenant",
  "avec_un_angle",
  "risque",
  "eviter",
] as const;
export const verdictLabelSchema = z.enum(VERDICT_LABELS);
export type VerdictLabel = z.infer<typeof verdictLabelSchema>;

// Sortie du moteur packages/core/verdict — fonctions pures, testées sur
// fixtures avant toute UI (Phase 2). reasoning[] doit être en français
// lisible ; si un verdict ne peut pas s'expliquer en une phrase, on ne
// l'affiche pas.
export const productVerdictSchema = z.object({
  phase: phaseSchema,
  daysInPhase: z.number().int().nonnegative(),
  saturationScore: z.number().min(0).max(100),
  windowDaysRemaining: z.object({
    low: z.number().int().nonnegative(),
    high: z.number().int().nonnegative(),
    confidence: z.number().min(0).max(1),
  }),
  marginLowPct: z.number(),
  marginHighPct: z.number(),
  verdict: verdictLabelSchema,
  reasoning: z.array(z.string()).min(1),
  computedAt: z.string().datetime(),
});
export type ProductVerdict = z.infer<typeof productVerdictSchema>;

export const productEstimatesSchema = z.object({
  salesLow: z.number().nonnegative(),
  salesHigh: z.number().nonnegative(),
  confidence: z.number().min(0).max(1),
  method: estimateMethodSchema,
});
export type ProductEstimates = z.infer<typeof productEstimatesSchema>;
