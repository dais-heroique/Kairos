"use client";

import { useEffect, useId, useState } from "react";
import {
  CAPABILITIES_BY_PLAN,
  CAPABILITY_INFO,
  formatPlanPrice,
  formatYearlyAsMonthly,
  newCapabilitiesOf,
  planPriceCents,
  PLANS,
  yearlySavingsPct,
  type BillingPeriod,
  type PlanSlug,
} from "@kairos/shared";
import { SubscribeButton } from "@/components/SubscribeButton";

const PAID_PLANS = PLANS.filter((plan) => plan.slug !== "radar");

type PaidPlan = Extract<PlanSlug, "creator" | "pro">;

export function PlanUpgradeModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [period, setPeriod] = useState<BillingPeriod>("monthly");
  const titleId = useId();

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-5"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl p-5 shadow-2xl sm:max-w-4xl sm:rounded-3xl sm:p-7"
        style={{ backgroundColor: "var(--color-bg)" }}
      >
        <div className="mb-5 flex items-start justify-between gap-5">
          <div>
            <p
              className="text-xs font-bold uppercase tracking-[0.14em]"
              style={{ color: "var(--color-coral)" }}
            >
              Débloquer KAIROS
            </p>
            <h2
              id={titleId}
              className="mt-1 font-[family-name:var(--font-display)] text-2xl font-extrabold sm:text-3xl"
            >
              Choisis le plan qui correspond à ton rythme
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-[color:var(--color-ink-muted)]">
              Tu restes sur cette page. Le paiement s&apos;ouvre ensuite de façon sécurisée,
              sans perdre ton compte ni ton analyse.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer la fenêtre des offres"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-2xl leading-none transition-transform hover:bg-[var(--color-surface)] active:scale-95"
            style={{ color: "var(--color-ink-muted)" }}
          >
            ×
          </button>
        </div>

        <div className="mb-5 flex justify-center">
          <div
            role="radiogroup"
            aria-label="Périodicité de facturation"
            className="inline-flex items-center gap-1 rounded-full p-1"
            style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}
          >
            {([
              ["monthly", "Mensuel"],
              ["yearly", "Annuel"],
            ] as const).map(([value, label]) => {
              const active = period === value;
              const savings = yearlySavingsPct(PAID_PLANS[0]!);
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setPeriod(value)}
                  className="rounded-full px-4 py-1.5 text-sm font-bold transition-colors"
                  style={{
                    backgroundColor: active ? "var(--color-coral)" : "transparent",
                    color: active ? "var(--color-coral-ink)" : "var(--color-ink-muted)",
                  }}
                >
                  {label}
                  {value === "yearly" && savings !== null && (
                    <span className="ml-1.5 text-[11px]">−{savings} %</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {PAID_PLANS.map((plan) => {
            const added = newCapabilitiesOf(plan.slug);
            const total = CAPABILITIES_BY_PLAN[plan.slug].length;
            const price = planPriceCents(plan, period);
            const isFeatured = plan.popular;

            return (
              <article
                key={plan.slug}
                className="relative flex flex-col gap-4 rounded-2xl p-5"
                style={{
                  backgroundColor: "var(--color-bg)",
                  border: isFeatured
                    ? "2px solid var(--color-coral)"
                    : "1px solid var(--color-border)",
                }}
              >
                {isFeatured && (
                  <span
                    className="absolute -top-3 left-5 rounded-full px-2.5 py-0.5 text-[11px] font-bold"
                    style={{ backgroundColor: "var(--color-coral)", color: "var(--color-coral-ink)" }}
                  >
                    Le plus choisi
                  </span>
                )}
                <div>
                  <h3 className="font-[family-name:var(--font-display)] text-xl font-extrabold">
                    {plan.name}
                  </h3>
                  <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-extrabold">
                    {formatPlanPrice(plan, period)}
                  </p>
                  {period === "yearly" && formatYearlyAsMonthly(plan) && (
                    <p className="text-xs font-semibold text-[color:var(--color-ink-muted)]">
                      soit {formatYearlyAsMonthly(plan)}, facturé en une fois
                    </p>
                  )}
                  <p className="mt-1 text-sm text-[color:var(--color-ink-muted)]">{plan.tagline}</p>
                </div>

                <p
                  className="rounded-xl p-3 text-sm font-semibold"
                  style={{
                    backgroundColor: isFeatured ? "var(--color-coral-soft)" : "var(--color-surface)",
                    color: isFeatured ? "var(--color-coral)" : "var(--color-ink)",
                  }}
                >
                  {plan.highlight}
                </p>

                <ul className="flex flex-1 flex-col gap-2">
                  {added.map((capability) => (
                    <li key={capability} className="flex items-start gap-2 text-sm">
                      <span aria-hidden style={{ color: "var(--color-success)" }}>✓</span>
                      <span className="text-[color:var(--color-ink-muted)]">
                        {CAPABILITY_INFO[capability].label}
                      </span>
                    </li>
                  ))}
                </ul>

                <p className="border-t pt-3 text-xs font-semibold text-[color:var(--color-ink-muted)]" style={{ borderColor: "var(--color-border)" }}>
                  {total} fonctionnalité{total > 1 ? "s" : ""} au total
                </p>

                {price === null ? (
                  <p className="text-center text-sm font-semibold text-[color:var(--color-ink-muted)]">
                    Offre bientôt disponible
                  </p>
                ) : (
                  <SubscribeButton
                    plan={plan.slug as PaidPlan}
                    period={period}
                    label={`Passer en ${plan.name}`}
                  />
                )}
              </article>
            );
          })}
        </div>

        <p className="mt-5 text-center text-xs text-[color:var(--color-ink-muted)]">
          Tu peux fermer cette fenêtre à tout moment avec la croix, la touche Échap ou en cliquant à l&apos;extérieur.
        </p>
      </section>
    </div>
  );
}
