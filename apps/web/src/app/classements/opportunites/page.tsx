"use client";

import { useEffect, useState } from "react";
import { RankingList } from "@/components/RankingList";
import { RankingMeta } from "@/components/RankingMeta";
import { getRankingPageData, type RankingPageData } from "@/server/firestore/rankings";

// Voir classements/produits/page.tsx : chargement client, pas au build.
export default function OpportunitesPage() {
  const [data, setData] = useState<RankingPageData | null>(null);

  useEffect(() => {
    getRankingPageData("opportunities", "FR", "7d").then(setData);
  }, []);

  const items = data?.items ?? null;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-[color:var(--color-ink-muted)]">
        Phase précoce × commission élevée × vendeur fiable × faible
        saturation.
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
