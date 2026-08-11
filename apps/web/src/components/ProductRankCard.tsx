"use client";

import Link from "next/link";

import { useState } from "react";
import { productImageUrl } from "@/lib/product-image";
import type { EstimatedRange } from "@kairos/shared";
import type { ProductRankItem } from "@/types/product-rank-item";
import { LockedValue } from "./PaywallGate";
import { EstimatedValue } from "./EstimatedValue";
import { VerdictBadge } from "./VerdictBadge";
import { commissionShort } from "@/lib/format/product";

const TREND_ICON: Record<ProductRankItem["salesTrend"], string> = {
  up: "↗",
  down: "↘",
  flat: "→",
};

const TREND_COLOR: Record<ProductRankItem["salesTrend"], string> = {
  up: "var(--color-success)",
  down: "var(--color-coral)",
  flat: "var(--color-ink-muted)",
};

export function ProductRankCard({
  item,
  saved,
  onToggleSave,
  estimatedEarnings,
  locked = false,
}: {
  item: ProductRankItem;
  saved: boolean;
  onToggleSave: (item: ProductRankItem) => void;
  // null = pas de profil utilisateur connu pour calculer un gain
  // personnalisé (ex. non connecté) — voir RankingList, computeEarnings
  // (packages/core).
  estimatedEarnings?: EstimatedRange | null;
  // Plan Radar au-delà du top 10 (§6.5) : la ligne reste entièrement
  // visible (produit, verdict, tendance) — seul le chiffre de gain est
  // flouté, pattern repris de la concurrence (Kalodata) plutôt que de
  // cacher la ligne entière derrière un mur générique.
  locked?: boolean;
}) {
  const [pending, setPending] = useState(false);
  // Un lien CDN TikTok est signé et peut expirer : on retombe alors sur
  // l'icône plutôt que d'afficher une image cassée.
  const [imageFailed, setImageFailed] = useState(false);

  async function handleToggle() {
    setPending(true);
    try {
      await onToggleSave(item);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="kai-card flex gap-3">
      <span className="w-5 shrink-0 pt-1 text-center text-sm font-bold text-[color:var(--color-ink-muted)]">
        {item.rank}
      </span>

      <div
        className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl text-2xl"
        style={{ backgroundColor: "var(--color-surface-raised)", border: "1px solid var(--color-border)" }}
        aria-hidden
      >
        {/* `<img>` et non next/image : les visuels viennent du CDN TikTok,
            dont les sous-domaines changent (p16/p19-oec-general-useastN…).
            Les déclarer un par un dans remotePatterns casserait l'affichage
            au premier domaine nouveau, et l'optimisation Next exige un
            serveur — exclu sur le plan Spark.
            productImageUrl() réécrit le gabarit de taille du CDN : les URL
            collectées demandent du 3000×3000 (~150 Ko) pour une vignette de
            56 px, soit ~14 Mo sur une page de 90 produits. */}
        {item.imageUrl && !imageFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={productImageUrl(item.imageUrl) ?? undefined}
            alt=""
            loading="lazy"
            decoding="async"
            width={56}
            height={56}
            className="h-full w-full object-cover"
            onError={() => setImageFailed(true)}
          />
        ) : (
          (item.emoji ?? "📦")
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          {/* Une ligne de classement mène enfin quelque part : la fiche
              produit (route fixe + query string, donc statique — voir
              app/produit/page.tsx). Le titre seul est cliquable pour ne pas
              capter le tap destiné à l'étoile. */}
          <Link href={`/produit?id=${encodeURIComponent(item.id)}`} className="min-w-0">
            <p className="truncate text-sm font-semibold">{item.title}</p>
            <p className="text-xs text-[color:var(--color-ink-muted)]">{item.shopName}</p>
          </Link>
          <button
            type="button"
            onClick={handleToggle}
            disabled={pending}
            aria-label={saved ? "Retirer de la watchlist" : "Ajouter à la watchlist"}
            className="shrink-0 text-lg leading-none disabled:opacity-40"
            style={{ color: saved ? "var(--color-coral)" : "var(--color-border)" }}
          >
            {saved ? "★" : "☆"}
          </button>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <VerdictBadge verdict={item.verdict} />
          <span
            className="text-xs font-semibold"
            style={{ color: TREND_COLOR[item.salesTrend] }}
          >
            {TREND_ICON[item.salesTrend]}
          </span>
          <span className="text-xs text-[color:var(--color-ink-muted)]">
            {commissionShort(item.commissionRatePct, item.commissionIsEstimated)} commission
          </span>
        </div>

        <p className="mt-2 text-sm">
          <span className="text-[color:var(--color-ink-muted)]">Gains estimés </span>
          {/* Ligne visible, chiffre masqué : cacher la ligne entière
              ferait croire que le produit n'existe pas, alors que le
              classement est justement ce que le plan gratuit offre. */}
          {locked ? (
            <LockedValue hint="Tes gains sur tous les produits — plan Creator" />
          ) : estimatedEarnings ? (
            <EstimatedValue range={estimatedEarnings} format={(v) => `${v}€`} />
          ) : (
            <span className="text-[color:var(--color-ink-muted)] italic">
              connecte-toi pour voir tes gains
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
