"use client";

import { useMemo, useState } from "react";
import { computeVerdict } from "@kairos/core";
import { EstimatedValue } from "@/components/EstimatedValue";
import { VerdictBadge } from "@/components/VerdictBadge";
import { SnapshotChart } from "@/components/SnapshotChart";
import {
  buildScenarioSnapshots,
  SCENARIO_BOUNDS,
  SCENARIO_PRESETS,
  type ScenarioParams,
} from "@/lib/demo/scenario";

// Le moteur de verdict est une fonction pure : il tourne dans le
// navigateur, gratuitement, à chaque mouvement de curseur. Autant s'en
// servir pour montrer plutôt que pour expliquer — une page qui décrit une
// méthode se lit une fois et s'oublie ; une méthode qu'on peut casser
// soi-même en poussant un curseur se comprend en dix secondes.
//
// Rien n'est truqué : `computeVerdict` reçoit ici exactement la même forme
// de données que sur un produit réel. Si le moteur évolue, cette page
// évolue avec lui — elle ne peut pas mentir sur le produit.

const PHASE_LABELS: Record<string, string> = {
  emergence: "Émergence",
  growth: "Croissance",
  late_growth: "Fin de croissance",
  maturity: "Maturité",
  decline: "Déclin",
};

interface SliderProps {
  label: string;
  hint: string;
  value: number;
  bounds: { min: number; max: number; step: number };
  format: (v: number) => string;
  onChange: (v: number) => void;
}

function Slider({ label, hint, value, bounds, format, onChange }: SliderProps) {
  return (
    <label className="flex flex-col gap-1">
      <span className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium">{label}</span>
        <span className="font-[family-name:var(--font-mono)] text-sm font-bold">
          {format(value)}
        </span>
      </span>
      <input
        type="range"
        min={bounds.min}
        max={bounds.max}
        step={bounds.step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--color-coral)]"
      />
      <span className="text-[11px] text-[color:var(--color-ink-muted)]">{hint}</span>
    </label>
  );
}

