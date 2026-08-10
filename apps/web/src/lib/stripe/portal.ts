"use client";

import { getAuth } from "firebase/auth";
import { CheckoutError } from "./checkout";

// Portail client Stripe — moyen de paiement, factures, et **résiliation**.
//
// Rien n'est géré ici : Stripe héberge l'écran, on ne fait qu'obtenir une
// URL signée valable quelques minutes. Réécrire cet écran nous-mêmes
// voudrait dire manipuler des abonnements depuis un navigateur, ce que le
// reste de l'architecture interdit précisément.

const WORKER_URL = process.env.NEXT_PUBLIC_STRIPE_WORKER_URL;

/** Le portail est-il joignable ? Sans Worker, aucun bouton ne doit paraître. */
export function isPortalConfigured(): boolean {
  return Boolean(WORKER_URL?.trim());
}

/**
 * Ouvre le portail. Ne rend pas la main en cas de succès : le navigateur
 * quitte le site pour Stripe.
 */
export async function openBillingPortal(): Promise<never | void> {
  if (!WORKER_URL) {
    throw new CheckoutError("La gestion de l'abonnement n'est pas disponible.");
  }

  const user = getAuth().currentUser;
  if (!user) throw new CheckoutError("Connecte-toi d'abord.");

  const token = await user.getIdToken();

  const response = await fetch(`${WORKER_URL.replace(/\/$/, "")}/stripe/portal`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
  });

  if (!response.ok) {
    const detail = (await response.json().catch(() => ({}))) as { error?: string };
    throw new CheckoutError(detail.error ?? "Le portail n'a pas pu s'ouvrir.");
  }

  const { url } = (await response.json()) as { url?: string };
  if (!url) throw new CheckoutError("Stripe n'a pas renvoyé d'adresse.");

  window.location.assign(url);
}
