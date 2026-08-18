"use client";

import { useState } from "react";
import { computeEarnings, DEFAULT_EARNINGS_CONFIG } from "@kairos/core";
import { EstimatedValue } from "@/components/EstimatedValue";

// Le moment de conversion de la page d'accueil : le visiteur voit *son*
// chiffre avant d'avoir créé un compte.
//
// Une carte figée « voilà à quoi ça ressemble » se regarde une seconde et
// se ferme. Un curseur qu'on bouge et qui répond en euros retient — et
// c'est exactement la promesse du produit, démontrée au lieu d'être
// annoncée. Le calcul est le vrai `computeEarnings`, pas une formule
// d'illustration : la fourchette et le niveau de confiance affichés ici
// sont ceux que l'utilisateur retrouvera une fois connecté.

const VIEWS_STEPS = [1000, 3000, 5000, 10000, 25000, 50000, 100000, 250000];
const MIN_VIEWS = 1000;
const MAX_VIEWS = 250000;

// Produit d'exemple représentatif de l'affiliation beauté FR : 16,90 € à
// 28 % de commission. Ce sont des ordres de grandeur réels, pas des
// chiffres flatteurs choisis pour impressionner.
const EXAMPLE_PRICE_CENTS = 1690;
const EXAMPLE_COMMISSION_PCT = 28;

export function HeroEarningsTeaser() {
  const [views, setViews] = useState(10_000);
  const stepIndex = Math.max(
    0,
    VIEWS_STEPS.reduce(
      (closest, value, index) =>
        Math.abs(value - views) < Math.abs(VIEWS_STEPS[closest]! - views) ? index : closest,
      0,
    ),
  );

  const earnings = computeEarnings({
    expectedViews: views,
    followerRange: "5k_20k",
    niche: "beaute",
    medianConversionRate: DEFAULT_EARNINGS_CONFIG.defaultConversionRate,
    priceCents: EXAMPLE_PRICE_CENTS,
    commissionRatePct: EXAMPLE_COMMISSION_PCT,
    estimatedReturnRatePct: DEFAULT_EARNINGS_CONFIG.defaultReturnRatePct,
  });

  const eur = (v: number) =>
    v.toLocaleString("fr-FR", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    });

  return (
    <div className="kai-card flex flex-col gap-3">
      <label className="flex flex-col gap-2">
        <span className="flex items-baseline justify-between gap-2">
          <span className="text-sm font-semibold">Vues par vidéo</span>
          <input
            type="number"
            min={MIN_VIEWS}
            max={MAX_VIEWS}
            step={1000}
            value={views}
            onChange={(event) => {
              const next = Number(event.target.value);
              if (Number.isFinite(next)) {
                setViews(Math.min(MAX_VIEWS, Math.max(MIN_VIEWS, next)));
              }
            }}
            className="kai-input w-28 px-2 py-1 text-right font-[family-name:var(--font-mono)] text-sm font-bold"
            aria-label="Nombre de vues par vidéo"
          />
        </span>
        <input
          type="range"
          min={0}
          max={VIEWS_STEPS.length - 1}
          step={1}
          value={stepIndex}
          onChange={(event) => setViews(VIEWS_STEPS[Number(event.target.value)]!)}
          className="w-full accent-[var(--color-coral)]"
          aria-label="Choisir un palier de vues par vidéo"
        />
      </label>

      <div className="flex flex-col gap-0.5" aria-live="polite">
          <span className="text-xs text-[color:var(--color-ink-muted)]">
          Simulation pour {views.toLocaleString("fr-FR")} vues · produit exemple à 16,90 € · commission 28 %
        </span>
        <EstimatedValue
          range={earnings}
          format={eur}
          className="font-[family-name:var(--font-display)] text-2xl font-extrabold"
        />
      </div>

      <p className="text-[11px] leading-relaxed text-[color:var(--color-ink-muted)]">
        <strong>Simulation pédagogique, pas un relevé TikTok Shop.</strong> Calculée
        par le moteur Kairos avec une hypothèse de conversion prudente et les
        retours déduits. Ce n&apos;est pas une prévision individuelle : toujours une
        fourchette, jamais un chiffre garanti.
      </p>
    </div>
  );
}
