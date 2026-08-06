"use client";

import { useEffect, useState } from "react";
import { getRankingDoc } from "@/server/firestore/rankings";

// Ligne d'agrégat (boutique ou mot-clé). Volontairement distincte de
// ProductRankItem : ces classements n'ont ni verdict, ni commission, ni
// gain — les afficher avec la carte produit ferait croire à des données
// qui n'existent pas à ce niveau.
interface AggregateItem {
  id: string;
  rank: number;
  title: string;
  productCount?: number;
  soldTotal?: number;
  priceCents?: number;
}

export function CategoryRankingList({
  type,
  emptyMessage,
  countLabel,
}: {
  type: string;
  emptyMessage: string;
  countLabel: string;
}) {
  const [items, setItems] = useState<AggregateItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    getRankingDoc(type, "FR", "7d")
      .then((doc) => {
        if (!cancelled) setItems(((doc?.items ?? []) as unknown as AggregateItem[]) ?? []);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, [type]);

  if (items === null) {
    return <p className="text-sm text-[color:var(--color-ink-muted)]">Chargement…</p>;
  }

  if (items.length === 0) {
    return (
      <p className="kai-card text-sm text-[color:var(--color-ink-muted)]">{emptyMessage}</p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-[color:var(--color-ink-muted)]">
        {items.length} {items.length > 1 ? "entrées" : "entrée"}
      </p>
      {items.map((item) => (
        <div key={item.id} className="kai-card flex items-center gap-3">
          <span className="w-6 shrink-0 text-center text-sm font-bold text-[color:var(--color-ink-muted)]">
            {item.rank}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{item.title}</p>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[color:var(--color-ink-muted)]">
              {item.productCount !== undefined && (
                <span>
                  {item.productCount} {countLabel}
                  {item.productCount > 1 ? "s" : ""}
                </span>
              )}
              {item.soldTotal !== undefined && item.soldTotal > 0 && (
                <span>{item.soldTotal.toLocaleString("fr-FR")} vendus</span>
              )}
              {item.priceCents !== undefined && item.priceCents > 0 && (
                <span>{(item.priceCents / 100).toFixed(2)} € en moyenne</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
