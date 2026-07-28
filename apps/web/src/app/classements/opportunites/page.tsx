"use client";

import { RankingList } from "@/components/RankingList";
import { MOCK_OPPORTUNITIES } from "@/lib/mock/products";

export default function OpportunitesPage() {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-[color:var(--color-ink-muted)]">
        Phase précoce × commission élevée × vendeur fiable × faible
        saturation. Données de démonstration — la collecte réelle arrive en
        Phase 3-4.
      </p>
      <RankingList items={MOCK_OPPORTUNITIES} />
    </div>
  );
}
