import { CAPABILITIES, CAPABILITIES_BY_PLAN, type Capability } from "./plans";
import type { PlanSlug, User } from "./user";

// Un seul endroit décide de ce à quoi un compte a droit, et il lit le
// catalogue des offres (`plans.ts`). Les fonctionnalités annoncées sur la
// page de tarifs et celles réellement appliquées dans l'app ne peuvent
// donc pas diverger : c'est la même liste.

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
  /** Plan effectivement appliqué, après vérification du statut d'abonnement. */
  effectivePlan: PlanSlug;
  /** Ce que l'utilisateur doit voir écrit à l'écran. */
  label: string;
  /** Vrai si l'accès vient du statut fondateur/admin et non d'un abonnement. */
  isFounderAccess: boolean;
  /** Test unitaire d'une capacité — le seul point d'entrée des composants. */
  can: (capability: Capability) => boolean;
  /** Générations de brief IA par mois (voir packages/ai-gateway). */
  monthlyBriefs: number;
}

const MONTHLY_BRIEFS: Record<PlanSlug, number> = { radar: 3, creator: 60, pro: 200 };

const PLAN_LABELS: Record<PlanSlug, string> = {
  radar: "Radar (gratuit)",
  creator: "Creator",
  pro: "Pro",
};

function build(plan: PlanSlug, founder: boolean): Entitlements {
  const granted = new Set<Capability>(
    founder ? CAPABILITIES : CAPABILITIES_BY_PLAN[plan],
  );
  return {
    effectivePlan: plan,
    label: founder ? "Accès fondateur" : PLAN_LABELS[plan],
    isFounderAccess: founder,
    can: (capability) => granted.has(capability),
    monthlyBriefs: founder ? MONTHLY_BRIEFS.pro : MONTHLY_BRIEFS[plan],
  };
}

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
  if (!user) return build("radar", false);
  if (user.role === "admin" || isFounder(user.email)) return build(user.plan.slug, true);

  // Un abonnement résilié ou impayé redescend au plan gratuit, même si le
  // slug est resté sur "pro".
  const active = user.plan.status === "active" || user.plan.status === "trialing";
  return build(active ? user.plan.slug : "radar", false);
}

/** Vrai si le compte atteint au moins le niveau demandé. */
export function hasAtLeastPlan(user: User | null | undefined, minimum: PlanSlug): boolean {
  if (!user) return PLAN_RANK[minimum] === 0;
  if (user.role === "admin" || isFounder(user.email)) return true;
  const active = user.plan.status === "active" || user.plan.status === "trialing";
  if (!active) return PLAN_RANK[minimum] === 0;
  return PLAN_RANK[user.plan.slug] >= PLAN_RANK[minimum];
}
