"use client";

import { useEffect, useState } from "react";
import { RankingList } from "@/components/RankingList";
import { useAuth } from "@/lib/firebase/auth-context";
import { primaryMarketOf } from "@/lib/market";
import { getRankingPageData } from "@/server/firestore/rankings";
import type { ProductRankItem } from "@/types/product-rank-item";

// Pour les classements dont les lignes sont des produits (Nouveautés) :
// même carte que /classements/produits — verdict, prix, ventes, watchlist —
// plutôt qu'un rendu d'agrégat qui perdrait ces informations.
export function ProductRankingList({
  type,
  emptyMessage,
}: {
  type: string;
  emptyMessage: string;
}) {
  const { userDoc } = useAuth();
  const market = primaryMarketOf(userDoc);
  const [items, setItems] = useState<ProductRankItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    getRankingPageData(type, market, "7d")
      .then((data) => {
        if (!cancelled) setItems(data.items);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, [market, type]);

  if (items === null) {
    return <p className="text-sm text-[color:var(--color-ink-muted)]">Chargement…</p>;
  }
  if (items.length === 0) {
    return <p className="kai-card text-sm text-[color:var(--color-ink-muted)]">{emptyMessage}</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-[color:var(--color-ink-muted)]">
        {items.length} produit{items.length > 1 ? "s" : ""}
      </p>
      <RankingList items={items} />
    </div>
  );
}
