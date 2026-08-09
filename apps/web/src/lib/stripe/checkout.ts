"use client";

import { getAuth } from "firebase/auth";
import type { BillingPeriod } from "@kairos/payments";
import type { PlanSlug } from "@kairos/shared";

// Départ du paiement, côté navigateur.
//
// Le navigateur ne voit jamais la clé Stripe : il demande une session au
// Worker Cloudflare, qui la crée avec la clé secrète et renvoie l'URL de
// paiement hébergée par Stripe. Le jeton d'identité Firebase part dans
// l'en-tête `Authorization` — c'est lui qui prouve qui demande, et le
// Worker refuse tout ce qui n'est pas signé.
//
// Les identifiants de prix (`price_...`) sont publics par nature : ils
// apparaissent de toute façon dans l'URL de paiement. Ils vivent donc dans
// des variables `NEXT_PUBLIC_*`, contrairement à la clé secrète.

type PaidPlan = Extract<PlanSlug, "creator" | "pro">;

const PRICE_IDS: Record<PaidPlan, Record<BillingPeriod, string | undefined>> = {
  creator: {
    monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_CREATOR_MONTHLY,
    yearly: process.env.NEXT_PUBLIC_STRIPE_PRICE_CREATOR_YEARLY,
  },
  pro: {
    monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY,
    yearly: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_YEARLY,
  },
};

const WORKER_URL = process.env.NEXT_PUBLIC_STRIPE_WORKER_URL;

export function stripePriceId(plan: PaidPlan, period: BillingPeriod): string | null {
  return PRICE_IDS[plan][period]?.trim() || null;
}

/**
 * L'encaissement est-il réellement branché pour ce plan ?
 *
 * Tant que ce n'est pas le cas, aucun bouton de paiement ne doit
 * apparaître. Un bouton mort qui renvoie une erreur est pire qu'une
 * mention « bientôt » : le premier fait croire à une panne, la seconde dit
 * la vérité.
 */
export function isCheckoutConfigured(plan: PaidPlan, period: BillingPeriod = "monthly"): boolean {
  return Boolean(WORKER_URL?.trim()) && stripePriceId(plan, period) !== null;
}

export class CheckoutError extends Error {}

/**
 * Ouvre la page de paiement Stripe. Ne rend pas la main : en cas de succès
 * le navigateur quitte le site.
 */
export async function startCheckout(
  plan: PaidPlan,
  period: BillingPeriod = "monthly",
): Promise<never | void> {
  const priceId = stripePriceId(plan, period);
  if (!WORKER_URL || !priceId) {
    throw new CheckoutError("Le paiement n'est pas encore ouvert pour cette offre.");
  }

  const user = getAuth().currentUser;
  if (!user) throw new CheckoutError("Connecte-toi d'abord.");

  // `getIdToken()` rafraîchit le jeton s'il a expiré — sans ça, un onglet
  // resté ouvert plus d'une heure enverrait un jeton périmé et le Worker
  // répondrait 401 sans raison visible pour l'utilisateur.
  const token = await user.getIdToken();

  const response = await fetch(`${WORKER_URL.replace(/\/$/, "")}/stripe/checkout`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ priceId }),
  });

  if (!response.ok) {
    const detail = (await response.json().catch(() => ({}))) as { error?: string };
    throw new CheckoutError(detail.error ?? "Le paiement n'a pas pu démarrer.");
  }

  const { url } = (await response.json()) as { url?: string };
  if (!url) throw new CheckoutError("Stripe n'a pas renvoyé d'adresse de paiement.");

  window.location.assign(url);
}
