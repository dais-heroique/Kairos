import { z } from "zod";

// Taxonomie figée — utilisée par le pipeline Créa DNA (Gemini) et les briefs
// Claude. Ne pas étendre sans mettre à jour les deux prompts et les fixtures
// de packages/core.
export const HOOK_TYPES = [
  "probleme_agitation",
  "avant_apres",
  "pov",
  "reaction_choc",
  "prix_choc",
  "absurde_pattern_interrupt",
  "autorite_expert",
  "temoignage",
  "unboxing",
  "tutoriel_direct",
  "comparaison",
  "objection_frontale",
  "storytime",
  "asmr_sensoriel",
] as const;

export const hookTypeSchema = z.enum(HOOK_TYPES);
export type HookType = z.infer<typeof hookTypeSchema>;
