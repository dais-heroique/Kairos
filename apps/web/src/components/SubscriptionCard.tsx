"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { planBySlug, type Plan, type PlanStatus } from "@kairos/shared";
import { CheckoutError } from "@/lib/stripe/checkout";
import { PlanUpgradeModal } from "@/components/PlanUpgradeModal";
import {
  isPortalConfigured,
  openBillingPortal,
  PORTAL_FALLBACK_URL,
} from "@/lib/stripe/portal";

// Mon abonnement — état réel, et le chemin pour en sortir.
//
// Le bouton de résiliation n'est pas une courtoisie : l'article L. 215-1 du
// code de la consommation impose de pouvoir résilier aussi simplement qu'on
// s'est abonné. Le portail hébergé de Stripe remplit l'obligation, à
// condition qu'on y donne accès — d'où cette carte.
//
// Rien n'y est estimé ni arrondi : on affiche ce que porte le document
// `plan`, écrit par le webhook Stripe et par personne d'autre.

const STATUS_KEYS: Record<PlanStatus, string> = {
  active: "statusActive",
  trialing: "statusTrialing",
  past_due: "statusPastDue",
  canceled: "statusCanceled",
  incomplete: "statusIncomplete",
};

/** Ce que la date de fin de période signifie *selon* l'état de l'abonnement. */
function periodLabel(status: PlanStatus): string {
  if (status === "canceled") return "Accès conservé jusqu'au";
  if (status === "trialing") return "Essai jusqu'au";
  if (status === "past_due") return "Période en cours jusqu'au";
  return "Prochain renouvellement le";
}

function formatDate(iso: string): string | null {
  const date = new Date(iso);
  // Une date illisible ne devient pas « Invalid Date » à l'écran : on
  // n'affiche simplement rien.
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function SubscriptionCard({ plan }: { plan: Plan }) {
  const t = useTranslations("Account");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const definition = planBySlug(plan.slug);
  const isPaid = plan.slug !== "radar";
  const endDate = plan.currentPeriodEnd ? formatDate(plan.currentPeriodEnd) : null;
  const billingLabel = plan.billingPeriod === "monthly"
    ? t("billingMonthly")
    : plan.billingPeriod === "yearly"
      ? t("billingYearly")
      : t("billingUnknown");

  // Le portail suppose un client Stripe. Un plan accordé à la main
  // (`pnpm grant:plan`, compte fondateur) n'en a pas : proposer le bouton
  // ouvrirait sur une erreur.
  const canManage = isPaid && isPortalConfigured() && plan.stripeCustomerId !== null;

  async function handleManage() {
    setBusy(true);
    setError(null);
    try {
      await openBillingPortal();
    } catch (err) {
      // Le secours part **tout seul**, sans redemander un clic : quelqu'un
      // qui vient d'appuyer sur « résilier » a exprimé son intention, et
      // lui répondre par un message d'erreur revient à mettre un obstacle
      // exactement là où la loi en interdit un.
      if (PORTAL_FALLBACK_URL) {
        window.location.assign(PORTAL_FALLBACK_URL);
        return;
      }
      setError(
        err instanceof CheckoutError
          ? err.message
          : "Le portail n'a pas pu s'ouvrir. Réessaie dans un instant.",
      );
      setBusy(false);
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="font-[family-name:var(--font-display)] text-lg font-extrabold">
          {t("subscriptionTitle")}
        </h2>
        <p className="mt-1 text-sm text-[color:var(--color-ink-muted)]">
          {t("planStatus", { plan: definition.name, status: t(STATUS_KEYS[plan.status]) })} · {billingLabel}
          {endDate && (
            <>
              {" · "}
              {periodLabel(plan.status)} {endDate}
            </>
          )}
        </p>
      </div>

      {plan.status === "past_due" && (
        <p
          className="kai-card text-sm font-semibold"
          style={{ color: "var(--color-warning)" }}
        >
          Ton dernier paiement n&apos;est pas passé. Mets ton moyen de paiement
          à jour pour ne pas perdre l&apos;accès.
        </p>
      )}

      {canManage ? (
        <>
          <button
            type="button"
            onClick={handleManage}
            disabled={busy}
            className="kai-btn-outline"
          >
            {busy ? "Ouverture…" : "Gérer ou résilier mon abonnement"}
          </button>
          <p className="text-xs text-[color:var(--color-ink-muted)]">
            Factures, moyen de paiement et résiliation, sur la page sécurisée
            de Stripe. La résiliation prend effet à la fin de la période déjà
            payée — tu gardes l&apos;accès jusque-là.
          </p>
          {error && (
            <p className="text-sm font-semibold" style={{ color: "var(--color-coral)" }}>
              {error}
            </p>
          )}
        </>
      ) : isPaid ? (
        // Plan payant sans client Stripe : accordé à la main. Le dire, plutôt
        // qu'un bouton qui échouerait — mais laisser le portail accessible,
        // parce qu'un `stripeCustomerId` absent peut aussi vouloir dire que
        // le webhook n'a pas encore écrit le document.
        <>
          <p className="text-xs text-[color:var(--color-ink-muted)]">
            Aucun paiement n&apos;est rattaché à ce compte — le plan t&apos;a
            été accordé directement, ou l&apos;abonnement vient tout juste
            d&apos;être créé.
          </p>
          {PORTAL_FALLBACK_URL && (
            <a
              href={PORTAL_FALLBACK_URL}
              className="kai-btn-outline text-center"
              target="_blank"
              rel="noreferrer"
            >
              Accéder à mes factures et résilier
            </a>
          )}
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setUpgradeOpen(true)}
            className="kai-btn-primary"
          >
            Voir les offres et choisir mon plan
          </button>
          <p className="text-xs text-[color:var(--color-ink-muted)]">
            Compare Creator et Pro sans quitter ton compte. Le paiement s&apos;ouvrira uniquement après ton choix.
          </p>
          <PlanUpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
        </>
      )}
    </section>
  );
}
