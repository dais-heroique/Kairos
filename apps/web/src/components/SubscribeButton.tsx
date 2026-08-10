"use client";

import Link from "next/link";
import { useState } from "react";
import type { BillingPeriod, PlanSlug } from "@kairos/shared";
import { useAuth } from "@/lib/firebase/auth-context";
import { CheckoutError, isCheckoutConfigured, startCheckout } from "@/lib/stripe/checkout";

type PaidPlan = Extract<PlanSlug, "creator" | "pro">;

/**
 * Bouton d'abonnement.
 *
 * Il ne s'affiche que si l'encaissement est **réellement** branché pour ce
 * plan — adresse du Worker et identifiant de prix tous deux configurés.
 * Sinon on retombe sur l'inscription gratuite, qui est la seule action qui
 * existe alors. Un bouton « Payer » qui renvoie une erreur ferait croire à
 * une panne ; dire « pas encore ouvert » dit la vérité.
 */
export function SubscribeButton({
  plan,
  label,
  period = "monthly",
}: {
  plan: PaidPlan;
  label: string;
  period?: BillingPeriod;
}) {
  const { firebaseUser } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isCheckoutConfigured(plan, period)) {
    return (
      <Link href="/connexion" className="kai-btn-outline text-center">
        Commencer gratuitement en attendant
      </Link>
    );
  }

  // Payer suppose un compte : c'est lui qui reçoit l'abonnement. On envoie
  // donc se connecter d'abord plutôt que d'ouvrir Stripe pour rien.
  if (!firebaseUser) {
    return (
      <Link href="/connexion" className="kai-btn-primary text-center">
        Créer mon compte pour continuer
      </Link>
    );
  }

  async function handleClick() {
    setBusy(true);
    setError(null);
    try {
      await startCheckout(plan, period);
    } catch (err) {
      setError(
        err instanceof CheckoutError
          ? err.message
          : "Le paiement n'a pas pu démarrer. Réessaie dans un instant.",
      );
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <button type="button" onClick={handleClick} disabled={busy} className="kai-btn-primary">
        {busy ? "Ouverture du paiement…" : label}
      </button>
      {error && (
        <p className="text-center text-xs font-semibold" style={{ color: "var(--color-coral)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
