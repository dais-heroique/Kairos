import type { PlanSlug, User } from "./user";

// Un seul endroit décide de ce à quoi un compte a droit. Avant, la question
// « ce compte voit-il tout ? » était réécrite à la main dans chaque
// composant (`plan.slug === "radar"`), ce qui garantit qu'un jour l'un
// d'eux diverge des autres.

/**
 * Comptes qui voient tout, indépendamment de leur abonnement : le compte
 * fondateur du projet. Il n'est pas question de lui faire payer son propre
 * outil, ni de bricoler son document Firestore — `plan` est délibérément
 * non modifiable par le client (`planUnchanged()` dans firestore.rules), et
 * le contourner ouvrirait exactement la faille que cette règle ferme.
 *
 * L'accès est donc dérivé, jamais stocké : le plan reste ce qu'il est,
 * seule la lecture des droits change.
 */
export const FOUNDER_EMAILS: readonly string[] = ["contact.conforva@gmail.com"];

/** Ordre croissant de richesse fonctionnelle. */
const PLAN_RANK: Record<PlanSlug, number> = { radar: 0, creator: 1, pro: 2 };

export interface Entitlements {
  /** Tous les classements en entier, sans gain masqué. */
  fullRankings: boolean;
  /** Fiches produit détaillées (historique, raisonnement du verdict). */
  productDetail: boolean;
  /** Alertes sur les mouvements de la watchlist. */
  alerts: boolean;
  /** Générations de brief IA par mois (voir packages/ai-gateway). */
  monthlyBriefs: number;
  /** Ce que l'utilisateur doit voir écrit à l'écran. */
  label: string;
}

const BY_PLAN: Record<PlanSlug, Entitlements> = {
  radar: {
    fullRankings: false,
    productDetail: false,
    alerts: false,
    monthlyBriefs: 3,
    label: "Radar (gratuit)",
  },
  creator: {
    fullRankings: true,
    productDetail: true,
    alerts: true,
    monthlyBriefs: 60,
    label: "Creator",
  },
  pro: {
    fullRankings: true,
    productDetail: true,
    alerts: true,
    monthlyBriefs: 200,
    label: "Pro",
  },
};

const FOUNDER: Entitlements = {
  fullRankings: true,
  productDetail: true,
  alerts: true,
  monthlyBriefs: BY_PLAN.pro.monthlyBriefs,
  label: "Accès fondateur",
};

export function isFounder(email: string | null | undefined): boolean {
  if (!email) return false;
  return FOUNDER_EMAILS.includes(email.trim().toLowerCase());
}

/**
 * Droits effectifs d'un compte. `user` peut être nul le temps que le
 * document Firestore arrive : on retombe alors sur le plan gratuit, jamais
 * sur un accès ouvert — se tromper dans ce sens est le seul qui coûte.
 */
export function entitlementsOf(user: User | null | undefined): Entitlements {
  if (!user) return BY_PLAN.radar;
  if (user.role === "admin" || isFounder(user.email)) return FOUNDER;

  // Un abonnement résilié ou impayé redescend au plan gratuit, même si le
  // slug est resté sur "pro".
  const active = user.plan.status === "active" || user.plan.status === "trialing";
  return active ? BY_PLAN[user.plan.slug] : BY_PLAN.radar;
}

/** Vrai si le compte atteint au moins le niveau demandé. */
export function hasAtLeastPlan(user: User | null | undefined, minimum: PlanSlug): boolean {
  if (!user) return PLAN_RANK[minimum] === 0;
  if (user.role === "admin" || isFounder(user.email)) return true;
  const active = user.plan.status === "active" || user.plan.status === "trialing";
  if (!active) return PLAN_RANK[minimum] === 0;
  return PLAN_RANK[user.plan.slug] >= PLAN_RANK[minimum];
}
