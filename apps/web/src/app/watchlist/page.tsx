"use client";

import { useEffect, useState } from "react";
import { BottomNav } from "@/components/BottomNav";
import { ProductRankCard } from "@/components/ProductRankCard";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/lib/firebase/auth-context";
import { getWatchlistIds, removeFromWatchlist } from "@/lib/firestore/watchlist";
import { MOCK_PRODUCTS } from "@/lib/mock/products";

function WatchlistContent() {
  const { firebaseUser } = useAuth();
  const [saved, setSaved] = useState<Set<string> | null>(null);

  useEffect(() => {
    if (!firebaseUser) return;
    getWatchlistIds(firebaseUser.uid).then(setSaved);
  }, [firebaseUser]);

  async function handleToggleSave(item: (typeof MOCK_PRODUCTS)[number]) {
    if (!firebaseUser || !saved) return;
    await removeFromWatchlist(firebaseUser.uid, item.id);
    setSaved((prev) => {
      const next = new Set(prev);
      next.delete(item.id);
      return next;
    });
  }

  const items = MOCK_PRODUCTS.filter((p) => saved?.has(p.id));

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="px-5 pt-6 pb-2">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-extrabold">
          Watchlist
        </h1>
        <p className="mt-1 text-sm text-[color:var(--color-ink-muted)]">
          Ton pipeline — pas une liste de favoris.
        </p>
      </header>

      <div className="flex flex-1 flex-col gap-2 px-5 py-4">
        {saved && items.length === 0 && (
          <p className="text-sm text-[color:var(--color-ink-muted)]">
            Rien pour l&apos;instant — ajoute des produits depuis les
            classements (étoile ☆).
          </p>
        )}
        {items.map((item) => (
          <ProductRankCard
            key={item.id}
            item={item}
            saved
            onToggleSave={handleToggleSave}
          />
        ))}
      </div>

      <BottomNav />
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
