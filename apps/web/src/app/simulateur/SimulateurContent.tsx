"use client";

import { useEffect, useMemo, useState } from "react";
import { computeEarnings, DEFAULT_EARNINGS_CONFIG } from "@kairos/core";
import { BottomNav } from "@/components/BottomNav";
import { EstimatedValue } from "@/components/EstimatedValue";
import { useAuth } from "@/lib/firebase/auth-context";
import { getRankingPageData } from "@/server/firestore/rankings";
import type { ProductRankItem } from "@/types/product-rank-item";

// Position de départ du curseur, exprimée en pourcentage (le curseur, lui,
// reste librement réglable). Alignée sur DEFAULT_EARNINGS_CONFIG pour que
// le simulateur et les classements ne racontent pas deux histoires
// différentes du même produit — c'était le cas avec 1,5 % en dur ici.
const DEFAULT_CONVERSION_PCT = DEFAULT_EARNINGS_CONFIG.defaultConversionRate * 100;

export function SimulateurContent() {
  const { userDoc } = useAuth();
  const [products, setProducts] = useState<ProductRankItem[] | null>(null);
  const [productId, setProductId] = useState("");
  const [views, setViews] = useState(userDoc?.profile.avgViews || 20000);
  const [conversionPct, setConversionPct] = useState(DEFAULT_CONVERSION_PCT);

  useEffect(() => {
    getRankingPageData("products", "FR", "7d").then((data) => {
      setProducts(data.items);
      setProductId((current) => current || (data.items[0]?.id ?? ""));
    });
  }, []);

  const product = useMemo(
    () => products?.find((p) => p.id === productId) ?? products?.[0],
    [productId, products],
  );

  // Vrai moteur (packages/core, Lot 1) — plus de formule de démonstration
  // en dur. Toujours une fourchette + confiance, jamais un nombre nu.
  const earnings = useMemo(() => {
    if (!product) return null;
    return computeEarnings({
      expectedViews: views,
      followerRange: userDoc?.profile.followerRange ?? "1k_5k",
      niche: userDoc?.profile.niches[0] ?? "",
      medianConversionRate: conversionPct / 100,
      priceCents: product.priceCents,
      commissionRatePct: product.commissionRatePct,
      estimatedReturnRatePct: DEFAULT_EARNINGS_CONFIG.defaultReturnRatePct,
    });
  }, [views, conversionPct, product, userDoc]);

  if (products === null) {
    return (
      <div className="flex min-h-dvh flex-col">
        <BottomNav />
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-5 text-center">
          <p className="text-sm text-[color:var(--color-ink-muted)]">Chargement…</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex min-h-dvh flex-col">
        <BottomNav />
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-5 text-center">
          <p className="text-sm text-[color:var(--color-ink-muted)]">
            Pas encore de produits à simuler — reviens une fois le classement
            alimenté par la collecte réelle.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <BottomNav />

      <header className="px-5 pt-6 pb-2">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-extrabold">
          Simulateur de gains
        </h1>
        <p className="mt-1 text-sm text-[color:var(--color-ink-muted)]">
          Bouge les curseurs — le montant réagit en direct.
        </p>
      </header>

      <div className="flex flex-1 flex-col gap-6 px-5 py-4">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Produit
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className="kai-input"
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title} — {(p.priceCents / 100).toFixed(2)}€
              </option>
            ))}
          </select>
        </label>

        <div className="kai-card flex flex-col items-center gap-1 py-8">
          <p className="text-xs font-semibold tracking-wide text-[color:var(--color-ink-muted)] uppercase">
            Gains estimés
          </p>
          {earnings && (
            <p
              className="font-[family-name:var(--font-mono)] text-3xl font-bold"
              style={{ color: "var(--color-success)" }}
            >
              <EstimatedValue
                range={earnings}
                format={(v) =>
                  v.toLocaleString("fr-FR", {
                    style: "currency",
                    currency: "EUR",
                    maximumFractionDigits: 0,
                  })
                }
              />
            </p>
          )}
        </div>

        <label className="flex flex-col gap-2 text-sm font-medium">
          <span className="flex justify-between">
            <span>Vues attendues</span>
            <span className="font-[family-name:var(--font-mono)]">
              {views.toLocaleString("fr-FR")}
            </span>
          </span>
          <input
            type="range"
            min={1000}
            max={500000}
            step={1000}
            value={views}
            onChange={(e) => setViews(Number(e.target.value))}
            className="w-full accent-[var(--color-coral)]"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium">
          <span className="flex justify-between">
            <span>Taux de conversion</span>
            <span className="font-[family-name:var(--font-mono)]">
              {conversionPct.toFixed(2)}%
            </span>
          </span>
          {/* L'échelle allait de 0,5 % à 5 %, c'est-à-dire entièrement
              au-dessus de ce qu'on observe en affiliation TikTok Shop
              (~0,1 à 0,3 %) : la valeur réaliste était littéralement
              hors de portée du curseur, et le simulateur ne pouvait donc
              produire qu'un chiffre trop optimiste. */}
          <input
            type="range"
            min={0.05}
            max={2}
            step={0.05}
            value={conversionPct}
            onChange={(e) => setConversionPct(Number(e.target.value))}
            className="w-full accent-[var(--color-coral)]"
          />
        </label>

        <p className="text-xs text-[color:var(--color-ink-muted)]">
          Commission {product.commissionRatePct}% · taux de retour estimé{" "}
          {DEFAULT_EARNINGS_CONFIG.defaultReturnRatePct}% · calcul réel
          (packages/core, pas une formule de démonstration).
        </p>
      </div>
    </div>
  );
}
