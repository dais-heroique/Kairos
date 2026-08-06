"use client";

import { useEffect, useMemo, useState } from "react";
import {
  applyFilters,
  DEFAULT_FILTERS,
  RankingControls,
  type RankingFilters,
} from "@/components/RankingControls";
import { RankingList } from "@/components/RankingList";
import { RankingMeta } from "@/components/RankingMeta";
import { getRankingPageData, type RankingPageData } from "@/server/firestore/rankings";

// Voir classements/produits/page.tsx : chargement client, pas au build, et
// mêmes réglages (période/marché relisent Firestore, tri et filtres
// s'appliquent à la liste déjà chargée).
export default function OpportunitesPage() {
  const [data, setData] = useState<RankingPageData | null>(null);
  const [filters, setFilters] = useState<RankingFilters>(DEFAULT_FILTERS);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    getRankingPageData("opportunities", filters.market, filters.period)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        if (!cancelled) setData({ items: [], generatedAt: null, isDemo: false });
      });
    return () => {
      cancelled = true;
    };
  }, [filters.market, filters.period]);

  const items = data?.items ?? null;
  const visible = useMemo(
    () => (items ? applyFilters(items, filters) : []),
    [items, filters],
  );

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-[color:var(--color-ink-muted)]">
        Phase précoce × commission élevée × vendeur fiable × faible
        saturation.
      </p>
      {data && <RankingMeta generatedAt={data.generatedAt} isDemo={data.isDemo} />}

      <RankingControls
        filters={filters}
        onChange={setFilters}
        totalCount={items?.length ?? 0}
        visibleCount={visible.length}
      />

      {items === null ? (
        <p className="text-sm text-[color:var(--color-ink-muted)]">Chargement…</p>
      ) : items.length === 0 ? (
        <p className="kai-card text-sm text-[color:var(--color-ink-muted)]">
          Pas encore de données pour {filters.market} sur cette période — le
          pipeline quotidien n&apos;a pas encore tourné sur de vrais produits
          collectés.
        </p>
      ) : visible.length === 0 ? (
        <p className="kai-card text-sm text-[color:var(--color-ink-muted)]">
          Aucun produit ne correspond à ces filtres. Élargis la fourchette de
          prix ou retire un verdict.
        </p>
      ) : (
        <RankingList items={visible} />
      )}
    </div>
  );
}
