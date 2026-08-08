"use client";

import { useMemo, useState } from "react";
import { computeEarnings, DEFAULT_EARNINGS_CONFIG } from "@kairos/core";
import type { PlanSlug } from "@kairos/shared";
import { EstimatedValue } from "@/components/EstimatedValue";
import { LockedValue } from "@/components/PaywallGate";

// « Ce que tu toucherais sur les 10 premiers » contre « sur tous les
// produits » : deux lignes de catalogue qui se ressemblent, et dont la
// différence ne se comprend qu'en la voyant.
//
// Le visiteur bascule entre les deux plans et regarde les chiffres
// apparaître. C'est le même motif que dans l'application — la ligne reste
// visible, seul le montant est retenu — donc il sait exactement ce qu'il
// achète avant de payer, et ce qu'il perd s'il ne paie pas.

const FREE_PLAN_LIMIT = 10;

// Prix et commissions d'ordre de grandeur réel en affiliation FR, pas des
// valeurs flatteuses. Les gains, eux, sortent du vrai `computeEarnings`.
const EXAMPLE_ROWS = [
  { emoji: "🧴", title: "Sérum niacinamide 10 %", priceCents: 1690, commissionRatePct: 28 },
  { emoji: "🌿", title: "Huile de ricin cils & sourcils", priceCents: 1290, commissionRatePct: 32 },
  { emoji: "💡", title: "Veilleuse projecteur d'étoiles", priceCents: 2390, commissionRatePct: 20 },
  { emoji: "🐱", title: "Brosse anti-poils pour chat", priceCents: 1490, commissionRatePct: 24 },
  { emoji: "🫗", title: "Gourde isotherme 1 L", priceCents: 1840, commissionRatePct: 18 },
  { emoji: "🍵", title: "Infuseur à thé inox pliable", priceCents: 1190, commissionRatePct: 22 },
  { emoji: "🚗", title: "Aspirateur à main voiture", priceCents: 3290, commissionRatePct: 15 },
  { emoji: "👜", title: "Sac bandoulière matelassé", priceCents: 2790, commissionRatePct: 20 },
  { emoji: "🌅", title: "Lampe coucher de soleil", priceCents: 1590, commissionRatePct: 20 },
  { emoji: "💪", title: "Bandes élastiques fitness", priceCents: 1690, commissionRatePct: 20 },
  { emoji: "🩹", title: "Patchs hydrocolloïdes anti-boutons", priceCents: 990, commissionRatePct: 30 },
  { emoji: "💎", title: "Gua sha quartz rose", priceCents: 1390, commissionRatePct: 25 },
];

const EXAMPLE_VIEWS = 10_000;

export function PaywallDemo() {
  const [plan, setPlan] = useState<Extract<PlanSlug, "radar" | "creator">>("radar");

  const rows = useMemo(
    () =>
      EXAMPLE_ROWS.map((row) => ({
        ...row,
        earnings: computeEarnings({
          expectedViews: EXAMPLE_VIEWS,
          followerRange: "5k_20k",
          niche: "beaute",
          medianConversionRate: DEFAULT_EARNINGS_CONFIG.defaultConversionRate,
          priceCents: row.priceCents,
          commissionRatePct: row.commissionRatePct,
          estimatedReturnRatePct: DEFAULT_EARNINGS_CONFIG.defaultReturnRatePct,
        }),
      })),
    [],
  );

  const hiddenCount = EXAMPLE_ROWS.length - FREE_PLAN_LIMIT;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-[family-name:var(--font-display)] text-xl font-extrabold">
        La différence, en vrai
      </h2>
      <p className="text-sm text-[color:var(--color-ink-muted)]">
        Le classement complet et les recommandations sont à toi
        gratuitement. Ce qui se débloque, c&apos;est le montant sur chaque
        produit. Bascule pour voir.
      </p>

      <div
        role="tablist"
        aria-label="Comparer les plans"
        className="flex gap-2"
      >
        {(
          [
            { slug: "radar", label: "Radar — gratuit" },
            { slug: "creator", label: "Creator" },
          ] as const
        ).map((option) => {
          const selected = plan === option.slug;
          return (
            <button
              key={option.slug}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setPlan(option.slug)}
              className="flex-1 rounded-xl px-3 py-2 text-sm font-bold transition-colors"
              style={{
                backgroundColor: selected ? "var(--color-accent)" : "var(--color-surface)",
                color: selected ? "#fff" : "var(--color-ink-muted)",
                border: `1.5px solid ${selected ? "var(--color-accent)" : "var(--color-border)"}`,
              }}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <ol className="flex flex-col gap-1.5" aria-live="polite">
        {rows.map((row, index) => {
          const locked = plan === "radar" && index >= FREE_PLAN_LIMIT;
          return (
            // Sur téléphone le titre et la fourchette se disputaient les
            // mêmes 390 px, et les titres tombaient à huit caractères. Ils
            // passent donc l'un sous l'autre sous 640 px, côte à côte
            // au-delà.
            <li
              key={row.title}
              className="flex items-center gap-3 rounded-xl px-3 py-2"
              style={{ backgroundColor: "var(--color-surface)" }}
            >
              <span
                className="w-5 shrink-0 text-center font-[family-name:var(--font-mono)] text-xs font-bold"
                style={{ color: "var(--color-ink-muted)" }}
              >
                {index + 1}
              </span>
              <span className="text-lg" aria-hidden>
                {row.emoji}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                <span className="truncate text-sm font-semibold">{row.title}</span>
                {locked ? (
                  <LockedValue hint="Tes gains sur tous les produits — plan Creator" />
                ) : (
                  <EstimatedValue
                    range={row.earnings}
                    format={(v) =>
                      v.toLocaleString("fr-FR", {
                        style: "currency",
                        currency: "EUR",
                        maximumFractionDigits: 0,
                      })
                    }
                    className="shrink-0 font-[family-name:var(--font-mono)] text-sm font-bold"
                  />
                )}
              </div>
            </li>
          );
        })}
      </ol>

      <p className="text-xs leading-relaxed text-[color:var(--color-ink-muted)]">
        {plan === "radar"
          ? `Avec le plan gratuit, les ${hiddenCount} dernières lignes restent visibles — tu sais que ces produits existent et ce que l'outil en pense. Seul le montant est masqué.`
          : `Les ${EXAMPLE_ROWS.length} montants sont calculés, pour ${EXAMPLE_VIEWS.toLocaleString("fr-FR")} vues. Produits d'exemple, calcul réel.`}
      </p>
    </section>
  );
}
