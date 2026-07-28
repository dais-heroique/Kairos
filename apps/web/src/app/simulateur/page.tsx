"use client";

import { useMemo, useState } from "react";
import { BottomNav } from "@/components/BottomNav";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/lib/firebase/auth-context";
import { type ProductRankItem, MOCK_PRODUCTS } from "@/lib/mock/products";

const RETURN_RATE = 0.08;

// MOCK_PRODUCTS est un littéral non vide connu à la compilation.
const FIRST_PRODUCT = MOCK_PRODUCTS[0] as ProductRankItem;

function SimulateurContent() {
  const { userDoc } = useAuth();
  const [productId, setProductId] = useState(FIRST_PRODUCT.id);
  const [views, setViews] = useState(userDoc?.profile.avgViews || 20000);
  const [conversionPct, setConversionPct] = useState(1.5);

  const product = useMemo(
    () => MOCK_PRODUCTS.find((p) => p.id === productId) ?? FIRST_PRODUCT,
    [productId],
  );

  const earningsCents = useMemo(() => {
    const conversion = conversionPct / 100;
    const gross = views * conversion * product.priceCents;
    const commission = gross * (product.commissionRatePct / 100);
    return commission * (1 - RETURN_RATE);
  }, [views, conversionPct, product]);

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
            {MOCK_PRODUCTS.map((p) => (
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
          <p className="font-[family-name:var(--font-mono)] text-4xl font-bold" style={{ color: "var(--color-success)" }}>
            {(earningsCents / 100).toLocaleString("fr-FR", {
              style: "currency",
              currency: "EUR",
              maximumFractionDigits: 0,
            })}
          </p>
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
          {(RETURN_RATE * 100).toFixed(0)}% · formule de démonstration (M3) —
          le vrai moteur d&apos;estimation arrive en Phase 2.
        </p>
      </div>

      <BottomNav />
    </div>
  );
}

export default function SimulateurPage() {
  return (
    <RequireAuth>
      <SimulateurContent />
    </RequireAuth>
  );
}
