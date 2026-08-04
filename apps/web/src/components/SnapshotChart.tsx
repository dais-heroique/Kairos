"use client";

import type { ProductSnapshot } from "@kairos/shared";

// L'historique quotidien est la donnée la plus chère du produit — un
// relevé par jour, saisi à la main, impossible à reconstituer après coup —
// et elle n'était visualisée nulle part. Or c'est la courbe qui fait
// comprendre le verdict : une phase de croissance ou une saturation se
// voient en une seconde, là où « saturation 62/100 » demande de faire
// confiance.
//
// SVG écrit à la main plutôt qu'une librairie de graphes : le poids de
// bundle d'une dépendance de graphes pour deux courbes ne se justifie pas,
// et une image inerte n'a besoin d'aucun runtime.

const WIDTH = 320;
const HEIGHT = 96;
const PAD = 4;

interface Series {
  label: string;
  color: string;
  values: number[];
}

function pathFor(values: number[], min: number, max: number): string {
  if (values.length === 0) return "";
  const span = max - min || 1;
  const stepX = values.length > 1 ? (WIDTH - PAD * 2) / (values.length - 1) : 0;
  return values
    .map((v, i) => {
      const x = PAD + i * stepX;
      const y = HEIGHT - PAD - ((v - min) / span) * (HEIGHT - PAD * 2);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function frenchDate(iso: string): string {
  const [, m, d] = iso.split("-");
  return d && m ? `${d}/${m}` : iso;
}

export function SnapshotChart({ snapshots }: { snapshots: ProductSnapshot[] }) {
  // 45 jours : au-delà, la courbe devient illisible sur un écran de
  // téléphone, et c'est aussi la fenêtre que le moteur exploite.
  const recent = snapshots.slice(-45);
  if (recent.length < 2) {
    return (
      <p className="text-sm text-[color:var(--color-ink-muted)]">
        Il faut au moins deux relevés pour tracer une courbe.
      </p>
    );
  }

  const sales = recent.map((s) => (s.estSalesLow + s.estSalesHigh) / 2);
  const competitors = recent.map((s) => s.competingShopCount);
  const creators = recent.map((s) => s.activeCreatorCount);

  // Ventes sur leur propre échelle ; concurrence et créateurs partagent la
  // leur, pour qu'on voie laquelle des deux monte le plus vite.
  const salesMin = Math.min(...sales);
  const salesMax = Math.max(...sales);
  const pressure = [...competitors, ...creators];
  const pressureMin = Math.min(...pressure);
  const pressureMax = Math.max(...pressure);

  const series: Series[] = [
    { label: "Ventes estimées", color: "var(--color-success)", values: sales },
    { label: "Boutiques concurrentes", color: "var(--color-coral)", values: competitors },
    { label: "Créateurs actifs", color: "var(--color-warning)", values: creators },
  ];

  const first = recent[0]!;
  const last = recent[recent.length - 1]!;
  const salesChange = sales[0]! > 0 ? (sales[sales.length - 1]! - sales[0]!) / sales[0]! : 0;

  return (
    <div className="flex flex-col gap-2">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        role="img"
        aria-label={`Évolution sur ${recent.length} relevés, du ${frenchDate(first.capturedDate)} au ${frenchDate(last.capturedDate)}`}
      >
        <path
          d={pathFor(sales, salesMin, salesMax)}
          fill="none"
          stroke="var(--color-success)"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <path
          d={pathFor(competitors, pressureMin, pressureMax)}
          fill="none"
          stroke="var(--color-coral)"
          strokeWidth="1.5"
          strokeDasharray="3 2"
        />
        <path
          d={pathFor(creators, pressureMin, pressureMax)}
          fill="none"
          stroke="var(--color-warning)"
          strokeWidth="1.5"
          strokeDasharray="1 2"
        />
      </svg>

      <div className="flex justify-between text-[10px] text-[color:var(--color-ink-muted)]">
        <span>{frenchDate(first.capturedDate)}</span>
        <span>
          {recent.length} relevés
          {recent.length < snapshots.length && ` (sur ${snapshots.length})`}
        </span>
        <span>{frenchDate(last.capturedDate)}</span>
      </div>

      <ul className="flex flex-wrap gap-x-3 gap-y-1">
        {series.map((s) => (
          <li key={s.label} className="flex items-center gap-1 text-[11px]">
            <span
              className="inline-block h-0.5 w-3 rounded"
              style={{ backgroundColor: s.color }}
              aria-hidden
            />
            <span className="text-[color:var(--color-ink-muted)]">{s.label}</span>
          </li>
        ))}
      </ul>

      <p className="text-xs text-[color:var(--color-ink-muted)]">
        Sur la période : ventes {salesChange >= 0 ? "+" : ""}
        {Math.round(salesChange * 100)}%, boutiques concurrentes {competitors[0]} →{" "}
        {competitors[competitors.length - 1]}, créateurs {creators[0]} →{" "}
        {creators[creators.length - 1]}.
      </p>
    </div>
  );
}
