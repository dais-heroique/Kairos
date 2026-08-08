import type { Plan, PlanStatus } from "@kairos/shared";
import { planForPrice, type PriceCatalog } from "./catalog";

// Ce que KAIROS doit faire d'un événement Stripe — décidé par une fonction
// pure, testable sans réseau, sans clé et sans Firestore.
//
// L'enjeu : ce module décide qui a payé et qui perd l'accès. Les deux
// erreurs coûtent cher et dans les deux sens — accorder un plan à qui n'a
// pas payé, ou couper l'accès à un client à jour. Le handler HTTP, lui, ne
// fait que vérifier la signature, appeler ceci, et écrire le résultat.
//
// Les types Stripe ne sont pas importés : ce paquet reste sans dépendance
// et le contrat se limite aux champs réellement lus. L'adaptateur (Cloud
// Function ou autre) passe l'objet tel quel.

/** Le sous-ensemble d'un événement Stripe que cette logique lit. */
export interface StripeEventLike {
  id: string;
  type: string;
  data: { object: Record<string, unknown> };
}

/**
 * Statuts d'abonnement renvoyés par Stripe, ramenés aux cinq que le schéma
 * KAIROS connaît (`planStatusSchema`).
 *
 * `unpaid` et `paused` deviennent `past_due` : dans les deux cas l'argent
 * ne rentre pas, et `entitlementsOf` redescend au gratuit — c'est le
 * comportement voulu, sans supprimer l'abonnement pour autant.
 * `incomplete_expired` devient `canceled` : la souscription n'a jamais
 * abouti.
 */
const STATUS_MAP: Record<string, PlanStatus> = {
  active: "active",
  trialing: "trialing",
  past_due: "past_due",
  unpaid: "past_due",
  paused: "past_due",
  canceled: "canceled",
  incomplete: "incomplete",
  incomplete_expired: "canceled",
};

export function mapStripeStatus(status: string | undefined): PlanStatus | null {
  if (!status) return null;
  return STATUS_MAP[status] ?? null;
}

/** Ce que l'appelant doit écrire, et sur quel utilisateur. */
export interface PlanUpdate {
  uid: string;
  plan: Plan;
}

export type WebhookOutcome =
  | { kind: "update"; update: PlanUpdate }
  /** Événement légitime mais sans effet sur les droits (reçu, note de crédit…). */
  | { kind: "ignore"; reason: string }
  /**
   * Événement qui *devrait* nous concerner mais qu'on ne sait pas
   * interpréter — prix inconnu, `uid` absent. On ne devine pas : mieux vaut
   * une alerte et une reprise manuelle qu'un accès accordé ou retiré au
   * hasard.
   */
  | { kind: "unresolved"; reason: string };

function str(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

/**
 * L'identifiant KAIROS de l'utilisateur, posé à la création de la session
 * de paiement. On le cherche à deux endroits parce que Stripe ne le recopie
 * pas d'un objet à l'autre : `client_reference_id` sur la session,
 * `metadata.uid` sur l'abonnement (via `subscription_data.metadata`).
 * L'adaptateur DOIT poser les deux — sinon les événements de cycle de vie
 * arrivent orphelins.
 */
function uidOf(object: Record<string, unknown>): string | null {
  const metadata = (object.metadata ?? {}) as Record<string, unknown>;
  return str(metadata.uid) ?? str(object.client_reference_id);
}

/** Premier prix de l'abonnement — KAIROS ne vend jamais deux lignes à la fois. */
function priceIdOf(subscription: Record<string, unknown>): string | null {
  const items = subscription.items as { data?: Array<Record<string, unknown>> } | undefined;
  const first = items?.data?.[0];
  const price = first?.price as Record<string, unknown> | undefined;
  return str(price?.id);
}

function periodEndIso(subscription: Record<string, unknown>): string | null {
  const raw = subscription.current_period_end;
  if (typeof raw !== "number" || !Number.isFinite(raw)) return null;
  return new Date(raw * 1000).toISOString();
}

/**
 * Traduit un événement Stripe en changement de plan.
 *
 * Volontairement conservateur : tout ce qui n'est pas compris ressort en
 * `unresolved` plutôt qu'en décision par défaut.
 */
export function resolveWebhookEvent(
  event: StripeEventLike,
  catalog: PriceCatalog,
): WebhookOutcome {
  const object = event.data.object;

  switch (event.type) {
    // Le paiement initial est confirmé. On n'accorde rien ici : la session
    // ne porte pas le statut de l'abonnement, et `customer.subscription.*`
    // arrive juste après avec la vérité. Accorder deux fois n'est pas
    // dangereux, mais accorder sur un objet qui ne dit pas encore « active »
    // l'est.
    case "checkout.session.completed": {
      const uid = uidOf(object);
      if (!uid) {
        return {
          kind: "unresolved",
          reason: `checkout.session.completed sans uid (session ${str(object.id) ?? "?"}) — l'adaptateur doit poser client_reference_id ET subscription_data.metadata.uid`,
        };
      }
      return {
        kind: "ignore",
        reason: "paiement confirmé ; les droits sont posés par customer.subscription.*",
      };
    }

    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const uid = uidOf(object);
      if (!uid) {
        return { kind: "unresolved", reason: `abonnement ${str(object.id) ?? "?"} sans metadata.uid` };
      }

      const status = mapStripeStatus(str(object.status) ?? undefined);
      if (!status) {
        return { kind: "unresolved", reason: `statut Stripe inconnu : ${String(object.status)}` };
      }

      const matched = planForPrice(priceIdOf(object), catalog);
      if (!matched) {
        // Cas réel : un prix archivé dans Stripe dont un abonnement existant
        // se réclame encore. Rétrograder serait injuste, promouvoir serait
        // faux — on le signale.
        return {
          kind: "unresolved",
          reason: `prix inconnu sur l'abonnement ${str(object.id) ?? "?"} — prix archivé ou variable STRIPE_PRICE_* non à jour`,
        };
      }

      return {
        kind: "update",
        update: {
          uid,
          plan: {
            slug: matched.plan,
            status,
            currentPeriodEnd: periodEndIso(object),
            stripeCustomerId: str(object.customer),
          },
        },
      };
    }

    // L'abonnement n'existe plus : retour au gratuit, explicitement. On
    // n'attend pas l'expiration de la période — Stripe n'envoie cet
    // événement qu'à la fin réelle, résiliation en fin de période comprise.
    case "customer.subscription.deleted": {
      const uid = uidOf(object);
      if (!uid) {
        return { kind: "unresolved", reason: `résiliation sans metadata.uid (${str(object.id) ?? "?"})` };
      }
      return {
        kind: "update",
        update: {
          uid,
          plan: {
            slug: "radar",
            status: "canceled",
            currentPeriodEnd: periodEndIso(object),
            stripeCustomerId: str(object.customer),
          },
        },
      };
    }

    default:
      return { kind: "ignore", reason: `type non traité : ${event.type}` };
  }
}
