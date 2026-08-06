"use client";

import { useMemo, useState } from "react";
import { MARKETS, RANKING_PERIODS, VERDICT_LABELS } from "@kairos/shared";
import type { Market, RankingPeriod, VerdictLabel } from "@kairos/shared";
import type { ProductRankItem } from "@/types/product-rank-item";

// Réglages des classements. Deux familles au comportement différent, et
// c'est volontairement visible dans l'interface :
//
//  - Période et marché changent le document lu dans Firestore → une lecture
//    supplémentaire à chaque changement (le budget de lecture par page est
//    testé, voir read-budget.test.ts).
//  - Tri et filtres ne touchent que la liste déjà chargée → aucune lecture,
//    donc réponse instantanée.

const PERIOD_LABELS: Record<RankingPeriod, string> = {
  "24h": "24 h",
  "7d": "7 jours",
  "30d": "30 jours",
};

const VERDICT_TEXT: Record<VerdictLabel, string> = {
  entrer_maintenant: "Entrer maintenant",
  avec_un_angle: "Avec un angle",
  risque: "Risque",
  eviter: "Éviter",
};

// Tris limités à ce que rankings/*.items[] contient réellement
// (voir types/product-rank-item.ts). Pas de tri « croissance » ni
// « opportunité » ici : ces scores ne sont pas embarqués dans les items de
// ce classement — l'opportunité a son propre document, exposé par
// /classements/opportunites. Proposer ces tris obligerait à inventer un
// ordre, ou à lire un produit à la fois.
export const SORT_OPTIONS = [
  { value: "rank", label: "Classement" },
  { value: "sold", label: "Ventes" },
  { value: "trend", label: "Tendance" },
  { value: "commission", label: "Commission" },
  { value: "price-asc", label: "Prix croissant" },
  { value: "price-desc", label: "Prix décroissant" },
] as const;
export type SortValue = (typeof SORT_OPTIONS)[number]["value"];

const TREND_ORDER: Record<ProductRankItem["salesTrend"], number> = {
  up: 0,
  flat: 1,
  down: 2,
};

const PRICE_BUCKETS = [
  { value: "all", label: "Tous les prix", min: 0, max: Infinity },
  { value: "lt20", label: "< 20 €", min: 0, max: 2000 },
  { value: "20-50", label: "20–50 €", min: 2000, max: 5000 },
  { value: "50-100", label: "50–100 €", min: 5000, max: 10000 },
  { value: "gt100", label: "> 100 €", min: 10000, max: Infinity },
] as const;
export type PriceBucket = (typeof PRICE_BUCKETS)[number]["value"];

export interface RankingFilters {
  period: RankingPeriod;
  market: Market;
  sort: SortValue;
  verdicts: Set<VerdictLabel>;
  trendUpOnly: boolean;
  price: PriceBucket;
}

export const DEFAULT_FILTERS: RankingFilters = {
  period: "7d",
  market: "FR",
  sort: "rank",
  verdicts: new Set(),
  trendUpOnly: false,
  price: "all",
};

/** Applique tri et filtres côté client. Période et marché sont déjà pris en
 *  compte en amont, au moment de la lecture Firestore. */
export function applyFilters(
  items: ProductRankItem[],
  f: RankingFilters,
): ProductRankItem[] {
  const bucket = PRICE_BUCKETS.find((b) => b.value === f.price) ?? PRICE_BUCKETS[0];

  const filtered = items.filter((item) => {
    if (f.verdicts.size > 0 && !f.verdicts.has(item.verdict)) return false;
    if (f.trendUpOnly && item.salesTrend !== "up") return false;
    if (item.priceCents < bucket.min || item.priceCents >= bucket.max) return false;
    return true;
  });

  // Copie avant tri : sort() mute, et `items` vient du state du parent.
  return [...filtered].sort((a, b) => {
    switch (f.sort) {
      case "price-asc":
        return a.priceCents - b.priceCents;
      case "price-desc":
        return b.priceCents - a.priceCents;
      case "sold":
        // Les produits sans donnée de ventes tombent en fin de liste plutôt
        // que d'être traités comme « 0 vendu ».
        return (b.soldTotal ?? -1) - (a.soldTotal ?? -1);
      case "commission":
        return b.commissionRatePct - a.commissionRatePct;
      case "trend":
        return TREND_ORDER[a.salesTrend] - TREND_ORDER[b.salesTrend] || a.rank - b.rank;
      default:
        return a.rank - b.rank;
    }
  });
}

