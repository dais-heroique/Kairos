"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { computeVerdict } from "@kairos/core";
import { PHASE_LABELS } from "@kairos/shared";
import { buildScenarioSnapshots, SCENARIO_PRESETS } from "@/lib/demo/scenario";
import { VerdictBadge } from "@/components/VerdictBadge";

// Les quatre verdicts, montrés au lieu d'être décrits.
//
// Cette section était quatre cartes de texte : une pastille de couleur et
// un paragraphe qui expliquait ce que la pastille voulait dire. Le visiteur
// devait croire sur parole. Or `computeVerdict` est une fonction pure : elle
// tourne gratuitement dans le navigateur, sur la même forme de données
// qu'un produit réel.
//
// Ici, chaque onglet fait donc réellement tourner le moteur sur une
// situation typique, et affiche ce qu'il répond — verdict, concurrence,
// fenêtre restante, et surtout le `reasoning[]`, c'est-à-dire le texte
// exact que l'utilisateur lira dans l'application. La page ne peut pas
// raconter autre chose que ce que fait le produit : si le moteur change,
// la démonstration change avec lui.

export function VerdictShowcase() {
  const [activeId, setActiveId] = useState(SCENARIO_PRESETS[0]!.id);

  // `today` figé au premier rendu : les dates de relevés sont dérivées de
  // l'heure courante, et les recalculer à chaque frappe ferait bouger le
  // verdict sans que le visiteur ait rien touché.
  const today = useMemo(() => new Date(), []);

  const scenarios = useMemo(
    () =>
      SCENARIO_PRESETS.map((preset) => ({
        preset,
        verdict: computeVerdict(buildScenarioSnapshots(preset.params, today)),
      })),
    [today],
  );

  const active = scenarios.find((s) => s.preset.id === activeId) ?? scenarios[0]!;
  const { verdict } = active;

  return (
    <div className="flex flex-col gap-4">
      {/* Onglets : chacun porte déjà le verdict que le moteur lui donne, donc
          on voit les quatre réponses possibles d'un coup d'œil, avant même
          de cliquer. */}
      <div
        role="tablist"
        aria-label="Situations typiques"
        className="grid grid-cols-2 gap-2 md:grid-cols-4"
      >
        {scenarios.map(({ preset, verdict: v }) => {
          const selected = preset.id === active.preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setActiveId(preset.id)}
              className="flex flex-col items-start gap-1.5 rounded-xl p-3 text-left transition-colors"
              style={{
                backgroundColor: selected ? "var(--color-bg)" : "transparent",
                border: `1.5px solid ${selected ? "var(--color-accent)" : "var(--color-border)"}`,
              }}
            >
              <span className="text-sm font-bold">{preset.label}</span>
              <VerdictBadge verdict={v.verdict} />
            </button>
          );
        })}
      </div>

      {/* Le panneau reprend la mise en forme de la carte « à tourner en
          priorité » du tableau de bord : c'est littéralement ce que le
          visiteur retrouvera une fois connecté. */}
      <div
        className="flex flex-col gap-4 rounded-2xl p-5"
        style={{ backgroundColor: "var(--color-bg)", border: "1px solid var(--color-border)" }}
        aria-live="polite"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-[family-name:var(--font-display)] text-lg font-extrabold">
              {active.preset.label}
            </p>
            <p className="text-sm text-[color:var(--color-ink-muted)]">
              {active.preset.hint}
            </p>
          </div>
          <VerdictBadge verdict={verdict.verdict} />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Stat
            label="Où en est le produit"
            value={PHASE_LABELS[verdict.phase].short}
          />
          <Stat
            label="Concurrence"
            value={`${verdict.saturationScore} sur 100`}
            bar={verdict.saturationScore}
          />
          <Stat
            label="Il te reste"
            value={
              verdict.windowDaysRemaining.high > 0
                ? `${verdict.windowDaysRemaining.low}–${verdict.windowDaysRemaining.high} jours`
                : "la vague est passée"
            }
          />
        </div>

        {/* Le raisonnement est le texte le plus lu du produit — il s'affiche
            sur le tableau de bord et sur la fiche produit. L'afficher ici,
            c'est montrer la vraie sortie, pas un résumé écrit pour la
            vitrine. */}
        <ul className="flex flex-col gap-1.5">
          {verdict.reasoning.map((line) => (
            <li
              key={line}
              className="flex gap-2 text-sm leading-relaxed text-[color:var(--color-ink)]"
            >
              <span aria-hidden style={{ color: "var(--color-ink-muted)" }}>
                •
              </span>
              <span>{line}</span>
            </li>
          ))}
        </ul>

        <p className="text-xs leading-relaxed text-[color:var(--color-ink-muted)]">
          DÉMO : le calcul ci-dessus tourne réellement dans ton navigateur,
          avec le moteur de l&apos;application, mais les scénarios ne sont pas des
          relevés live d&apos;un produit TikTok Shop.{" "}
          <Link href="/methode" className="underline">
            Pousse les curseurs toi-même
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

function Stat({ label, value, bar }: { label: string; value: string; bar?: number }) {
  return (
    <div
      className="flex flex-col gap-1 rounded-xl p-3"
      style={{ backgroundColor: "var(--color-surface)" }}
    >
      <span className="text-[11px] font-semibold tracking-wide text-[color:var(--color-ink-muted)] uppercase">
        {label}
      </span>
      <span className="font-[family-name:var(--font-display)] text-base font-bold">
        {value}
      </span>
      {bar !== undefined && (
        <span
          className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full"
          style={{ backgroundColor: "var(--color-border)" }}
          aria-hidden
        >
          <span
            className="block h-full rounded-full transition-[width] duration-500"
            style={{
              width: `${Math.min(100, Math.max(0, bar))}%`,
              backgroundColor:
                bar > 55 ? "var(--color-coral)" : "var(--color-success)",
            }}
          />
        </span>
      )}
    </div>
  );
}
