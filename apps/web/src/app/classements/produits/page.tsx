"use client";

import { RankingList } from "@/components/RankingList";
import { MOCK_PRODUCTS } from "@/lib/mock/products";

export default function ProduitsPage() {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-[color:var(--color-ink-muted)]">
        Trié par ventes estimées. Données de démonstration — la collecte
        réelle arrive en Phase 3-4.
      </p>
      <RankingList items={MOCK_PRODUCTS} />
    </div>
  );
}
