"use client";

import { useEffect, useMemo, useState } from "react";
import { computeEarnings, DEFAULT_EARNINGS_CONFIG } from "@kairos/core";
import type { EstimatedRange } from "@kairos/shared";
import type { ProductRankItem } from "@/types/product-rank-item";
import { useAuth } from "@/lib/firebase/auth-context";
import {
  addToWatchlist,
  getWatchlistIds,
  removeFromWatchlist,
} from "@/lib/firestore/watchlist";
import { ProductRankCard } from "./ProductRankCard";

// Radar (gratuit) voit le top 10, le reste est verrouillé — §6.5. Creator
// et Pro voient tout.
const FREE_PLAN_LIMIT = 10;

// Benchmark provisoire en l'absence de calibration par catégorie réelle
// (bigquery/08_calibration_factors.sql, vide tant que le Lot 1 de
// calibration n'est pas fait) — voir docs/STATE.md.
const DEFAULT_MEDIAN_CONVERSION_RATE = 0.015;

export function RankingList({ items }: { items: ProductRankItem[] }) {
  const { firebaseUser, userDoc } = useAuth();
  const [saved, setSaved] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!firebaseUser) return;
    getWatchlistIds(firebaseUser.uid).then(setSaved);
  }, [firebaseUser]);

  async function handleToggleSave(item: ProductRankItem) {
    if (!firebaseUser) return;
    if (saved.has(item.id)) {
      await removeFromWatchlist(firebaseUser.uid, item.id);
      setSaved((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    } else {
      await addToWatchlist(firebaseUser.uid, item.id);
      setSaved((prev) => new Set(prev).add(item.id));
    }
  }

  const isFreePlan = (userDoc?.plan.slug ?? "radar") === "radar";
  const visible = isFreePlan ? items.slice(0, FREE_PLAN_LIMIT) : items;
  const lockedCount = items.length - visible.length;

  // Gains personnalisés — jamais du GMV global (règle invariante #5) :
  // computeEarnings (packages/core, Lot 1) à partir du profil réel de
  // l'utilisateur (vues moyennes, fourchette d'abonnés).
  const earningsByItem = useMemo(() => {
    const map = new Map<string, EstimatedRange>();
    if (!userDoc) return map;
    for (const item of visible) {
      map.set(
        item.id,
        computeEarnings({
          expectedViews: userDoc.profile.avgViews,
          followerRange: userDoc.profile.followerRange,
          niche: userDoc.profile.niches[0] ?? "",
          medianConversionRate: DEFAULT_MEDIAN_CONVERSION_RATE,
          priceCents: item.priceCents,
          commissionRatePct: item.commissionRatePct,
          estimatedReturnRatePct: DEFAULT_EARNINGS_CONFIG.defaultReturnRatePct,
        }),
      );
    }
    return map;
  }, [visible, userDoc]);

  return (
    <div className="flex flex-col gap-2">
      {visible.map((item) => (
        <ProductRankCard
          key={item.id}
          item={item}
          saved={saved.has(item.id)}
          onToggleSave={handleToggleSave}
          estimatedEarnings={earningsByItem.get(item.id) ?? null}
        />
      ))}

      {lockedCount > 0 && (
        <div className="kai-card flex flex-col items-center gap-2 text-center">
          <p className="font-[family-name:var(--font-display)] font-bold">
            +{lockedCount} produits verrouillés
          </p>
          <p className="text-sm text-[color:var(--color-ink-muted)]">
            Le plan Radar (gratuit) affiche le top {FREE_PLAN_LIMIT}. Passe en
            Creator ou Pro pour voir le classement complet.
          </p>
        </div>
      )}
    </div>
  );
}
