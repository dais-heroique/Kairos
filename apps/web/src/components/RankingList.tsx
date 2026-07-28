"use client";

import { useEffect, useState } from "react";
import type { ProductRankItem } from "@/lib/mock/products";
import { useAuth } from "@/lib/firebase/auth-context";
import {
  addToWatchlist,
  getWatchlistIds,
  removeFromWatchlist,
} from "@/lib/firestore/watchlist";
import { ProductRankCard } from "./ProductRankCard";

// Radar (gratuit) voit le top 10, le reste est verrouillé — §6.5. Creator
// et Pro voient tout. Les données restent mock tant que Phase 2-4 (moteur
// de verdict + collecte + classements réels) ne sont pas construites.
const FREE_PLAN_LIMIT = 10;

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

  return (
    <div className="flex flex-col gap-2">
      {visible.map((item) => (
        <ProductRankCard
          key={item.id}
          item={item}
          saved={saved.has(item.id)}
          onToggleSave={handleToggleSave}
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
