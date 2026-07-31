"use client";

import { useState } from "react";
import type { EstimatedRange } from "@kairos/shared";
import type { ProductRankItem } from "@/types/product-rank-item";
import { EstimatedValue } from "./EstimatedValue";
import { VerdictBadge } from "./VerdictBadge";

const TREND_ICON: Record<ProductRankItem["salesTrend"], string> = {
  up: "↗",
  down: "↘",
  flat: "→",
};

const TREND_COLOR: Record<ProductRankItem["salesTrend"], string> = {
  up: "var(--color-success)",
  down: "var(--color-coral)",
  flat: "var(--color-ink-muted)",
};

export function ProductRankCard({
  item,
  saved,
  onToggleSave,
  estimatedEarnings,
  locked = false,
}: {
  item: ProductRankItem;
  saved: boolean;
  onToggleSave: (item: ProductRankItem) => void;
  // null = pas de profil utilisateur connu pour calculer un gain
  // personnalisé (ex. non connecté) — voir RankingList, computeEarnings
  // (packages/core).
  estimatedEarnings?: EstimatedRange | null;
  // Plan Radar au-delà du top 10 (§6.5) : la ligne reste entièrement
  // visible (produit, verdict, tendance) — seul le chiffre de gain est
  // flouté, pattern repris de la concurrence (Kalodata) plutôt que de
  // cacher la ligne entière derrière un mur générique.
  locked?: boolean;
}) {
  const [pending, setPending] = useState(false);

  async function handleToggle() {
    setPending(true);
    try {
      await onToggleSave(item);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="kai-card flex gap-3">
      <span className="w-5 shrink-0 pt-1 text-center text-sm font-bold text-[color:var(--color-ink-muted)]">
        {item.rank}
      </span>

      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl"
        style={{ backgroundColor: "var(--color-surface-raised)", border: "1px solid var(--color-border)" }}
        aria-hidden
      >
        {item.emoji ?? "📦"}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{item.title}</p>
            <p className="text-xs text-[color:var(--color-ink-muted)]">{item.shopName}</p>
          </div>
          <button
            type="button"
            onClick={handleToggle}
            disabled={pending}
            aria-label={saved ? "Retirer de la watchlist" : "Ajouter à la watchlist"}
            className="shrink-0 text-lg leading-none disabled:opacity-40"
            style={{ color: saved ? "var(--color-coral)" : "var(--color-border)" }}
          >
            {saved ? "★" : "☆"}
          </button>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <VerdictBadge verdict={item.verdict} />
          <span
            className="text-xs font-semibold"
            style={{ color: TREND_COLOR[item.salesTrend] }}
          >
            {TREND_ICON[item.salesTrend]}
          </span>
          <span className="text-xs text-[color:var(--color-ink-muted)]">
            {item.commissionRatePct}% commission
          </span>
        </div>

        <p className="mt-2 text-sm">
          <span className="text-[color:var(--color-ink-muted)]">Gains estimés </span>
          {locked ? (
            <span
              className="select-none rounded font-[family-name:var(--font-mono)] blur-[3px]"
              aria-hidden
            >
              **-**€
            </span>
          ) : estimatedEarnings ? (
            <EstimatedValue range={estimatedEarnings} format={(v) => `${v}€`} />
          ) : (
            <span className="text-[color:var(--color-ink-muted)] italic">
              connecte-toi pour voir tes gains
            </span>
          )}
          {locked && (
            <span className="ml-2 text-xs font-semibold" style={{ color: "var(--color-coral)" }}>
              🔒 Creator/Pro
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
