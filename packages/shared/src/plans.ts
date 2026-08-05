import type { PlanSlug } from "./user";

// Catalogue des offres — source unique.
//
// Le problème qu'il résout : la page d'accueil listait les fonctionnalités
// à la main dans les fichiers de traduction, pendant qu'`entitlements.ts`
// décidait de son côté qui a droit à quoi. Rien ne garantissait que les
// deux disent la même chose, et une page qui promet plus que l'application
// ne délivre est une promesse non tenue payée par l'utilisateur.
//
// Ici, chaque ligne affichée est reliée à la capacité qui la gouverne
// (`gate`). Un test vérifie que toute capacité est bien annoncée quelque
// part, et qu'aucune ligne ne prétend débloquer une capacité que le plan
// n'a pas.

/**
 * Capacités vendables. Une seule liste, utilisée par les droits
 * (`entitlementsOf`) comme par l'affichage des offres.
 */
export const CAPABILITIES = [
  "rankings",
  "earningsTop10",
  "earningsAll",
  "watchlist",
  "simulator",
  "productHistory",
  "brief",
  "alerts",
  "rankingArchive",
] as const;
export type Capability = (typeof CAPABILITIES)[number];

export const CAPABILITY_LABELS: Record<Capability, string> = {
  rankings: "Classements complets, verdict sur chaque produit",
  earningsTop10: "Tes gains estimés sur le top 10",
  earningsAll: "Tes gains estimés sur tous les produits",
  watchlist: "Watchlist illimitée, du repérage à la publication",
  simulator: "Simulateur de gains",
  productHistory: "Historique jour par jour et raisonnement détaillé",
  brief: "Brief de tournage : accroches, script, téléprompteur",
  alerts: "Alertes quand une fenêtre se referme",
  rankingArchive: "Archive des classements passés",
};

/**
 * Ce que chaque plan débloque. `radar` est volontairement généreux : un
 * plan gratuit qui ne sert à rien ne convertit personne, il fait juste
 * partir les gens. On retient les *gains détaillés* et la *production de
 * contenu*, pas l'accès à l'information.
 */
export const CAPABILITIES_BY_PLAN: Record<PlanSlug, readonly Capability[]> = {
  radar: ["rankings", "earningsTop10", "watchlist", "simulator"],
  creator: [
    "rankings",
    "earningsTop10",
    "earningsAll",
    "watchlist",
    "simulator",
    "productHistory",
    "brief",
    "alerts",
  ],
  pro: [...CAPABILITIES],
};

export interface PlanDefinition {
  slug: PlanSlug;
  name: string;
  /**
   * Prix mensuel en centimes, ou `null` tant qu'il n'est pas arrêté.
   * `null` fait afficher « bientôt » plutôt qu'un montant inventé —
   * annoncer un tarif qu'on ne peut pas encaisser serait pire que de ne
   * rien annoncer.
   */
  priceCents: number | null;
  tagline: string;
  /** Ce que ce plan apporte *en plus* du précédent. */
  highlight: string;
  popular: boolean;
}

export const PLANS: PlanDefinition[] = [
  {
    slug: "radar",
    name: "Radar",
    priceCents: 0,
    tagline: "Pour voir si l'outil te parle",
    highlight: "Tout le classement, verdict compris",
    popular: false,
  },
  {
    slug: "creator",
    name: "Creator",
    priceCents: null,
    tagline: "Pour qui poste chaque semaine",
    highlight: "Les gains sur tout, l'historique et le brief de tournage",
    popular: true,
  },
  {
    slug: "pro",
    name: "Pro",
    priceCents: null,
    tagline: "Pour en faire un vrai revenu",
    highlight: "L'archive des classements, pour suivre un produit dans le temps",
    popular: false,
  },
];

export function planBySlug(slug: PlanSlug): PlanDefinition {
  return PLANS.find((p) => p.slug === slug)!;
}

/** Capacités qu'un plan apporte et que le précédent n'avait pas. */
export function newCapabilitiesOf(slug: PlanSlug): Capability[] {
  const index = PLANS.findIndex((p) => p.slug === slug);
  if (index <= 0) return [...CAPABILITIES_BY_PLAN[slug]];
  const previous = new Set(CAPABILITIES_BY_PLAN[PLANS[index - 1]!.slug]);
  return CAPABILITIES_BY_PLAN[slug].filter((c) => !previous.has(c));
}

/** Le premier plan qui débloque cette capacité — ce qu'il faut proposer. */
export function planUnlocking(capability: Capability): PlanDefinition {
  return PLANS.find((p) => CAPABILITIES_BY_PLAN[p.slug].includes(capability)) ?? PLANS[0]!;
}

export function formatPlanPrice(plan: PlanDefinition): string {
  if (plan.priceCents === 0) return "Gratuit";
  if (plan.priceCents === null) return "Bientôt";
  return `${(plan.priceCents / 100).toFixed(2).replace(".", ",")} € / mois`;
}
