"use client";

import Link from "next/link";
import { useState } from "react";
import { useLocalePreference } from "@/components/LanguageProvider";
import type { BillingPeriod, PlanSlug } from "@kairos/shared";
import { useAuth } from "@/lib/firebase/auth-context";
import { CheckoutError, isCheckoutConfigured, startCheckout } from "@/lib/stripe/checkout";

type PaidPlan = Extract<PlanSlug, "creator" | "pro">;

const CHECKOUT_COPY = {
  fr: { legalReadMore: "Lire les CGU/CGV et le droit de rétractation", legalAcceptance: "J'ai lu et j'accepte les CGU/CGV de Kairos.", paymentOpening: "Ouverture du paiement…", paymentError: "Le paiement n'a pas pu démarrer. Réessaie dans un instant." },
  en: { legalReadMore: "Read the Terms and withdrawal policy", legalAcceptance: "I have read and accept the Kairos Terms of Use and Sale.", paymentOpening: "Opening checkout…", paymentError: "Checkout could not be started. Please try again." },
  de: { legalReadMore: "Bedingungen und Widerrufsbelehrung lesen", legalAcceptance: "Ich habe die Nutzungs- und Verkaufsbedingungen von Kairos gelesen und akzeptiere sie.", paymentOpening: "Zahlung wird geöffnet…", paymentError: "Die Zahlung konnte nicht gestartet werden. Bitte versuche es erneut." },
  es: { legalReadMore: "Leer las condiciones y la política de desistimiento", legalAcceptance: "He leído y acepto las condiciones de uso y venta de Kairos.", paymentOpening: "Abriendo el pago…", paymentError: "No se ha podido iniciar el pago. Inténtalo de nuevo." },
  it: { legalReadMore: "Leggi le condizioni e il diritto di recesso", legalAcceptance: "Ho letto e accetto le condizioni d'uso e di vendita di Kairos.", paymentOpening: "Apertura del pagamento…", paymentError: "Non è stato possibile avviare il pagamento. Riprova." },
  nl: { legalReadMore: "Lees de voorwaarden en het herroepingsbeleid", legalAcceptance: "Ik heb de gebruiks- en verkoopvoorwaarden van Kairos gelezen en ga ermee akkoord.", paymentOpening: "Betaling wordt geopend…", paymentError: "De betaling kon niet worden gestart. Probeer het opnieuw." },
  pl: { legalReadMore: "Przeczytaj warunki i zasady odstąpienia", legalAcceptance: "Przeczytałem(-am) i akceptuję warunki korzystania z Kairos i sprzedaży.", paymentOpening: "Otwieranie płatności…", paymentError: "Nie udało się rozpocząć płatności. Spróbuj ponownie." },
} as const;

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
  const { locale } = useLocalePreference();
  const copy = CHECKOUT_COPY[locale];
  const [busy, setBusy] = useState(false);
  const [legalAccepted, setLegalAccepted] = useState(false);
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
          : copy.paymentError,

      );
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-[color:var(--color-ink-muted)]">
        <Link href="/cgu" className="underline">{copy.legalReadMore}</Link>
      </p>
      <label className="flex items-start gap-2 text-xs text-[color:var(--color-ink-muted)]">
        <input
          type="checkbox"
          checked={legalAccepted}
          onChange={(event) => setLegalAccepted(event.target.checked)}
          className="mt-0.5"
        />
        <span>{copy.legalAcceptance}</span>
      </label>
      <button type="button" onClick={handleClick} disabled={busy || !legalAccepted} className="kai-btn-primary">
        {busy ? copy.paymentOpening : label}
      </button>
      {error && (
        <p className="text-center text-xs font-semibold" style={{ color: "var(--color-coral)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
