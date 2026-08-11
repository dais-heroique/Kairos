"use client";

import { useEffect, useState } from "react";
import type { WatchlistEntry, WatchlistStatus } from "@kairos/shared";
import { BottomNav } from "@/components/BottomNav";
import { RequireAuth } from "@/components/RequireAuth";
import { SampleRadarPrompt } from "@/components/SampleRadarPrompt";
import { useAuth } from "@/lib/firebase/auth-context";
import { getWatchlistEntries, updateWatchlistStatus } from "@/lib/firestore/watchlist";
import { getRankingPageData } from "@/server/firestore/rankings";
import type { ProductRankItem } from "@/types/product-rank-item";
import { VerdictBadge } from "@/components/VerdictBadge";
import { commissionLabel } from "@/lib/format/product";

// Le vrai pipeline (§ règle produit — "pas une liste de favoris") :
// watching → sample_requested → sample_received → filmed → posted →
// dropped. Le schéma existe déjà (packages/shared/src/user.ts,
// watchlistStatusSchema) — cette page l'affiche enfin.
const STATUS_ORDER: WatchlistStatus[] = [
  "watching",
  "sample_requested",
  "sample_received",
  "filmed",
  "posted",
  "dropped",
];

const STATUS_LABELS: Record<WatchlistStatus, string> = {
  watching: "En veille",
  sample_requested: "Échantillon demandé",
  sample_received: "Échantillon reçu",
  filmed: "Tourné",
  posted: "Publié",
  dropped: "Abandonné",
};

function WatchlistContent() {
  const { firebaseUser } = useAuth();
  const [entries, setEntries] = useState<WatchlistEntry[] | null>(null);
  // La watchlist ne stocke qu'un identifiant : la page affichait donc
  // « huile-ricin-cils-sourcils » là où l'utilisateur revient tous les
  // jours. Le document de classement porte déjà titre, emoji et verdict —
  // une lecture de plus (on reste très en deçà du budget de 5) suffit à
  // rendre la liste lisible. Un produit sorti du classement retombe sur
  // son identifiant plutôt que de disparaître.
  const [labels, setLabels] = useState<Map<string, ProductRankItem>>(new Map());

  useEffect(() => {
    if (!firebaseUser) return;
    getWatchlistEntries(firebaseUser.uid).then(setEntries);
    getRankingPageData("products", "FR", "7d")
      .then((data) => setLabels(new Map(data.items.map((i) => [i.id, i]))))
      .catch(() => setLabels(new Map()));
  }, [firebaseUser]);

  async function handleStatusChange(productId: string, status: WatchlistStatus) {
    if (!firebaseUser) return;
    await updateWatchlistStatus(firebaseUser.uid, productId, status);
    setEntries((prev) =>
      prev ? prev.map((e) => (e.productId === productId ? { ...e, status } : e)) : prev,
    );
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <BottomNav />

      <header className="kai-shell pt-6 pb-2">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-extrabold">
          Watchlist
        </h1>
        <p className="mt-1 text-sm text-[color:var(--color-ink-muted)]">
          Ton pipeline — pas une liste de favoris.
        </p>
      </header>

      <div className="flex flex-1 flex-col gap-2 kai-shell py-4">
        {entries && entries.length === 0 && (
          <p className="text-sm text-[color:var(--color-ink-muted)]">
            Rien pour l&apos;instant — ajoute des produits depuis les
            classements (étoile ☆).
          </p>
        )}
        {entries?.map((entry) => {
          const item = labels.get(entry.productId);
          return (
          <div key={entry.productId} className="flex flex-col gap-2">
            <div className="kai-card flex flex-col gap-2">
              <div className="flex items-start justify-between gap-3">
                <span className="min-w-0 text-sm font-semibold">
                  {item ? `${item.emoji ?? "📦"} ${item.title}` : entry.productId}
                </span>
                {item && <VerdictBadge verdict={item.verdict} />}
              </div>
              {item && (
                <p className="text-xs text-[color:var(--color-ink-muted)]">
                  {item.shopName} · {commissionLabel(item.commissionRatePct, item.commissionIsEstimated)}
                </p>
              )}
              <select
                value={entry.status}
                onChange={(e) =>
                  handleStatusChange(entry.productId, e.target.value as WatchlistStatus)
                }
                className="kai-input w-auto shrink-0"
                aria-label="Statut du pipeline"
              >
                {STATUS_ORDER.map((status) => (
                  <option key={status} value={status}>
                    {STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </div>

            {entry.status === "sample_requested" && (
              <SampleRadarPrompt
                productId={entry.productId}
                onRespond={(productId, accepted) =>
                  handleStatusChange(productId, accepted ? "sample_received" : "dropped")
                }
              />
            )}
          </div>
          );
        })}
      </div>
    </div>
  );
}

export default function WatchlistPage() {
  return (
    <RequireAuth>
      <WatchlistContent />
    </RequireAuth>
  );
}
