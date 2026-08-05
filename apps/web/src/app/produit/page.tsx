"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { computeEarnings, DEFAULT_EARNINGS_CONFIG } from "@kairos/core";
import { entitlementsOf, type ProductSnapshot } from "@kairos/shared";
import { BottomNav } from "@/components/BottomNav";
import { EstimatedValue } from "@/components/EstimatedValue";
import { RequireAuth } from "@/components/RequireAuth";
import { SnapshotChart } from "@/components/SnapshotChart";
import { VerdictBadge } from "@/components/VerdictBadge";
import { useAuth } from "@/lib/firebase/auth-context";
import { getProductSnapshots } from "@/lib/firestore/product-entry";
import { addToWatchlist, getWatchlistIds } from "@/lib/firestore/watchlist";
import { windowRangeOf } from "@/lib/dashboard/build-dashboard";
import { getRankingPageData } from "@/server/firestore/rankings";
import type { ProductRankItem } from "@/types/product-rank-item";

// Fiche produit — la page qui manquait complètement.
//
// `/produit/[id]` existe déjà mais a été neutralisée pour rester sur le
// plan Spark : une route dynamique force Next à générer une Cloud
// Function, donc le plan Blaze (décision #11). D'où cette route **fixe**
// qui lit l'identifiant dans la query string : `/produit?id=xxx` est une
// page 100 % statique, et tout le travail se fait dans le navigateur.
// Aucun coût, aucune fonction déployée, et le détail existe enfin.

