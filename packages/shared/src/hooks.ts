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

/**
 * Ce qu'on écrit à l'écran pour chaque type d'accroche.
 *
 * Les identifiants ci-dessus sont des clés techniques, partagées avec les
 * prompts Gemini et Claude. Affichés tels quels — c'était le cas dans le
 * brief, via un `type.replace(/_/g, " ")` — ils donnent « REACTION CHOC »
 * ou « ABSURDE PATTERN INTERRUPT » : du jargon interne, en capitales, dans
 * une page censée expliquer comment tourner une vidéo.
 *
 * Le libellé dit ce que la personne doit *faire*, pas comment la catégorie
 * s'appelle dans la base.
 */
export const HOOK_LABELS: Record<HookType, string> = {
  probleme_agitation: "Le problème d'abord",
  avant_apres: "Avant / après",
  pov: "POV",
  reaction_choc: "Réaction à chaud",
  prix_choc: "Le prix qui surprend",
  absurde_pattern_interrupt: "Coupure d'attention",
  autorite_expert: "L'avis qui fait autorité",
  temoignage: "Témoignage",
  unboxing: "Ouverture du colis",
  tutoriel_direct: "Tuto direct",
  comparaison: "Comparaison",
  objection_frontale: "L'objection en face",
  storytime: "Storytime",
  asmr_sensoriel: "Sensoriel / ASMR",
};

/** Libellé lisible d'un type d'accroche. */
export function hookLabel(type: HookType): string {
  return HOOK_LABELS[type];
}
