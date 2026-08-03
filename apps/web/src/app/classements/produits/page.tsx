"use client";

import { useEffect, useState } from "react";
import { RankingList } from "@/components/RankingList";
import { RankingMeta } from "@/components/RankingMeta";
import { getRankingPageData, type RankingPageData } from "@/server/firestore/rankings";

// Chargé côté client (pas au build) : les classements changent tant qu'on
// n'a pas de vraie collecte branchée (données de démo via /admin), et le
// plan Spark impose des pages statiques — ce composant fait donc le
// chargement après coup, comme /watchlist.
export default function ProduitsPage() {
  const [data, setData] = useState<RankingPageData | null>(null);

  useEffect(() => {
    getRankingPageData("products", "FR", "7d").then(setData);
  }, []);

  const items = data?.items ?? null;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-[color:var(--color-ink-muted)]">
        Trié par ventes estimées sur 7 jours.
      </p>
      {data && (
        <RankingMeta generatedAt={data.generatedAt} isDemo={data.isDemo} />
      )}
      {items === null ? (
        <p className="text-sm text-[color:var(--color-ink-muted)]">Chargement…</p>
      ) : items.length === 0 ? (
        <p className="kai-card text-sm text-[color:var(--color-ink-muted)]">
          Pas encore de données — le pipeline quotidien n&apos;a pas encore
          tourné sur de vrais produits collectés.
        </p>
      ) : (
        <RankingList items={items} />
      )}
    </div>
  );
}
