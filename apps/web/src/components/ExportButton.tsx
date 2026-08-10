"use client";

import { entitlementsOf } from "@kairos/shared";
import { useAuth } from "@/lib/firebase/auth-context";
import type { ProductRankItem } from "@/types/product-rank-item";
import { downloadCsv, rankingToCsv } from "@/lib/pro/export-csv";

// Export CSV — capacité Pro.
//
// Le bouton disparaît purement et simplement pour qui n'y a pas droit,
// plutôt que d'afficher un cadenas : à côté d'un classement déjà entier et
// utilisable, un verrou de plus sur une commodité ferait mesquin. Le plan
// Pro se vend sur la page de tarifs, pas en agitant des cadenas.

export function ExportButton({
  items,
  nom,
}: {
  items: ProductRankItem[];
  nom: string;
}) {
  const { userDoc } = useAuth();

  if (!entitlementsOf(userDoc).can("dataExport") || items.length === 0) return null;

  function handleClick() {
    const jour = new Date().toISOString().slice(0, 10);
    downloadCsv(rankingToCsv(items), `kairos-${nom}-${jour}.csv`);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="rounded-lg px-3 py-1.5 text-xs font-semibold"
      style={{
        backgroundColor: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        color: "var(--color-ink-muted)",
      }}
    >
      Exporter en tableau ({items.length})
    </button>
  );
}
