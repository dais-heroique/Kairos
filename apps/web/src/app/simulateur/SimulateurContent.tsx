"use client";

import { useMemo, useState } from "react";
import { computeEarnings, DEFAULT_EARNINGS_CONFIG } from "@kairos/core";
import { BottomNav } from "@/components/BottomNav";
import { EstimatedValue } from "@/components/EstimatedValue";
import { useAuth } from "@/lib/firebase/auth-context";
import type { ProductRankItem } from "@/types/product-rank-item";

// Benchmark provisoire — voir RankingList.tsx (même limitation, pas de
// calibration par catégorie réelle pour l'instant).
const DEFAULT_MEDIAN_CONVERSION_RATE = 1.5;

export function SimulateurContent({ products }: { products: ProductRankItem[] }) {
  const { userDoc } = useAuth();
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [views, setViews] = useState(userDoc?.profile.avgViews || 20000);
  const [conversionPct, setConversionPct] = useState(DEFAULT_MEDIAN_CONVERSION_RATE);

  const product = useMemo(
    () => products.find((p) => p.id === productId) ?? products[0],
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

  if (!product) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-2 px-5 text-center">
        <p className="text-sm text-[color:var(--color-ink-muted)]">
          Pas encore de produits à simuler — reviens une fois le classement
          alimenté par la collecte réelle.
        </p>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col">
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
              {conversionPct.toFixed(1)}%
            </span>
          </span>
          <input
            type="range"
            min={0.5}
            max={5}
            step={0.1}
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

      <BottomNav />
    </div>
  );
}
