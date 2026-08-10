import { BILLING_PERIODS, type BillingPeriod, type PlanSlug } from "@kairos/shared";

// Correspondance entre les prix Stripe et les plans KAIROS.
//
// Pourquoi un module à part, pur, testé : c'est la table qui décide de ce
// qu'un client reçoit contre son argent. Une inversion ici ne se voit ni au
// typecheck ni à l'écran — elle se voit sur le relevé bancaire de
// quelqu'un. Elle ne doit donc pas vivre au milieu d'un handler HTTP.
//
// Les identifiants de prix (`price_...`) ne sont pas dans le code : ils
// diffèrent entre le mode test et le mode réel, et changent si on recrée un
// prix. Ils arrivent par variables d'environnement, côté serveur
// uniquement.

// Réexportés depuis `@kairos/shared`, où ils sont définis. Le catalogue
// Stripe et les prix affichés désignent ainsi le même ensemble de valeurs :
// ajouter une périodicité d'un côté sans l'autre ne compilerait pas.
export { BILLING_PERIODS, type BillingPeriod };

/** Un prix vendable : un plan × une périodicité. */
export interface PriceRef {
  plan: Extract<PlanSlug, "creator" | "pro">;
  period: BillingPeriod;
  /** Nom de la variable d'environnement qui porte l'identifiant Stripe. */
  envKey: string;
}

/**
 * Les quatre prix à créer dans Stripe. Le plan `radar` n'y figure pas :
 * il est gratuit, il n'a pas de prix, et lui en donner un serait la
 * première marche vers un « gratuit » qui ne l'est plus.
 */
export const PRICE_REFS: PriceRef[] = [
  { plan: "creator", period: "monthly", envKey: "STRIPE_PRICE_CREATOR_MONTHLY" },
  { plan: "creator", period: "yearly", envKey: "STRIPE_PRICE_CREATOR_YEARLY" },
  { plan: "pro", period: "monthly", envKey: "STRIPE_PRICE_PRO_MONTHLY" },
  { plan: "pro", period: "yearly", envKey: "STRIPE_PRICE_PRO_YEARLY" },
];

/** Table résolue : identifiant de prix Stripe → plan et périodicité. */
export type PriceCatalog = Map<string, { plan: PriceRef["plan"]; period: BillingPeriod }>;

export interface CatalogResult {
  catalog: PriceCatalog;
  /** Prix non configurés — le plan correspondant n'est simplement pas en vente. */
  missing: string[];
}

/**
 * Construit la table à partir des variables d'environnement.
 *
 * Un prix absent n'est pas une erreur : il rend ce plan invendable, ce qui
 * est exactement l'état actuel du produit (aucun tarif n'est ouvert). En
 * revanche un identifiant **en double** en est une, et grave : deux plans
 * différents derrière le même prix veut dire qu'un client peut payer pour
 * l'un et recevoir l'autre. On refuse de démarrer plutôt que de tirer au
 * sort.
 */
export function buildPriceCatalog(env: Record<string, string | undefined>): CatalogResult {
  const catalog: PriceCatalog = new Map();
  const missing: string[] = [];

  for (const ref of PRICE_REFS) {
    const priceId = env[ref.envKey]?.trim();
    if (!priceId) {
      missing.push(ref.envKey);
      continue;
    }
    const existing = catalog.get(priceId);
    if (existing) {
      throw new Error(
        `Prix Stripe ${priceId} associé à deux offres différentes ` +
          `(${existing.plan}/${existing.period} et ${ref.plan}/${ref.period}) — ` +
          `vérifie les variables ${ref.envKey} et les autres STRIPE_PRICE_*.`,
      );
    }
    catalog.set(priceId, { plan: ref.plan, period: ref.period });
  }

  return { catalog, missing };
}

/**
 * Le plan correspondant à un prix. `null` quand le prix est inconnu — cas
 * réel : un ancien prix archivé dans Stripe dont un abonnement existant se
 * réclame encore. On ne devine pas ; l'appelant traitera l'événement comme
 * non concluant plutôt que de rétrograder quelqu'un par erreur.
 */
export function planForPrice(
  priceId: string | null | undefined,
  catalog: PriceCatalog,
): { plan: PriceRef["plan"]; period: BillingPeriod } | null {
  if (!priceId) return null;
  return catalog.get(priceId) ?? null;
}

/** Les offres réellement en vente, d'après ce qui est configuré. */
export function sellablePlans(catalog: PriceCatalog): PriceRef["plan"][] {
  return [...new Set([...catalog.values()].map((v) => v.plan))];
}