export function RankingControls({
  filters,
  onChange,
  totalCount,
  visibleCount,
}: {
  filters: RankingFilters;
  onChange: (next: RankingFilters) => void;
  totalCount: number;
  visibleCount: number;
}) {
  // Sur mobile, la rangée de filtres occupait un tiers de l'écran avant le
  // premier produit. Elle est donc repliée par défaut sous les 768px, et
  // toujours dépliée au-dessus (`md:flex`), où la place ne manque pas.
  const [filtersOpen, setFiltersOpen] = useState(false);

  const activeFilterCount = useMemo(
    () =>
      filters.verdicts.size +
      (filters.trendUpOnly ? 1 : 0) +
      (filters.price === "all" ? 0 : 1),
    [filters],
  );

  function toggleVerdict(v: VerdictLabel) {
    const next = new Set(filters.verdicts);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    onChange({ ...filters, verdicts: next });
  }

  function reset() {
    onChange({
      ...filters,
      verdicts: new Set(),
      trendUpOnly: false,
      price: "all",
      sort: "rank",
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="kai-seg" role="group" aria-label="Période">
          {RANKING_PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              className="kai-seg-item"
              aria-pressed={filters.period === p}
              onClick={() => onChange({ ...filters, period: p })}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>

        <div className="kai-seg" role="group" aria-label="Marché">
          {MARKETS.map((m) => (
            <button
              key={m}
              type="button"
              className="kai-seg-item"
              aria-pressed={filters.market === m}
              onClick={() => onChange({ ...filters, market: m })}
            >
              {m}
            </button>
          ))}
        </div>

        <label className="ml-auto flex items-center gap-2">
          <span className="hidden text-xs font-semibold text-[color:var(--color-ink-muted)] sm:inline">
            Trier par
          </span>
          <select
            className="kai-select"
            aria-label="Trier par"
            value={filters.sort}
            onChange={(e) => onChange({ ...filters, sort: e.target.value as SortValue })}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          className="kai-chip md:hidden"
          aria-pressed={activeFilterCount > 0}
          aria-expanded={filtersOpen}
          onClick={() => setFiltersOpen((v) => !v)}
        >
          Filtres{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
        </button>
      </div>

      <div
        className={`${filtersOpen ? "flex" : "hidden"} flex-wrap items-center gap-2 md:flex`}
      >
        {VERDICT_LABELS.map((v) => (
          <button
            key={v}
            type="button"
            className="kai-chip"
            aria-pressed={filters.verdicts.has(v)}
            onClick={() => toggleVerdict(v)}
          >
            {VERDICT_TEXT[v]}
          </button>
        ))}

        <button
          type="button"
          className="kai-chip"
          aria-pressed={filters.trendUpOnly}
          onClick={() => onChange({ ...filters, trendUpOnly: !filters.trendUpOnly })}
        >
          En hausse
        </button>

        <select
          className="kai-select"
          value={filters.price}
          aria-label="Fourchette de prix"
          onChange={(e) => onChange({ ...filters, price: e.target.value as PriceBucket })}
        >
          {PRICE_BUCKETS.map((b) => (
            <option key={b.value} value={b.value}>
              {b.label}
            </option>
          ))}
        </select>

        {activeFilterCount > 0 ? (
          <button
            type="button"
            onClick={reset}
            className="text-xs font-semibold underline underline-offset-2"
            style={{ color: "var(--color-ink-muted)" }}
          >
            Tout effacer
          </button>
        ) : null}
      </div>

      <p className="text-xs text-[color:var(--color-ink-muted)]">
        {visibleCount === totalCount
          ? `${totalCount} produit${totalCount > 1 ? "s" : ""}`
          : `${visibleCount} sur ${totalCount} produit${totalCount > 1 ? "s" : ""}`}
      </p>
    </div>
  );
}
