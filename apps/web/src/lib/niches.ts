// Liste de niches proposées à l'onboarding — pas un enum figé (contrairement
// aux hooks de packages/shared) : profile.niches accepte n'importe quelle
// chaîne, cette liste n'est qu'une commodité d'UI.
export const NICHE_OPTIONS = [
  "beaute",
  "mode",
  "maison",
  "cuisine",
  "tech",
  "fitness",
  "bebe_enfant",
  "animaux",
  "bien_etre",
  "bijoux_accessoires",
] as const;

export const NICHE_LABELS: Record<(typeof NICHE_OPTIONS)[number], string> = {
  beaute: "Beauté",
  mode: "Mode",
  maison: "Maison",
  cuisine: "Cuisine",
  tech: "Tech & gadgets",
  fitness: "Fitness & sport",
  bebe_enfant: "Bébé & enfant",
  animaux: "Animaux",
  bien_etre: "Bien-être",
  bijoux_accessoires: "Bijoux & accessoires",
};
