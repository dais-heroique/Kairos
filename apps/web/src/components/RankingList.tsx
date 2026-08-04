"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { computeEarnings, DEFAULT_EARNINGS_CONFIG } from "@kairos/core";
import { entitlementsOf, type EstimatedRange } from "@kairos/shared";
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

  // Droits centralisés (packages/shared/src/entitlements.ts) plutôt qu'un
  // test de slug réécrit ici : le compte fondateur et les admins voient
  // tout sans qu'on touche à leur document `plan`, protégé par les règles.
  const entitlements = entitlementsOf(userDoc);
  const isFreePlan = !entitlements.fullRankings;
  const lockedCount = isFreePlan ? Math.max(0, items.length - FREE_PLAN_LIMIT) : 0;

  // Gains personnalisés — jamais du GMV global (règle invariante #5) :
  // computeEarnings (packages/core, Lot 1) à partir du profil réel de
  // l'utilisateur (vues moyennes, fourchette d'abonnés). Uniquement pour
  // les lignes déverrouillées — inutile de calculer un gain qu'on va
  // masquer (voir ProductRankCard, pattern "ligne visible, chiffre flouté"
  // repris de la concurrence plutôt que de cacher la ligne entière).
  const earningsByItem = useMemo(() => {
    const map = new Map<string, EstimatedRange>();
    if (!userDoc) return map;
    const unlocked = isFreePlan ? items.slice(0, FREE_PLAN_LIMIT) : items;
    for (const item of unlocked) {
      map.set(
        item.id,
        computeEarnings({
          expectedViews: userDoc.profile.avgViews,
          followerRange: userDoc.profile.followerRange,
          niche: userDoc.profile.niches[0] ?? "",
          medianConversionRate: DEFAULT_EARNINGS_CONFIG.defaultConversionRate,
          priceCents: item.priceCents,
          commissionRatePct: item.commissionRatePct,
          estimatedReturnRatePct: DEFAULT_EARNINGS_CONFIG.defaultReturnRatePct,
        }),
      );
    }
    return map;
  }, [items, userDoc, isFreePlan]);

  // Rien ne force l'onboarding à être terminé (RequireAuth ne vérifie que
  // l'authentification) : on peut donc arriver ici avec `avgViews` à 0,
  // auquel cas aucun gain n'est calculable. Le dire, plutôt que d'aligner
  // des tirets sans explication.
  const profileIncomplete = !!userDoc && userDoc.profile.avgViews === 0;

  return (
    <div className="flex flex-col gap-2">
      {profileIncomplete && (
        <div className="kai-card flex flex-col gap-1 text-sm">
          <p className="font-[family-name:var(--font-display)] font-bold">
            Tes gains ne sont pas encore calculables
          </p>
          <p className="text-[color:var(--color-ink-muted)]">
            Il manque tes vues moyennes par vidéo — c&apos;est ce qui convertit
            une commission en euros.{" "}
            <Link href="/onboarding/profil" className="underline">
              Compléter mon profil
            </Link>
          </p>
        </div>
      )}
      {items.map((item, index) => (
        <ProductRankCard
          key={item.id}
          item={item}
          saved={saved.has(item.id)}
          onToggleSave={handleToggleSave}
          estimatedEarnings={earningsByItem.get(item.id) ?? null}
          locked={isFreePlan && index >= FREE_PLAN_LIMIT}
        />
      ))}

      {lockedCount > 0 && (
        <div className="kai-card flex flex-col items-center gap-2 text-center">
          <p className="font-[family-name:var(--font-display)] font-bold">
            {lockedCount} gains verrouillés
          </p>
          <p className="text-sm text-[color:var(--color-ink-muted)]">
            Le plan Radar (gratuit) affiche le classement complet, mais masque
            les gains estimés au-delà du top {FREE_PLAN_LIMIT}. Passe en
            Creator ou Pro pour tout voir.
          </p>
        </div>
      )}
    </div>
  );
}