function ProduitContent() {
  const params = useSearchParams();
  const productId = params.get("id") ?? "";
  const { firebaseUser, userDoc } = useAuth();

  const [item, setItem] = useState<ProductRankItem | null | undefined>(undefined);
  const [snapshots, setSnapshots] = useState<ProductSnapshot[] | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!productId) return;
    // Le document de classement porte déjà tout l'affichage : une lecture
    // au lieu d'une par produit.
    Promise.all([
      getRankingPageData("products", "FR", "7d"),
      getRankingPageData("opportunities", "FR", "7d"),
    ]).then(([a, b]) => {
      const found =
        a.items.find((i) => i.id === productId) ?? b.items.find((i) => i.id === productId) ?? null;
      setItem(found);
    });
    getProductSnapshots(productId).then(setSnapshots).catch(() => setSnapshots([]));
  }, [productId]);

  useEffect(() => {
    if (!firebaseUser || !productId) return;
    getWatchlistIds(firebaseUser.uid).then((ids) => setSaved(ids.has(productId)));
  }, [firebaseUser, productId]);

  const entitlements = entitlementsOf(userDoc);

  const earnings = useMemo(() => {
    if (!item || !userDoc) return null;
    return computeEarnings({
      expectedViews: userDoc.profile.avgViews,
      followerRange: userDoc.profile.followerRange,
      niche: userDoc.profile.niches[0] ?? "",
      medianConversionRate: DEFAULT_EARNINGS_CONFIG.defaultConversionRate,
      priceCents: item.priceCents,
      commissionRatePct: item.commissionRatePct,
      estimatedReturnRatePct: DEFAULT_EARNINGS_CONFIG.defaultReturnRatePct,
    });
  }, [item, userDoc]);

  if (!productId) {
    return (
      <p className="kai-card m-5 text-sm text-[color:var(--color-ink-muted)]">
        Aucun produit demandé.{" "}
        <Link href="/classements/produits" className="underline">
          Retour aux classements
        </Link>
      </p>
    );
  }

  if (item === undefined) {
    return <p className="p-5 text-sm text-[color:var(--color-ink-muted)]">Chargement…</p>;
  }

  if (item === null) {
    return (
      <p className="kai-card m-5 text-sm text-[color:var(--color-ink-muted)]">
        Ce produit n&apos;est pas dans le classement du jour.{" "}
        <Link href="/classements/produits" className="underline">
          Voir les classements
        </Link>
      </p>
    );
  }

  const eur = (v: number) =>
    v.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

  return (
    <div className="flex flex-1 flex-col gap-4 px-5 py-4">
      <Link href="/tableau-de-bord" className="text-sm underline">
        ← Retour
      </Link>

      <div className="flex items-start gap-3">
        <span className="text-4xl">{item.emoji ?? "📦"}</span>
        <div className="min-w-0">
          <h1 className="font-[family-name:var(--font-display)] text-xl font-extrabold leading-tight">
            {item.title}
          </h1>
          <p className="text-sm text-[color:var(--color-ink-muted)]">
            {item.shopName} · {eur(item.priceCents / 100)} · {item.commissionRatePct}% de
            commission
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <VerdictBadge verdict={item.verdict} />
        {item.phase && (
          <span className="rounded-full border px-2 py-0.5 text-xs" style={{ borderColor: "var(--color-border)" }}>
            phase {item.phase}
          </span>
        )}
        {typeof item.saturationScore === "number" && (
          <span className="rounded-full border px-2 py-0.5 text-xs" style={{ borderColor: "var(--color-border)" }}>
            saturation {item.saturationScore}/100
          </span>
        )}
      </div>

      {/* Le raisonnement, enfin visible. C'est la différence entre un
          tableau de chiffres et un outil qui prend position. */}
      {item.reasoning && item.reasoning.length > 0 && (
        <section className="kai-card flex flex-col gap-2">
          <h2 className="font-[family-name:var(--font-display)] font-bold">
            Pourquoi ce verdict
          </h2>
          <ul className="flex flex-col gap-1.5">
            {item.reasoning.map((line) => (
              <li key={line} className="text-sm leading-relaxed text-[color:var(--color-ink-muted)]">
                • {line}
              </li>
            ))}
          </ul>
          {windowRangeOf(item) && (
            <p className="text-sm">
              <span className="text-[color:var(--color-ink-muted)]">
                Fenêtre avant saturation :{" "}
              </span>
              <EstimatedValue
                range={windowRangeOf(item)!}
                format={(v) => `${v} jours`}
                className="font-semibold"
              />
            </p>
          )}
        </section>
      )}

      <section className="kai-card flex flex-col gap-2">
        <h2 className="font-[family-name:var(--font-display)] font-bold">
          Tes gains pour une vidéo
        </h2>
        {earnings ? (
          <EstimatedValue range={earnings} format={eur} className="text-lg font-bold" />
        ) : (
          <p className="text-sm text-[color:var(--color-ink-muted)]">
            Renseigne ton profil pour voir une estimation.
          </p>
        )}
        <p className="text-xs text-[color:var(--color-ink-muted)]">
          Sur la base de {userDoc?.profile.avgViews.toLocaleString("fr-FR") ?? "—"} vues,
          commission {item.commissionRatePct}%, {DEFAULT_EARNINGS_CONFIG.defaultReturnRatePct}%
          de retours déduits.
        </p>
      </section>

      {/* L'historique quotidien est la donnée la plus chère du produit et
          n'était visualisée nulle part. */}
      <section className="kai-card flex flex-col gap-2">
        <h2 className="font-[family-name:var(--font-display)] font-bold">Historique</h2>
        {entitlements.productDetail ? (
          snapshots === null ? (
            <p className="text-sm text-[color:var(--color-ink-muted)]">Chargement…</p>
          ) : snapshots.length === 0 ? (
            <p className="text-sm text-[color:var(--color-ink-muted)]">
              Aucun relevé disponible pour ce produit.
            </p>
          ) : (
            <SnapshotChart snapshots={snapshots} />
          )
        ) : (
          <p className="text-sm text-[color:var(--color-ink-muted)]">
            L&apos;historique jour par jour est réservé aux plans Creator et Pro.
          </p>
        )}
      </section>

      <div className="flex gap-2 pb-4">
        <button
          type="button"
          onClick={async () => {
            if (!firebaseUser) return;
            await addToWatchlist(firebaseUser.uid, item.id);
            setSaved(true);
          }}
          disabled={saved}
          className="kai-btn-primary flex-1 disabled:opacity-50"
        >
          {saved ? "Dans ta watchlist ✓" : "Suivre ce produit"}
        </button>
        <Link
          href={`/simulateur?id=${encodeURIComponent(item.id)}`}
          className="kai-btn-outline flex-1 text-center"
        >
          Simuler
        </Link>
      </div>

      <Link
        href={`/brief?id=${encodeURIComponent(item.id)}`}
        className="kai-btn-outline mb-4 text-center"
      >
        Préparer le tournage →
      </Link>
    </div>
  );
}

export default function ProduitPage() {
  return (
    <RequireAuth>
      <div className="flex min-h-dvh flex-col">
        <BottomNav />
        <Suspense fallback={<p className="p-5 text-sm">Chargement…</p>}>
          <ProduitContent />
        </Suspense>
      </div>
    </RequireAuth>
  );
}