export function VerdictPlayground() {
  const [params, setParams] = useState<ScenarioParams>(SCENARIO_PRESETS[0]!.params);
  const [activePreset, setActivePreset] = useState<string | null>(SCENARIO_PRESETS[0]!.id);

  const snapshots = useMemo(() => buildScenarioSnapshots(params), [params]);
  const verdict = useMemo(() => computeVerdict(snapshots), [snapshots]);

  function update(patch: Partial<ScenarioParams>) {
    setParams((prev) => ({ ...prev, ...patch }));
    // Dès qu'on touche un curseur, on n'est plus sur un préréglage.
    setActivePreset(null);
  }

  // La barre de saturation reprend les couleurs des verdicts : la même
  // information doit se lire de la même façon partout dans le produit.
  const satColor =
    verdict.saturationScore <= 35
      ? "var(--color-success)"
      : verdict.saturationScore <= 55
        ? "var(--color-warning)"
        : "var(--color-coral)";

  return (
    <div className="flex flex-col gap-4">
      {/* --------- Préréglages : le raccourci pour qui ne veut rien régler --------- */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {SCENARIO_PRESETS.map((preset) => {
          const active = activePreset === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => {
                setParams(preset.params);
                setActivePreset(preset.id);
              }}
              className="shrink-0 rounded-xl border px-3 py-2 text-left transition"
              style={{
                borderColor: active ? "var(--color-coral)" : "var(--color-border)",
                backgroundColor: active ? "var(--color-coral-soft)" : "var(--color-surface-raised)",
              }}
            >
              <span
                className="block text-sm font-bold"
                style={{ color: active ? "var(--color-coral)" : "var(--color-ink)" }}
              >
                {preset.label}
              </span>
              <span className="block text-[11px] text-[color:var(--color-ink-muted)]">
                {preset.hint}
              </span>
            </button>
          );
        })}
      </div>

      {/* --------- Le verdict, qui bouge en direct --------- */}
      <div
        className="kai-card flex flex-col gap-3 border-l-4"
        style={{ borderColor: satColor }}
        aria-live="polite"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="scale-125 origin-left">
            <VerdictBadge verdict={verdict.verdict} />
          </div>
          <span className="text-right text-xs text-[color:var(--color-ink-muted)]">
            {PHASE_LABELS[verdict.phase] ?? verdict.phase}
            <br />
            {snapshots.length} relevés
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-[color:var(--color-ink-muted)]">Saturation</span>
            <span className="font-[family-name:var(--font-mono)] text-sm font-bold" style={{ color: satColor }}>
              {verdict.saturationScore}/100
            </span>
          </div>
          <div
            className="h-2 w-full overflow-hidden rounded-full"
            style={{ backgroundColor: "var(--color-surface-raised)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${verdict.saturationScore}%`, backgroundColor: satColor }}
            />
          </div>
        </div>

        {/* Une fenêtre de tir est une estimation : elle passe par
            <EstimatedValue>, comme partout ailleurs. La règle ESLint
            kairos/no-raw-estimate-number refuse d'ailleurs le contraire. */}
        <p className="text-sm">
          <span className="text-[color:var(--color-ink-muted)]">Fenêtre restante : </span>
          <EstimatedValue
            range={{
              low: verdict.windowDaysRemaining.low,
              high: verdict.windowDaysRemaining.high,
              confidence: verdict.windowDaysRemaining.confidence,
              method: "historical_regression",
            }}
            format={(v) => `${v} j`}
            className="font-bold"
          />
        </p>

        {/* Le raisonnement se réécrit à chaque mouvement — c'est lui qui
            rend le mécanisme lisible, pas la note. */}
        <ul className="flex flex-col gap-1">
          {verdict.reasoning.map((line) => (
            <li key={line} className="text-xs leading-relaxed text-[color:var(--color-ink-muted)]">
              • {line}
            </li>
          ))}
        </ul>
      </div>

      <div className="kai-card">
        <SnapshotChart snapshots={snapshots} />
      </div>

      {/* --------- Les curseurs --------- */}
      <div className="kai-card flex flex-col gap-4">
        <p className="text-xs text-[color:var(--color-ink-muted)]">
          Bouge un curseur : le verdict est recalculé par le moteur de
          production, pas par une animation.
        </p>

        <Slider
          label="Jours d'historique"
          hint="Un produit jeune n'est pas jugé comme un produit installé."
          value={params.days}
          bounds={SCENARIO_BOUNDS.days}
          format={(v) => `${v} j`}
          onChange={(days) => update({ days })}
        />
        <Slider
          label="Évolution des ventes"
          hint="Multiplicateur entre le premier et le dernier relevé."
          value={params.salesMultiplier}
          bounds={SCENARIO_BOUNDS.salesMultiplier}
          format={(v) => `×${v.toFixed(1)}`}
          onChange={(salesMultiplier) => update({ salesMultiplier })}
        />
        <Slider
          label="Boutiques concurrentes"
          hint="Le facteur le plus lourd : plus de vendeurs, moins de place."
          value={params.competingShops}
          bounds={SCENARIO_BOUNDS.competingShops}
          format={(v) => String(v)}
          onChange={(competingShops) => update({ competingShops })}
        />
        <Slider
          label="Créateurs actifs"
          hint="Si cinquante personnes ont fait la vidéo, la tienne arrive après."
          value={params.creators}
          bounds={SCENARIO_BOUNDS.creators}
          format={(v) => String(v)}
          onChange={(creators) => update({ creators })}
        />
        <Slider
          label="Baisse de prix"
          hint="Une guerre des prix signale des vendeurs qui bradent déjà."
          value={params.priceDropPct}
          bounds={SCENARIO_BOUNDS.priceDropPct}
          format={(v) => `−${v}%`}
          onChange={(priceDropPct) => update({ priceDropPct })}
        />
      </div>
    </div>
  );
}
